import Openfort from "@openfort/openfort-node";
import { ethers } from "ethers";
import { config } from "../config/index.js";

// Initialize Openfort with server API key (for user operations)
const openfort = new Openfort(config.openfortApiKey);

// In-memory storage for pool wallet private keys (in production, use secure storage like AWS KMS)
const poolWalletKeys = new Map<string, string>();

/**
 * Create a new pool wallet for a vaquita
 * Uses ethers.js to create a local wallet controlled by the bot
 */
export async function createPoolWallet(vaquitaCode: string): Promise<{
  playerId: string;
  walletAddress: string;
}> {
  try {
    console.log(`Creating pool wallet for vaquita ${vaquitaCode}...`);

    // Create a random wallet using ethers.js
    const wallet = ethers.Wallet.createRandom();

    // Store the private key (in production, encrypt and store securely)
    poolWalletKeys.set(vaquitaCode, wallet.privateKey);

    console.log(`✅ Pool wallet created: ${wallet.address} for vaquita ${vaquitaCode}`);

    return {
      playerId: `pool_${vaquitaCode}`, // Local identifier
      walletAddress: wallet.address,
    };
  } catch (error) {
    console.error("Error creating pool wallet:", error);
    throw error;
  }
}

/**
 * Get pool wallet signer for a vaquita
 */
export function getPoolWalletSigner(vaquitaCode: string): ethers.Wallet | null {
  const privateKey = poolWalletKeys.get(vaquitaCode);
  if (!privateKey) return null;

  const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Get USDC balance for a wallet address
 */
export async function getUSDCBalance(walletAddress: string): Promise<string> {
  try {
    // Use ethers to read ERC-20 balance
    const { ethers } = await import("ethers");

    const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);

    // USDC ERC-20 ABI (minimal for balanceOf)
    const erc20Abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ];

    const usdcContract = new ethers.Contract(
      config.usdcContractAddress,
      erc20Abi,
      provider
    );

    const balance = await usdcContract.balanceOf(walletAddress);
    const decimals = await usdcContract.decimals();

    // USDC has 6 decimals
    const formattedBalance = ethers.formatUnits(balance, decimals);

    return formattedBalance;
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    return "0";
  }
}

/**
 * Verify a transaction exists on-chain
 */
export async function verifyTransaction(txHash: string): Promise<{
  verified: boolean;
  from?: string;
  to?: string;
  value?: string;
}> {
  try {
    const { ethers } = await import("ethers");

    const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);

    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return { verified: false };
    }

    // Check if transaction was successful
    if (receipt.status !== 1) {
      return { verified: false };
    }

    // Get transaction details
    const tx = await provider.getTransaction(txHash);

    if (!tx) {
      return { verified: false };
    }

    return {
      verified: true,
      from: tx.from,
      to: tx.to || undefined,
      value: tx.value.toString(),
    };
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return { verified: false };
  }
}

/**
 * Send USDC from pool wallet to user wallet (for withdrawals)
 * Uses local wallet signing with ethers.js
 */
export async function createWithdrawalIntent(
  vaquitaCode: string,
  toAddress: string,
  amountUsdc: number
): Promise<{ transactionIntentId: string; userOperationHash?: string }> {
  try {
    // Get the pool wallet signer
    const signer = getPoolWalletSigner(vaquitaCode);
    if (!signer) {
      throw new Error(`Pool wallet not found for vaquita ${vaquitaCode}`);
    }

    // USDC has 6 decimals
    const amountInSmallestUnit = BigInt(Math.floor(amountUsdc * 1_000_000));

    // USDC contract interface
    const usdcContract = new ethers.Contract(
      config.usdcContractAddress,
      ["function transfer(address to, uint256 amount) returns (bool)"],
      signer
    );

    console.log(`Creating withdrawal: ${amountUsdc} USDC to ${toAddress}`);

    // Send the USDC transfer transaction
    const tx = await usdcContract.transfer(toAddress, amountInSmallestUnit);
    console.log(`✅ Withdrawal transaction sent: ${tx.hash}`);

    // Wait for confirmation
    await tx.wait();
    console.log(`✅ Withdrawal confirmed: ${tx.hash}`);

    return {
      transactionIntentId: tx.hash,
      userOperationHash: tx.hash,
    };
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    throw error;
  }
}

export { openfort };
