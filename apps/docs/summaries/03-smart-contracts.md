# The 6 Smart Contracts

CCP's on-chain infrastructure consists of 6 contracts, all deployed on Hedera testnet.

## 1. CCPRegistry — Certificate Ledger

The central contract where certificates are stored, queried, and verified.

- `publish()` — Register a new certificate (requires operator + auditor signatures)
- `revoke()` — Revoke a certificate
- `verify(agent, minClass, maxLoss)` — Counterparty verification query
- States: ACTIVE → REVOKED / EXPIRED / CHALLENGED → SETTLED

## 2. SpendingLimit — Spending Cap + Ledger Co-Signing

Enforces structural limits on agent transactions with a dual-signature mechanism:

- **Below threshold (e.g. <$5k):** Agent signs alone
- **Above threshold:** Ledger hardware device must co-sign
- **Parameter changes:** Only Ledger can modify (agent-independent!)

Constraints: single-action limit, periodic limit (e.g. daily), co-sign threshold.

## 3. ReserveVault — Exogenous Reserve Lockbox

Holds external assets (USDC, ETH, DAI) locked for the certificate's duration.

- `deposit()` / `lock()` / `release()` — Deposit, lock, and withdraw
- `isAdequate()` — Check if reserve covers the containment bound
- **Rule:** Tokens the operator can mint (governance tokens, etc.) are invalid!

## 4. AuditorStaking — Auditor Skin-in-the-Game

Auditors lock capital per attestation. Slashed if the attestation is proven false.

- C1: 0 stake | C2: 3% of bound (max $100k) | C3: 5% of bound (max $250k)
- Slash distribution: 30% to challenger, 50% to infrastructure, 20% burned
- The 20% burn prevents operator-challenger collusion

## 5. FeeEscrow — Audit Fee Escrow

Holds audit fees until the certificate expires cleanly.

- No issues → fee released to auditor
- Challenge succeeds → fee clawed back to operator

## 6. ChallengeManager — Dispute Resolution

Anyone can challenge a certificate with a minimum 200 USDC bond.

- Challenge types: reserve shortfall, constraint bypass, false independence, audit negligence, composition gap
- On-chain verifiable claims auto-resolve
- Complex disputes resolved by expert panel
- Challenge upheld → bond returned + auditor slashed + certificate revoked
- Challenge rejected → bond burned + certificate restored to ACTIVE
