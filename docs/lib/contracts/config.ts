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
  registry: (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || "0x776CAbA2d5E63F96358f1624976D6Aaa6b780ed1") as `0x${string}`,
  reserveVault: (process.env.NEXT_PUBLIC_RESERVE_VAULT_ADDRESS || "0xb2fFaf44Ae415b0e1dFc99c8E07dfDE2a5369Aa6") as `0x${string}`,
  spendingLimit: (process.env.NEXT_PUBLIC_SPENDING_LIMIT_ADDRESS || "0x281Feb02bb3AA41d3A75E24a06A1f142eEEA5C85") as `0x${string}`,
  auditorStaking: (process.env.NEXT_PUBLIC_AUDITOR_STAKING_ADDRESS || "0xe786eB0F88b8A30e0ABf4C634fc414084b2134eC") as `0x${string}`,
  feeEscrow: (process.env.NEXT_PUBLIC_FEE_ESCROW_ADDRESS || "0xe619F278352B4eED4465a176Df0B2A2F2CAf3557") as `0x${string}`,
  challengeManager: (process.env.NEXT_PUBLIC_CHALLENGE_MANAGER_ADDRESS || "0x6238a4f9ad158dA64a4478FE64Ba0416b176cFC7") as `0x${string}`,
  usdc: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0xC618490530af70b6Ce22729250Ffe8b5086225cE") as `0x${string}`,
};

// Server-side only — used by dashboard demo actions
export const keys = {
  operator: (process.env.OPERATOR_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`,
  auditor: (process.env.AUDITOR_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`,
  agent: (process.env.AGENT_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`,
  ledger: (process.env.LEDGER_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001") as `0x${string}`,
};
