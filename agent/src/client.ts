import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hederaConfig, keys } from "./config.js";

// Define Hedera Testnet chain for viem
export const hederaTestnet = defineChain({
  id: hederaConfig.chainId,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: {
    default: { http: [hederaConfig.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
  testnet: true,
});

// Public client for read-only queries
export const publicClient = createPublicClient({
  chain: hederaTestnet,
  transport: http(hederaConfig.rpcUrl),
});

// Wallet clients for each actor
export function getWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: hederaTestnet,
    transport: http(hederaConfig.rpcUrl),
  });
}

export const operatorClient = () => getWalletClient(keys.operator);
export const auditorClient = () => getWalletClient(keys.auditor);
export const agentClient = () => getWalletClient(keys.agent);
export const ledgerClient = () => getWalletClient(keys.ledger);
