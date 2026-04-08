# 12-Stage Certificate Lifecycle

## 1. Build
Operator designs and deploys containment architecture: spending limits, time locks, permission boundaries, kill switches. Each constraint is classified as agent-independent or agent-influenceable.

## 2. Fund
Operator deposits exogenous assets (USDC/ETH/DAI) into ReserveVault + a slashable 5-10% bond into a separate bond contract.

## 3. Audit Request
For C2/C3 certificates, operator engages an independent auditor, defines scope, and deposits the audit fee into FeeEscrow.

## 4. Audit
Auditor examines 5 surfaces: spending limits, permission model, reserve, execution environment, recovery mechanisms. C3 adds composition analysis (mapping all money paths).

## 5. Attest & Stake
Auditor produces a report, signs the attestation, and locks capital into AuditorStaking. Audit fee is released.

## 6. Compose
Full certificate JSON is assembled: identity, validity, constraints, reserve, derived metrics, attestations.

## 7. Publish
JSON → uploaded to IPFS, IPFS hash registered on-chain via CCPRegistry. Operator signs with Ledger.

## 8. Active
Certificate is live. Registry returns `isValid = true`. Counterparties can query it.

## 9-10. Verify
Counterparty flow: find certificate in registry → fetch from IPFS → validate signatures → check status → apply own risk policy → accept/reject.

## 11. Terminate
Three ways: renewal (new certificate published), revocation (operator/auditor calls revoke), or expiry (clock passes `expires_at`).

## 12. Settlement
After grace period: no challenge → bond + stake + reserve returned. Successful challenge → bond + stake slashed, reserve used for claims.

## Typical C2 Timeline
- Day 0-14: Build + fund
- Day 14-21: Audit
- Day 22: Certificate published
- Day 22-82: Active (60 days)
- Day 82-96: Grace period
- Day 96: Settlement
