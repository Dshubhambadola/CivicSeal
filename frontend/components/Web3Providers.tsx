'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
    getDefaultConfig,
    RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    hardhat
} from 'wagmi/chains';
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";

// Localhost Chain Config for Hardhat
const localChain = {
    ...hardhat,
    id: 31337,
    name: 'CivicSeal Local',
    rpcUrls: {
        default: { http: ['http://localhost:8545'] },
    },
} as const;

const config = getDefaultConfig({
    appName: 'CivicSeal',
    projectId: 'YOUR_PROJECT_ID', // Get one at cloud.walletconnect.com for free
    chains: [localChain, mainnet, polygon, optimism, arbitrum, base],
    ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export function Web3Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
