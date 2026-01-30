import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Openfort, RecoveryMethod, ChainTypeEnum } from "@openfort/openfort-js";

// Openfort configuration
const OPENFORT_PUBLISHABLE_KEY = import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY || "";
const SHIELD_PUBLISHABLE_KEY = import.meta.env.VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY || "";
const USDC_CONTRACT_ADDRESS = import.meta.env.VITE_USDC_CONTRACT_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// ERC-20 ABI for USDC transfers
const ERC20_ABI = {
  transfer: "function transfer(address to, uint256 amount) returns (bool)",
  balanceOf: "function balanceOf(address owner) view returns (uint256)",
  decimals: "function decimals() view returns (uint8)",
};

// Helper to encode ERC-20 transfer
function encodeTransferData(to: string, amountUsdc: number): string {
  // USDC has 6 decimals
  const amount = BigInt(Math.floor(amountUsdc * 1_000_000));

  // Function selector for transfer(address,uint256) = 0xa9059cbb
  const functionSelector = "a9059cbb";

  // Pad address to 32 bytes (remove 0x prefix, pad to 64 chars)
  const paddedAddress = to.slice(2).toLowerCase().padStart(64, "0");

  // Pad amount to 32 bytes
  const paddedAmount = amount.toString(16).padStart(64, "0");

  return `0x${functionSelector}${paddedAddress}${paddedAmount}`;
}

interface OpenfortContextType {
  openfort: Openfort | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | null;
  error: string | null;
  login: (telegramId?: number) => Promise<void>;
  logout: () => Promise<void>;
  getBalance: () => Promise<string>;
  sendTransaction: (to: string, amount: string) => Promise<string>;
}

const OpenfortContext = createContext<OpenfortContextType | null>(null);

