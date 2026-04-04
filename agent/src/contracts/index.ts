export {
  CCPRegistryABI,
  ReserveVaultABI,
  SpendingLimitABI,
  AuditorStakingABI,
  FeeEscrowABI,
  ChallengeManagerABI,
} from "./abis.js";

export interface ContractAddresses {
  registry: `0x${string}`;
  reserveVault: `0x${string}`;
  spendingLimit: `0x${string}`;
  auditorStaking: `0x${string}`;
  feeEscrow: `0x${string}`;
  challengeManager: `0x${string}`;
  usdc: `0x${string}`;
}
