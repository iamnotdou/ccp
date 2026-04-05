# Governance: Convention-Based Evolution Without a DAO

CCP has no governance token, no DAO, no central authority. Core contracts are immutable after deployment.

## Immutable (On-Chain)
- Registry contract logic
- Certificate schema
- Signature verification rules
- Status transition rules

## Mutable (Conventions, Off-Chain)
- Certificate class thresholds
- Bond percentages and stake ratios
- Verifier policy templates
- Audit scope requirements
- Challenge bond amounts

## CCP Improvement Proposals (CIPs)

1. **Observe** — Identify a parameter needing adjustment
2. **Propose** — Write a formal CIP (abstract, motivation, specification, impact analysis)
3. **Discuss** — Minimum 14-day public comment period
4. **Implement** — Update SDK defaults and documentation
5. **Adopt** — Market decides; verifiers can adopt new or stay on old version

## Anti-Capture Defenses
- Open-source SDK (anyone can build alternatives)
- Multiple implementations (no single authoritative codebase)
- Zero protocol fees (no economic moat)
- Permissionless registry (anyone can publish certificates)
- Verifier sovereignty (each sets own policy)
- Auditor diversity limits (concentration caps prevent monopoly)
