# Governance and Parameter Evolution

**Status:** Working Note
**Date:** April 2026
**Companion to:** PRD v0.2, Nash Equilibrium Note

---

## 1. The Governance Dilemma

CCP's PRD says: "No governance token, no protocol fee, no rent extraction" (NF7) and "Registry contract is immutable after deployment" (NF1).

But the Nash Equilibrium document shows that protocol parameters **must evolve** — bond percentages, stake ratios, challenge bonds, expiry limits, class thresholds all need to change as the ecosystem grows from 5 to 5,000 certificates.

This creates a tension: **how do you change parameters in a protocol that has no governance?**

---

## 2. What Needs to Change vs. What Doesn't

### 2.1 Immutable (Never Changes)

These are baked into the registry smart contract and cannot be modified after deployment:

| Element | Why immutable |
|---|---|
| Registry contract logic | Core trust guarantee — no admin keys, no upgrade proxy |
| Certificate data structure | Changing the schema would break all existing verifiers |
| Signature verification logic | Cryptographic foundation cannot be weakened |
| Status transition rules | ACTIVE → REVOKED/EXPIRED/CHALLENGED — state machine is fixed |
| Event emission format | Indexers and monitors depend on stable events |

### 2.2 Mutable by Design (Must Change)

These are **conventions**, not on-chain enforcement. They live in the SDK, documentation, and verifier policy templates:

| Parameter | Where it lives | Why it changes |
|---|---|---|
| Certificate class thresholds (C1/C2/C3 minimums) | SDK + documentation | Risk landscape evolves; thresholds that are appropriate for 50 certificates may be too loose or tight at 5,000 |
| Recommended bond percentages | Documentation + operator tooling | Optimal bond size depends on ecosystem detection probability, which changes with challenger market maturity |
| Recommended stake ratios | Documentation + auditor tooling | Same — stake must be calibrated to expected challenge rates |
| Verifier policy templates | SDK defaults | As market data accumulates, templates should reflect empirically-validated thresholds |
| Audit scope requirements per class | Documentation + auditor guidelines | New attack vectors and tools change what a thorough audit requires |
| Challenge bond amounts | Documentation + challenger tooling | Must balance accessibility vs. anti-griefing as ecosystem scales |
| Expiry limits per class | Documentation + SDK | May shorten as monitoring matures, or lengthen if renewal overhead is too high |

### 2.3 The Key Insight

**The registry contract enforces almost nothing about parameter values.** It stores certificates and checks signatures. Certificate class, bond amounts, stake ratios, and policy templates are all **off-chain conventions** enforced by market participants.

This is deliberate. It means parameters can evolve without on-chain governance — because they were never on-chain to begin with.

---

## 3. Governance Model: Convention-Based Evolution

CCP uses **rough consensus and running code** — the same model that governs internet standards (IETF RFCs, EIPs).

### 3.1 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARAMETER CHANGE PROCESS                      │
│                                                                  │
│  1. OBSERVE                                                      │
│     Someone notices a parameter needs adjustment                 │
│     (market data, incident, ecosystem growth)                    │
│                                                                  │
│  2. PROPOSE                                                      │
│     CCP Improvement Proposal (CIP) published                    │
│     - Problem statement                                          │
│     - Proposed parameter change                                  │
│     - Data/evidence supporting the change                        │
│     - Impact analysis                                            │
│                                                                  │
│  3. DISCUSS                                                      │
│     Public comment period (minimum 14 days)                      │
│     Stakeholders: operators, auditors, verifiers,                │
│     integrators, insurance providers, researchers                │
│                                                                  │
│  4. IMPLEMENT                                                    │
│     SDK updated with new defaults                                │
│     Documentation updated                                        │
│     Policy templates updated                                     │
│                                                                  │
│  5. ADOPT (or not)                                               │
│     Each verifier/integrator decides whether to                  │
│     adopt the new convention. No one is forced.                  │
│     Market pressure drives convergence.                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Why This Works

**No one controls the parameters, but parameters still converge.** Here's why:

1. **Verifier templates are defaults, not mandates.** When the SDK ships a new policy template with updated thresholds, verifiers who use the default automatically get the update. Verifiers who customize can ignore it.

2. **Market pressure drives adoption.** If the updated threshold is empirically better (lower loss rates for verifiers), adoption happens naturally. If it's worse, it gets reverted.

