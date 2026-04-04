import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const hederaTestnet = defineChain({
  id: parseInt(process.env.HEDERA_CHAIN_ID || "296"),
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api"],
    },
  },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
  testnet: true,
});

export const publicClient = createPublicClient({
  chain: hederaTestnet,
  transport: http(process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api"),
});

export function getWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: hederaTestnet,
    transport: http(process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api"),
  });
}

export const operatorClient = () =>
  getWalletClient((process.env.OPERATOR_PRIVATE_KEY || "0x") as `0x${string}`);
export const auditorClient = () =>
  getWalletClient((process.env.AUDITOR_PRIVATE_KEY || "0x") as `0x${string}`);
export const agentClient = () =>
  getWalletClient((process.env.AGENT_PRIVATE_KEY || "0x") as `0x${string}`);
export const ledgerClient = () =>
  getWalletClient((process.env.LEDGER_PRIVATE_KEY || "0x") as `0x${string}`);
