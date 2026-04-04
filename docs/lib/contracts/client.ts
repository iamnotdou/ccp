import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const RPC_URL = process.env.NEXT_PUBLIC_HEDERA_RPC_URL || "https://testnet.hashio.io/api";
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_HEDERA_CHAIN_ID || "296");

export const hederaTestnet = defineChain({
  id: CHAIN_ID,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: hederaTestnet,
  transport: http(RPC_URL),
});

export function getWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: hederaTestnet,
    transport: http(RPC_URL),
  });
}

// Server-side only — these read from non-NEXT_PUBLIC env vars (not exposed to browser)
export const operatorClient = () =>
  getWalletClient((process.env.OPERATOR_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`);
export const auditorClient = () =>
  getWalletClient((process.env.AUDITOR_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`);
export const agentClient = () =>
  getWalletClient((process.env.AGENT_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`);