3. **Integrators are the coordination point.** When a major integrator (DeFi protocol, marketplace) updates their CCP requirements, operators and auditors must comply to maintain access. The integrator's update cascades through the ecosystem.

4. **No capture risk.** There's no governance token holder who profits from parameter changes. No one can buy votes to weaken thresholds. Changes succeed or fail on merit.

### 3.3 What About Bond and Stake Contracts?

The bond and staking contracts need parameter configuration. Two approaches:

**Option A: Parameters baked into each certificate cycle**

Each certificate deployment specifies its own bond/stake amounts. The contract enforces whatever was committed at publish time. Convention (documentation, SDK) recommends current values, but each certificate is self-contained.

```solidity
// Bond contract doesn't enforce minimum — it just holds what's deposited
function deposit(uint256 amount, bytes32 certificateHash) external {
    // No minimum check — verifiers decide if bond is adequate
    bonds[msg.sender][certificateHash] = amount;
}
```

Verifiers then check: "Is the operator's bond ≥ my minimum?" as part of their policy evaluation.

**This is the recommended approach.** It keeps bond/stake contracts governance-free while allowing conventions to evolve.

**Option B: Contract-enforced minimums with admin key**

The contract has a minimum bond parameter that can be updated by an admin multisig.

```solidity
// Admin can update minimum — creates governance surface
function setMinimumBond(uint256 newMinimum) external onlyAdmin {
    minimumBond = newMinimum;
}
```

**This is NOT recommended.** It introduces an admin key, which contradicts NF1 (immutable, no admin keys) and creates a governance surface that can be captured.

---

## 4. CCP Improvement Proposals (CIPs)

### 4.1 CIP Format

```markdown
---
CIP: [number]
Title: [short title]
Author: [name/handle]
Status: [Draft | Review | Accepted | Implemented | Rejected | Withdrawn]
Created: [date]
---

## Abstract
[One paragraph summary]

## Motivation
[Why this change is needed — data, incidents, ecosystem growth]

## Specification
[Exact parameter changes, before and after]

## Rationale
[Why this specific change, not alternatives]

## Impact Analysis
[Who is affected, how, and what's the migration path]

## Evidence
[Data supporting the change — loss rates, adoption metrics,
 challenge statistics, insurance data]
```

### 4.2 CIP Examples

**CIP-001: Increase recommended operator bond from 5% to 10% of containment bound**
- Motivation: Early ecosystem data shows operators with 5% bonds have 3x higher revocation-for-cause rate than 10%+ bonds
- Evidence: 6 months of pilot data from 30 certificates
- Impact: Operators must lock more capital; reduces fly-by-night operators

**CIP-002: Add C2.5 certificate class between C2 and C3**
- Motivation: Large gap between C2 ($40k audit) and C3 ($150k+ audit) leaves many operators uncovered
- Specification: C2.5 requires formal verification of spending constraints (but not full stack), 4x reserve ratio
- Impact: More operators can achieve meaningful certification

**CIP-003: Reduce C2 expiry from 60 to 45 days**
- Motivation: 3 incidents in Q3 involved architecture changes within 60-day windows that weren't caught
- Evidence: Incident reports, time-to-detection analysis
- Impact: Higher renewal frequency = higher cost for operators; lower risk for verifiers

### 4.3 Who Can Submit CIPs?

Anyone. There is no gatekeeping on proposals. The CIP process is public and open.

In practice, CIPs will come from:
- Auditors (who see patterns across many certificates)
- Insurance providers (who have loss data)
- Integrators (who see adoption friction or quality issues)
- The CCP foundation/maintainers (who coordinate ecosystem)
- Security researchers (who discover new attack vectors)

### 4.4 How CIPs Get Adopted

There is no voting. A CIP is "accepted" when:

1. **Rough consensus** — No strong objections from major stakeholders after the review period
2. **Running code** — The change is implemented in the SDK and/or documentation
3. **Market adoption** — Verifiers and integrators actually use the new defaults

A CIP can be "accepted" in the SDK but still not adopted by the market. That's fine — the market decides.

---

## 5. Versioned Conventions (Not Versioned Contracts)

### 5.1 Convention Versions

Parameter sets are versioned so that certificates and policies can reference specific conventions:

