import { ReactNode } from "react";
import {
  OpenfortProvider,
  AuthProvider,
  RecoveryMethod,
  getDefaultConfig,
} from "@openfort/react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { base } from "wagmi/chains";

// Configuration
const OPENFORT_PUBLISHABLE_KEY = import.meta.env.VITE_OPENFORT_PUBLISHABLE_KEY || "";
const SHIELD_PUBLISHABLE_KEY = import.meta.env.VITE_OPENFORT_SHIELD_PUBLISHABLE_KEY || "";

// Create a minimal wagmi config - only Base chain, no WalletConnect
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

// Create React Query client
const queryClient = new QueryClient();

interface OpenfortProvidersProps {
  children: ReactNode;
}

export function OpenfortProviders({ children }: OpenfortProvidersProps) {
  console.log("OpenfortProviders initializing...");

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OpenfortProvider
          publishableKey={OPENFORT_PUBLISHABLE_KEY}
          walletConfig={{
            shieldPublishableKey: SHIELD_PUBLISHABLE_KEY,
          }}
          uiConfig={{
            authProviders: [
              AuthProvider.EMAIL,
              AuthProvider.GUEST,
            ],
            walletRecovery: {
              defaultMethod: RecoveryMethod.PASSWORD,
            },
            theme: {
              colors: {
                primary: "#22c55e",
              },
            },
          }}
        >
          {children}
        </OpenfortProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default OpenfortProviders;
