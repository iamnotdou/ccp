import "dotenv/config";
import { type ContractAddresses } from "./contracts/index.js";

export const hederaConfig = {
  accountId: process.env.HEDERA_ACCOUNT_ID || "",
  privateKey: process.env.HEDERA_PRIVATE_KEY || "",
  network: (process.env.HEDERA_NETWORK || "testnet") as "testnet" | "mainnet",
  rpcUrl: process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api",
  chainId: parseInt(process.env.HEDERA_CHAIN_ID || "296"),
  hcsTopicId: process.env.HCS_TOPIC_ID || "",
  // ED25519 account for native Hedera operations (HCS)
  hcsAccountId: process.env.HEDERA_HCS_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID || "",
  hcsPrivateKeyDer: process.env.HEDERA_HCS_PRIVATE_KEY_DER || "",
};

export const addresses: ContractAddresses = {
  registry: (process.env.REGISTRY_ADDRESS || "0x") as `0x${string}`,
  reserveVault: (process.env.RESERVE_VAULT_ADDRESS || "0x") as `0x${string}`,
  spendingLimit: (process.env.SPENDING_LIMIT_ADDRESS || "0x") as `0x${string}`,
  auditorStaking: (process.env.AUDITOR_STAKING_ADDRESS || "0x") as `0x${string}`,
  feeEscrow: (process.env.FEE_ESCROW_ADDRESS || "0x") as `0x${string}`,
  challengeManager: (process.env.CHALLENGE_MANAGER_ADDRESS || "0x") as `0x${string}`,
  usdc: (process.env.USDC_ADDRESS || "0x") as `0x${string}`,
};

export const keys = {
  operator: (process.env.OPERATOR_PRIVATE_KEY || "0x") as `0x${string}`,
  auditor: (process.env.AUDITOR_PRIVATE_KEY || "0x") as `0x${string}`,
  agent: (process.env.AGENT_PRIVATE_KEY || "0x") as `0x${string}`,
  ledger: (process.env.LEDGER_PRIVATE_KEY || "0x") as `0x${string}`,
};

export const ensConfig = {
  rpcUrl: process.env.ENS_RPC_URL || "https://rpc.sepolia.org",
};
