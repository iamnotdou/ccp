import "dotenv/config";
import { type ContractAddresses } from "./contracts/index.js";

export const hederaConfig = {
  accountId: process.env.HEDERA_ACCOUNT_ID || "",
  privateKey: process.env.HEDERA_PRIVATE_KEY || "",
  network: (process.env.HEDERA_NETWORK || "testnet") as "testnet" | "mainnet",
  rpcUrl: process.env.HEDERA_RPC_URL || "https://testnet.hashio.io/api",
  chainId: parseInt(process.env.HEDERA_CHAIN_ID || "296"),
  hcsTopicId: process.env.HCS_TOPIC_ID || "0.0.8510266",
  // ED25519 account for native Hedera operations (HCS)
  hcsAccountId: process.env.HEDERA_HCS_ACCOUNT_ID || process.env.HEDERA_ACCOUNT_ID || "",
  hcsPrivateKeyDer: process.env.HEDERA_HCS_PRIVATE_KEY_DER || "",
};

// Hedera Testnet defaults — override via env for other deployments
export const addresses: ContractAddresses = {
  registry: (process.env.REGISTRY_ADDRESS || "0x776CAbA2d5E63F96358f1624976D6Aaa6b780ed1") as `0x${string}`,
  reserveVault: (process.env.RESERVE_VAULT_ADDRESS || "0xb2fFaf44Ae415b0e1dFc99c8E07dfDE2a5369Aa6") as `0x${string}`,
  spendingLimit: (process.env.SPENDING_LIMIT_ADDRESS || "0x281Feb02bb3AA41d3A75E24a06A1f142eEEA5C85") as `0x${string}`,
  auditorStaking: (process.env.AUDITOR_STAKING_ADDRESS || "0xe786eB0F88b8A30e0ABf4C634fc414084b2134eC") as `0x${string}`,
  feeEscrow: (process.env.FEE_ESCROW_ADDRESS || "0xe619F278352B4eED4465a176Df0B2A2F2CAf3557") as `0x${string}`,
  challengeManager: (process.env.CHALLENGE_MANAGER_ADDRESS || "0x6238a4f9ad158dA64a4478FE64Ba0416b176cFC7") as `0x${string}`,
  usdc: (process.env.USDC_ADDRESS || "0xC618490530af70b6Ce22729250Ffe8b5086225cE") as `0x${string}`,
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
