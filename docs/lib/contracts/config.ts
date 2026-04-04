export interface ContractAddresses {
  registry: `0x${string}`;
  reserveVault: `0x${string}`;
  spendingLimit: `0x${string}`;
  auditorStaking: `0x${string}`;
  feeEscrow: `0x${string}`;
  challengeManager: `0x${string}`;
  usdc: `0x${string}`;
}

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