```
CCP Conventions v1.0 (Genesis)
  - Class C1: reserve 1x, 1 AI layer, self-attest OK, expiry ≤ 90d
  - Class C2: reserve 3x, 2 AI layers, independent audit, expiry ≤ 60d
  - Class C3: reserve 5x, 3 AI layers, full-stack audit, formal verif, expiry ≤ 30d
  - Recommended bond: 10% of containment bound
  - Recommended auditor stake: 3% CB (C2), 5% CB (C3)

CCP Conventions v1.1 (after CIP-003)
  - [same as v1.0 except:]
  - Class C2: expiry ≤ 45d (changed from 60d)

CCP Conventions v2.0 (after CIP-002, CIP-005, CIP-007)
  - [adds C2.5 class]
  - [updated bond recommendations]
  - [new audit scope: COMPOSITION_ANALYSIS]
```

### 5.2 How Versioning Works in Practice

The SDK has a `convention_version` setting:

```typescript
const verifier = new CCPVerifier({
  convention_version: "1.1",  // or "latest"
  policy_template: "defi_protocol",
  custom_overrides: {
    min_reserve_ratio: 40000,  // 4x, stricter than C2 default
  }
});
```

Certificates don't declare which convention they follow — they just have data. The verifier's convention version determines how that data is evaluated.

This means: **an old certificate doesn't become "invalid" when conventions update.** It just may not meet the new requirements of verifiers who adopted the update. The operator can renew with higher standards at the next cycle.

---

## 6. Contract Evolution (When Immutability Isn't Enough)

### 6.1 What If the Registry Contract Itself Needs to Change?

The registry is immutable. But software evolves. What happens when:
- A bug is discovered in the registry?
- The certificate schema needs a new field?
- A better verification algorithm is invented?

### 6.2 Versioned Registries

Deploy a new registry (v2) alongside the old one (v1). Both coexist.

```
CCPRegistry_v1  (0xABC...)  — deployed 2026, immutable
CCPRegistry_v2  (0xDEF...)  — deployed 2027, immutable

Both are valid. Verifiers check both (or whichever their policy specifies).
Operators migrate to v2 at their next renewal cycle.
v1 naturally phases out as certificates expire and aren't renewed.
```

**Migration tooling:**
- SDK supports querying multiple registries simultaneously
- `getActiveCertificate(agent)` checks v2 first, then v1
- Operators can publish on v2 while their v1 certificate is still active (no gap)

### 6.3 Schema Evolution

Certificate schema changes via new versions:

```
version: "ccp-v0.2"  → current
version: "ccp-v0.3"  → adds new constraint types, new fields
version: "ccp-v1.0"  → first stable release, backwards-incompatible
```

Rules:
- Minor versions (v0.2 → v0.3): additive only (new optional fields). Old verifiers can still parse.
- Major versions (v0.x → v1.0): may break backwards compatibility. Requires new registry deployment.

### 6.4 Emergency Response

If a critical bug is found in the registry contract:

1. **Assess severity** — Can it be exploited? Does it affect certificate validity? Can funds be drained?
2. **If exploitable:** Deploy new registry immediately. Coordinate emergency migration. Old registry certificates are still valid but should be renewed on new registry ASAP.
3. **If not exploitable but problematic:** Deploy new registry on normal timeline. Migration at next renewal cycle.
4. **If funds at risk (bond/stake contracts):** Emergency pause if pause mechanism exists; otherwise, coordinate withdrawal guidance. This is why bond/stake contracts (unlike the registry) may include an emergency pause with a multisig — a limited exception to the "no admin keys" principle.

---

## 7. Parameter Adaptation Framework

### 7.1 Which Parameters Adapt and How

| Parameter | Adaptation trigger | Adaptation method | Feedback loop |
|---|---|---|---|
| **Class thresholds** | Market data shows classes don't correlate with actual risk | CIP process → SDK update | Insurance loss data by class |
| **Bond percentage** | Revocation-for-cause rate too high or entry barrier too high | CIP process → documentation update | Operator entry/exit rates + revocation data |
| **Stake ratio** | Challenge success rate too high (stakes too low) or auditor supply too low (stakes too high) | CIP process → documentation update | Challenge success rates + auditor count |
| **Challenge bond** | Griefing rate too high or monitoring too low | CIP process → documentation update | Frivolous challenge rate + legitimate challenge rate |
| **Expiry limits** | Incidents between renewals or renewal cost too high | CIP process → SDK update | Time-to-detection for incidents + renewal compliance rate |
| **Policy template defaults** | New market data on effective thresholds | CIP process → SDK update | Verifier loss data by policy configuration |