export function OpenfortProvider({ children }: { children: ReactNode }) {
  const [openfort, setOpenfort] = useState<Openfort | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initOpenfort = async () => {
      try {
        console.log("=== OPENFORT INIT START (v1.1.4) ===");
        console.log("Publishable Key:", OPENFORT_PUBLISHABLE_KEY ? OPENFORT_PUBLISHABLE_KEY.slice(0, 20) + "..." : "MISSING!");
        console.log("Shield Key:", SHIELD_PUBLISHABLE_KEY ? SHIELD_PUBLISHABLE_KEY.slice(0, 10) + "..." : "MISSING!");

        if (!OPENFORT_PUBLISHABLE_KEY) {
          throw new Error("VITE_OPENFORT_PUBLISHABLE_KEY is missing from .env");
        }

        console.log("Creating Openfort instance...");
        const of = new Openfort({
          baseConfiguration: {
            publishableKey: OPENFORT_PUBLISHABLE_KEY,
          },
          shieldConfiguration: {
            shieldPublishableKey: SHIELD_PUBLISHABLE_KEY,
          },
        });
        console.log("Openfort instance created successfully");
        console.log("Available methods:", Object.keys(of));

        setOpenfort(of);

        // Check if user is already authenticated
        try {
          const user = await of.user.get();
          console.log("Existing user:", user);
          if (user) {
            setIsAuthenticated(true);

            // Try to get wallet address from embeddedWallet
            try {
              const provider = await of.embeddedWallet.getEthereumProvider();
              if (provider) {
                const accounts = await provider.request({ method: "eth_accounts" }) as string[];
                if (accounts && accounts.length > 0) {
                  setWalletAddress(accounts[0]);
                  console.log("Restored wallet address:", accounts[0]);
                }
              }
            } catch (providerError) {
              console.log("Could not get provider:", providerError);
            }
          }
        } catch (e) {
          console.log("No existing user session");
        }
      } catch (error: any) {
        console.error("=== OPENFORT INIT ERROR ===");
        console.error("Error:", error);
        console.error("Message:", error?.message);
        setError("Error al inicializar: " + (error?.message || "Unknown"));
      } finally {
        console.log("=== OPENFORT INIT COMPLETE ===");
        setIsLoading(false);
      }
    };

    initOpenfort();
  }, []);

  const login = async (telegramId?: number) => {
    if (!openfort) {
      setError("Openfort no inicializado");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if already authenticated
      let alreadyLoggedIn = false;
      try {
        const existingUser = await openfort.user.get();
        if (existingUser) {
          console.log("User already logged in:", existingUser.email);
          alreadyLoggedIn = true;
        }
      } catch {
        // Not logged in, continue with auth
      }

      if (!alreadyLoggedIn) {
        // Generate unique ID for user
        let uniqueId = telegramId;
        if (!uniqueId) {
          const storedId = localStorage.getItem("vaquita_user_id");
          if (storedId) {
            uniqueId = parseInt(storedId);
          } else {
            uniqueId = Date.now();
            localStorage.setItem("vaquita_user_id", uniqueId.toString());
          }
        }

        const email = `vaquita.user.${uniqueId}@gmail.com`;
        const password = `VaquitaSecure_${uniqueId}_Pass123!`;

        console.log("=== LOGIN START ===");
        console.log("Email:", email);

        // Step 1: Authenticate with email/password (using auth API)
        try {
          console.log("Trying signup via auth API...");
          await openfort.auth.signUpWithEmailPassword({ email, password });
          console.log("Signup successful");
        } catch (signupError: any) {
          console.log("Signup failed:", signupError?.message);
          try {
            console.log("Trying login via auth API...");
            await openfort.auth.logInWithEmailPassword({ email, password });
            console.log("Login successful");
          } catch (loginError: any) {
            console.error("Login also failed:", loginError);
            throw new Error("Error de autenticación: " + (loginError?.message || "Unknown"));
          }
        }
      }

      console.log("Proceeding to wallet configuration...");

      // Wait for SDK initialization
      console.log("Waiting for SDK initialization...");
      await openfort.waitForInitialization();
      console.log("SDK initialized");

      // Generate recovery password based on stored ID
      const storedId = localStorage.getItem("vaquita_user_id") || Date.now().toString();
      const recoveryPassword = `VaquitaRecovery_${storedId}_Secure!`;

      // Step 2: Configure embedded wallet with password recovery
      console.log("Configuring embedded wallet...");
      try {
        const account = await openfort.embeddedWallet.configure({
          chainId: 84532, // Base Sepolia testnet (use 8453 for mainnet with live keys)
          chainType: ChainTypeEnum.EVM,
          recoveryParams: {
            recoveryMethod: RecoveryMethod.PASSWORD,
            password: recoveryPassword,
          },
        });
        console.log("Wallet configured:", account);
      } catch (walletError: any) {
        console.error("Wallet config error:", walletError);
        // Don't throw - might be already configured, try to continue
      }

      // Step 3: Get wallet address
      console.log("Getting Ethereum provider...");
      const provider = await openfort.embeddedWallet.getEthereumProvider();
      console.log("Provider obtained:", !!provider);

      if (provider) {
        const accounts = await provider.request({ method: "eth_accounts" }) as string[];
        console.log("Accounts:", accounts);

        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsAuthenticated(true);
          console.log("=== WALLET CONNECTED ===", accounts[0]);
        } else {
          // Try requesting accounts
          const requestedAccounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
          if (requestedAccounts && requestedAccounts.length > 0) {
            setWalletAddress(requestedAccounts[0]);
            setIsAuthenticated(true);
            console.log("=== WALLET CONNECTED (requested) ===", requestedAccounts[0]);
          } else {
            throw new Error("No se pudo obtener la dirección de la wallet");
          }
        }
      } else {
        throw new Error("No se pudo obtener el provider de Ethereum");
      }
    } catch (error: any) {
      console.error("=== LOGIN ERROR ===", error);
      setError(error?.message || "Error al conectar");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!openfort) return;

    try {
      await openfort.auth.logout();
      setIsAuthenticated(false);
      setWalletAddress(null);
      localStorage.removeItem("vaquita_user_id");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getBalance = async (): Promise<string> => {
    if (!openfort || !walletAddress) return "0";

    try {
      // Fetch USDC balance from API (more reliable)
      const response = await fetch(`/api/balance/${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        return parseFloat(data.balance).toFixed(4);
      }

      // Fallback: read directly from contract
      const provider = await openfort.embeddedWallet.getEthereumProvider();
      if (provider) {
        // Encode balanceOf call
        const functionSelector = "70a08231"; // balanceOf(address)
        const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, "0");
        const data = `0x${functionSelector}${paddedAddress}`;

        const result = await provider.request({
          method: "eth_call",
          params: [{
            to: USDC_CONTRACT_ADDRESS,
            data: data,
          }, "latest"],
        }) as string;

        // USDC has 6 decimals
        const balance = parseInt(result, 16) / 1_000_000;
        return balance.toFixed(4);
      }
      return "0.0000";
    } catch (error) {
      console.error("Get balance error:", error);
      return "0";
    }
  };

  const sendTransaction = async (to: string, amount: string): Promise<string> => {
    if (!openfort || !walletAddress) throw new Error("Wallet not connected");

    try {
      const provider = await openfort.embeddedWallet.getEthereumProvider();
      if (!provider) throw new Error("Provider not available");

      console.log("Sending USDC transaction:", { to, amount, contract: USDC_CONTRACT_ADDRESS });

      // Encode ERC-20 transfer data
      const transferData = encodeTransferData(to, parseFloat(amount));

      // Send transaction to USDC contract (not native transfer)
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: USDC_CONTRACT_ADDRESS, // Send to USDC contract
          data: transferData, // ERC-20 transfer encoded data
          value: "0x0", // No native value
        }],
      });

      console.log("USDC transaction sent:", txHash);
      return txHash as string;
    } catch (error) {
      console.error("Transaction error:", error);
      throw error;
    }
  };

  return (
    <OpenfortContext.Provider
      value={{
        openfort,
        isAuthenticated,
        isLoading,
        walletAddress,
        error,
        login,
        logout,
        getBalance,
        sendTransaction,
      }}
    >
      {children}
    </OpenfortContext.Provider>
  );
}

export function useOpenfort() {
  const context = useContext(OpenfortContext);
  if (!context) {
    throw new Error("useOpenfort must be used within OpenfortProvider");
  }
  return context;
}