### 7.2 Data-Driven Adaptation

The CIP process should be driven by data, not opinion. Key data sources:

| Data source | What it tells us | Who provides it |
|---|---|---|
| **Challenge outcomes** | Whether parameters catch real fraud | Registry (on-chain) |
| **Insurance loss ratios** | Whether certificate classes predict actual risk | Insurance providers |
| **Operator entry/exit rates** | Whether costs are too high or too low | Registry (on-chain) |
| **Auditor supply and demand** | Whether staking requirements are calibrated correctly | Market observation |
| **Revocation-for-cause rate** | Whether bonds are working as deterrent | Registry (on-chain) |
| **Incident post-mortems** | What failed and why | Community reports |
| **Certificate class distribution** | Whether classes are separating effectively | Registry (on-chain) |
| **Concentration metrics** | Whether dependency risks are emerging | Registry (on-chain) |

### 7.3 Adaptation Pace

```
Genesis era (0–50 certs):
  Parameters change quickly (monthly reviews)
  Small community, rapid iteration
  CIP process is lightweight (discussion thread + PR)

Growth era (50–500 certs):
  Parameters change quarterly
  Formal CIP process with evidence requirements
  Changes announced 30 days before SDK update

Mature era (500+ certs):
  Parameters change semi-annually at most
  Strong evidence bar for changes (actuarial data, statistical significance)
  60-day notice before major changes
  Backwards-compatible changes preferred
```

---

## 8. Anti-Capture Mechanisms

### 8.1 Capture Risks

Even without a governance token, the protocol can be captured:

| Capture vector | Who benefits | How it works |
|---|---|---|
| **CIP process capture** | Dominant auditor | Largest auditor pushes CIPs that raise barriers for competitors |
| **SDK maintainer capture** | SDK maintainers | Maintainers bake in defaults that favor their partners |
| **Integrator capture** | Dominant platform | Largest integrator sets de facto standards through their policy requirements |
| **Regulatory capture** | Compliance industry | Regulations mandate CCP but require specific auditors or standards that benefit incumbents |

### 8.2 Defenses

| Defense | How it works |
|---|---|
| **Open source SDK** | Anyone can fork and modify the SDK. If the official SDK becomes captured, a community fork can replace it. |
| **Multiple implementations** | Encourage alternative SDK implementations (TypeScript, Python, Rust). No single maintainer controls all implementations. |
| **CIP transparency** | All proposals, discussions, and decisions are public. Capture attempts are visible. |
| **No economic moat** | Protocol charges no fees and has no token. There's nothing to capture economically — only influence over conventions. |
| **Permissionless registry** | Anyone can publish, anyone can verify. No gatekeeper can exclude participants. |
| **Verifier sovereignty** | Every verifier can override SDK defaults with custom policy. No one is forced to accept any specific convention. |
| **Auditor diversity** | Concentration limits in policy templates prevent single-auditor dominance. |

---

## 9. Relationship to PRD

### 9.1 PRD Changes Needed

| PRD section | Change | Rationale |
|---|---|---|
| NF1 (immutable registry) | Clarify: registry is immutable, but versioned registries replace it. Add migration strategy. | Need a path for contract evolution without admin keys |
| NF7 (no governance token) | Affirm and extend: governance is convention-based (CIP process), not token-based | Explicit governance model needed |
| §4.5 (certificate classes) | Clarify: class thresholds are conventions, versioned, and evolved via CIPs | Currently ambiguous whether thresholds are fixed or flexible |
| §4.6 (policy templates) | Add: templates are versioned; verifiers specify convention version | Need versioning for compatibility |
| §11 (phased delivery) | Add: Phase 1 establishes CIP process and initial conventions; Phase 2 introduces data-driven adaptation | Governance is infrastructure, not afterthought |
| §13 (open questions) | Add: governance model resolved via convention-based evolution | Close the open question |

---

*This document defines how CCP evolves without centralized governance. The core mechanism is convention-based evolution through CIPs, enforced by market adoption rather than admin keys. The registry is immutable; everything else is a convention that evolves through rough consensus and running code.*
