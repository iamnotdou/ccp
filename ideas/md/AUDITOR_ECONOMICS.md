# Auditor Economics: Staking, Incentives, and Market Design

**Status:** Working Note
**Date:** April 2026
**Companion to:** PRD v0.2, Nash Equilibrium Note

---

## 1. The Central Question

Why would a competent security firm lock up capital to attest an operator's containment architecture?

The answer must be: **because honest auditing is more profitable than not auditing, and more profitable than dishonest auditing.** If this doesn't hold, the auditor market either doesn't exist or degrades into rubber-stamping.

---

## 2. Revenue: Where Does Auditor Income Come From?

### 2.1 Primary Revenue: Audit Fees

The operator pays the auditor to verify containment architecture and sign the attestation. This is the same model as traditional smart contract auditing (Trail of Bits, OpenZeppelin, Certora) and financial auditing (Big 4).

**Current market benchmarks:**

| Audit type | Market rate (2026) | Typical duration |
|---|---|---|
| Smart contract audit (simple) | $5k–$30k | 1–2 weeks |
| Smart contract audit (complex DeFi) | $50k–$200k | 4–8 weeks |
| Formal verification (per contract) | $30k–$100k | 2–6 weeks |
| Penetration test (permission model) | $15k–$50k | 1–3 weeks |
| Full-stack security review | $100k–$500k | 4–12 weeks |

**CCP audit scope by certificate class:**

| Class | Required scope | Estimated audit cost | Renewal frequency |
|---|---|---|---|
| C1 | Self-attestation acceptable | $0 (no auditor needed) | 90 days |
| C2 | Independent third-party: at minimum SMART_CONTRACT_VERIFICATION | $15k–$80k | 60 days (re-attestation on architecture change) |
| C3 | FULL_STACK by independent attestor; all critical constraints formally verified | $80k–$300k | 30 days |

**Renewal economics matter.** A C2 certificate expires every 60 days. But renewal audits are cheaper than initial audits — if the architecture hasn't changed, it's a delta review:

| Audit type | Initial cost | Renewal cost (no change) | Renewal cost (minor change) |
|---|---|---|---|
| C2 initial | $40k | — | — |
| C2 renewal | — | $5k–$10k | $15k–$25k |
| C3 initial | $150k | — | — |
| C3 renewal | — | $15k–$30k | $50k–$80k |

**Annual revenue per client (steady state):**

| Class | Initial + renewals/year | Annual revenue per client |
|---|---|---|
| C2 (6 renewals/year) | $40k + 6 × $8k | ~$88k |
| C3 (12 renewals/year) | $150k + 12 × $20k | ~$390k |

### 2.2 Secondary Revenue: Reputation and Pipeline

Auditors with strong track records attract more clients. This is non-trivial — in the smart contract audit market, top firms (Trail of Bits, OpenZeppelin) command 2–5x premiums over lesser-known firms and have waitlists. In CCP:

- **On-chain track record** — every attestation is public; ratio of challenged-to-clean certificates is visible
- **Specialization premium** — auditors who develop deep expertise in specific constraint types (TEE verification, formal verification, MPC architectures) can charge higher fees
- **Insurance partnerships** — insurance providers may require or prefer specific auditors, creating referral pipelines

### 2.3 Tertiary Revenue: Staking Yield

If auditor stakes are held in a yield-bearing contract (e.g., staked ETH, USDC lending), the auditor earns yield on locked capital. This partially offsets the opportunity cost of staking. At current rates:

| Stake denomination | Approximate yield | On $500k stake |
|---|---|---|
| Staked ETH | 3–4% APY | $15k–$20k/year |
| USDC lending (Aave/Compound) | 2–5% APY | $10k–$25k/year |

---

## 3. Staking: How It Works

### 3.1 What Gets Staked

The auditor locks capital in a CCP staking contract. This capital is at risk if the auditor's attestations are shown to be false or negligent.

**Stake denomination:** Same as reserve denomination — exogenous assets (ETH, USDC, or equivalent). No self-minted tokens.

### 3.2 How Much Gets Staked

The stake must be large enough that the expected loss from dishonest auditing exceeds the cost savings from cutting corners.

**Option A: Fixed stake per attestation**

```
stake_per_certificate = fixed_amount (e.g., $10k per C2 attestation, $50k per C3)
```

- Pro: Simple, predictable
- Con: Doesn't scale with risk — a $10k stake on a certificate with a $10M containment bound is meaningless

**Option B: Proportional to containment bound**

```
stake_per_certificate = containment_bound × stake_ratio
```

Where `stake_ratio` might be 1–5% for C2, 3–10% for C3.

Example: Agent with $500k containment bound, C2 certificate → auditor stakes $5k–$25k for that certificate.

- Pro: Scales with risk; skin-in-the-game proportional to potential damage
- Con: Large containment bounds require very large stakes; auditor capital becomes the bottleneck

**Option C: Aggregate cap with proportional allocation**

```
total_stake = min(sum(containment_bound_i × stake_ratio), max_stake_cap)
```

The auditor posts a total stake pool, allocated across all active attestations. Each attestation's share is proportional to its containment bound.

- Pro: Capital-efficient; allows auditors to serve multiple clients without unbounded capital requirements
- Con: A single bad attestation slashes from the pool, affecting all clients

**Recommendation: Option B with a practical cap**

```
stake_per_certificate = min(containment_bound × 0.03, $100k)  // for C2
stake_per_certificate = min(containment_bound × 0.05, $250k)  // for C3
```

This means:
- Small agent ($50k containment bound, C2): auditor stakes $1.5k
- Medium agent ($500k containment bound, C2): auditor stakes $15k
- Large agent ($5M containment bound, C3): auditor stakes $250k (capped)

### 3.3 Lock-Up Period

Stake is locked from attestation signing until **certificate expiry + challenge window**.

```
lock_period = certificate_validity + challenge_grace_period
```

Where `challenge_grace_period` = 14–30 days after certificate expiry (allows time for post-expiry challenges based on evidence discovered during the validity period).

| Class | Certificate validity | Challenge grace | Total lock-up |
|---|---|---|---|
| C2 | 60 days | 14 days | 74 days |
| C3 | 30 days | 30 days | 60 days |

### 3.4 Stake Release

If no successful challenge occurs during the lock-up period, the full stake is returned to the auditor. This is automatic — no governance or manual release.

```
if (block.timestamp > certificate.expires_at + challenge_grace_period
    && certificate.status != CHALLENGED) {
    release(auditor_stake);
}
```

### 3.5 Slashing Conditions

Stake is slashed (partially or fully) when a challenge succeeds. Slashing requires **objective, verifiable evidence** — not opinion or reputation signals.

| Slashing trigger | Evidence type | Slash amount |
|---|---|---|
| Attested constraint does not exist | On-chain: contract at stated address doesn't implement stated function | 100% of stake for that certificate |
| Attested reserve is below stated amount | On-chain: balance query shows shortfall at any point during validity | 50–100% (proportional to shortfall) |
| Formally verified claim is false | Verification proof doesn't check, or references wrong contract | 100% |
| Constraint is agent-influenceable but attested as agent-independent | Demonstrated exploit path where agent can circumvent the constraint | 100% |
| Audit scope claimed but not performed | Harder to prove; requires internal evidence or demonstrated oversight gap | 50% + reputation penalty |

**What is NOT a slashing condition:**
- Agent causes loss despite containment working as designed (containment bounds the loss, doesn't prevent all loss)
- Architecture changes after attestation that the auditor couldn't have known about (operator's fault, not auditor's)
- Market conditions causing reserve value to drop (unless auditor attested reserve adequacy without accounting for volatility)

### 3.6 Slash Distribution

When a slash occurs, the slashed funds are distributed:

| Recipient | Share | Rationale |
|---|---|---|
| Challenger who submitted evidence | 30% | Incentive to monitor |
| Affected verifiers (pro-rata by transaction volume) | 50% | Partial compensation for reliance on false attestation |
| Protocol treasury / burn | 20% | Prevents slash-and-reclaim schemes between colluding parties |

---

## 4. The Honest Auditor's P&L

Let's model a mid-tier auditor serving the CCP ecosystem:

### 4.1 Assumptions

- Auditor serves 20 active C2 certificates and 5 active C3 certificates
- Average containment bound: $500k (C2), $2M (C3)
- Renewal cadence: C2 every 60 days, C3 every 30 days
- Audit team: 4 senior engineers + 2 formal verification specialists
- No challenges succeed (honest auditor)

### 4.2 Annual Revenue

```
C2 clients: 20 × ($40k initial amortized + 6 renewals × $8k) = 20 × $88k = $1.76M
C3 clients:  5 × ($150k initial amortized + 12 renewals × $20k) = 5 × $390k = $1.95M
Total audit revenue: $3.71M

Staking yield:
  C2 stakes: 20 × $15k = $300k locked → $12k yield
  C3 stakes: 5 × $100k = $500k locked → $20k yield
Total yield: $32k

TOTAL REVENUE: ~$3.74M
```

### 4.3 Annual Costs

```
Team compensation (6 specialists): $1.8M
  (Senior security engineers: $250k–$350k; formal verification: $300k–$400k)
Infrastructure (testing environments, tools, CI): $100k
Insurance (E&O, professional liability): $150k
Staking capital (opportunity cost at 5% above risk-free):
  $800k × 5% = $40k
Operational overhead: $200k

TOTAL COSTS: ~$2.29M
```

### 4.4 Profit

```
Gross profit: $3.74M - $2.29M = $1.45M
Margin: ~39%

Capital deployed (stake): $800k
Return on staked capital: $1.45M / $800k = 181% (but this is return on stake, not total firm capital)
```

This is a healthy business. For comparison, smart contract audit firms currently operate at 30–50% margins with similar team sizes.

### 4.5 Break-Even Analysis

The minimum viable auditor needs:

```
Minimum clients to cover costs:
  $2.29M / weighted_avg_revenue_per_client
  = $2.29M / $149k (blended)
  ≈ 16 clients

Minimum stake:
  16 clients × avg $30k stake = $480k
```

**An auditor with ~16 clients and ~$480k in staking capital can operate profitably.** This is achievable for small security firms and even well-capitalized independent security researchers.

---

## 5. The Dishonest Auditor's P&L (Why It Doesn't Pay)

### 5.1 The Temptation

A dishonest auditor performs shallow audits — cursory review instead of thorough verification. This saves time and cost per audit:

```
Cost savings from shallow audit:
  C2: ~$25k saved per initial audit (skip deep contract review, do surface check only)
  C3: ~$100k saved per initial audit
  Renewals: ~$5k saved per renewal (rubber-stamp instead of delta review)
```

With 20 C2 + 5 C3 clients:
```
Savings from shallow audits:
  Initial: 20 × $25k + 5 × $100k = $1M
  Renewals: (20 × 6 × $5k) + (5 × 12 × $5k) = $900k
  Total annual savings: $1.9M

Can also take more clients (faster turnaround):
  Additional 10 clients × $60k avg revenue = $600k

Total cheating benefit: ~$2.5M/year
```

### 5.2 The Expected Cost

But the auditor is now exposed to slashing on every attestation:

```
Probability of detection per certificate per validity period:
  p_detect = f(on_chain_monitoring, challenger_activity, post_incident_investigation)

Conservative estimate (early ecosystem): p_detect = 0.05 per certificate per cycle
Mature ecosystem with active challengers: p_detect = 0.15 per certificate per cycle
```

Expected annual slashing cost (mature ecosystem):
```
Per certificate: p_detect × stake × cycles_per_year
  C2: 0.15 × $15k × 6 = $13.5k per client
  C3: 0.15 × $100k × 12 = $180k per client

Total expected slash:
  20 × $13.5k + 5 × $180k = $270k + $900k = $1.17M/year in expected slashing

Plus: reputation destruction on first detected failure
  Loss of all clients: -$3.74M/year ongoing revenue
  NPV of reputation loss (3 years to rebuild): ~$7M+
```

### 5.3 Expected Payoff Comparison

```
Honest auditor annual profit:     $1.45M
Dishonest auditor expected profit: $2.5M savings + $600k extra clients
                                   - $1.17M expected slashing
                                   - p(caught_once) × $7M reputation NPV

If p(caught_at_least_once_in_year) for a portfolio of 25 shallow audits:
  = 1 - (1 - 0.15)^(25 × avg_cycles)
  ≈ 1 - 0.85^150
  ≈ 1.0 (virtually certain over a year)

So the dishonest auditor will almost certainly be caught within a year:
  Expected profit = $3.1M - $1.17M - $7M = -$5.07M
```

**Dishonesty is deeply unprofitable** when:
1. Detection probability per certificate is ≥5%
2. Reputation loss is priced in
3. Stake is proportional to containment bound

### 5.4 When Dishonesty Could Still Pay

The model breaks if:

| Condition | Why it breaks the model | Defense |
|---|---|---|
| Detection probability is near zero | No challengers, no monitoring, no post-incident investigation | Challenge rewards must be high enough to sustain a monitoring market |
| Reputation doesn't matter | Anonymous auditors, no track record | Apprentice system for new auditors; on-chain track records; minimum operating history for C3 attestation |
| Stakes are too low | Slashing doesn't hurt | Stakes proportional to containment bound, with meaningful minimums |
| Too-big-to-fail auditor | Single auditor has so many clients that slashing them would cascade | Concentration limits; max attestations per auditor; diversification requirements in verifier templates |
| Operator never fails | If the agent never actually causes a loss, the shallow audit is never exposed | Proactive challenges (bounty hunters test constraints); not just reactive (wait for incident) |

---

## 6. Auditor Market Structure

### 6.1 Who Becomes a CCP Auditor?

**Tier 1: Established smart contract audit firms**
- Trail of Bits, OpenZeppelin, Certora, Consensys Diligence, Halborn
- Already have technical capability and reputation
- CCP is a new revenue stream with recurring renewal revenue (unlike one-off audits)
- Likely early adopters — they're already in the ecosystem

**Tier 2: Security-focused DAOs and collectives**
- Sherlock, Code4rena, Immunefi community
- Could transition from bug bounty / contest model to structured attestation
- Lower overhead, potentially lower prices, but less established individual reputation
- Good fit for C2 attestations; may need to build toward C3

**Tier 3: New entrants (individuals and small firms)**
- Smart contract security researchers, formal verification specialists
- Enter through the apprentice system (co-attest with Tier 1 for first K certificates)
- Important for ecosystem health — prevents Tier 1 oligopoly

**Tier 4: Traditional audit firms (Big 4)**
- Deloitte, PwC, EY, KPMG — already have blockchain audit practices
- Likely enter at C3 level where "institutional" trust matters
- Bring traditional audit methodology and regulatory credibility
- Higher cost, but may be required by regulated operators

### 6.2 Competitive Dynamics

**Healthy market structure:**
```
5–10 active auditors at C2 level
2–5 active auditors at C3 level
Concentration limit: no single auditor attests >20% of active certificates
```

**What prevents monopoly:**
- Concentration limits in verifier templates ("no more than 20% of admitted agents sharing the same auditor" — already in PRD §4.6)
- Auditor capacity limits (max active attestations)
- Apprentice system lowers entry barriers for new auditors
- Different operators need different specializations

**What prevents race-to-the-bottom on price:**
- Staking creates a quality floor — can't do cheap audits if your capital is at risk
- On-chain track records make quality visible — operators choose auditors based on track record, not just price
- Insurance providers may prefer or require specific auditors — creates quality-based demand

### 6.3 The Apprentice System

New auditors face a cold-start problem: no track record → no clients → no track record.

**Solution: Graduated entry**

| Level | Requirements | Privileges | Stake |
|---|---|---|---|
| Apprentice | Co-attest with an established auditor for first 5 certificates | Name appears on attestation; builds track record | 50% of normal stake (mentor auditor covers the other 50%) |
| Independent (C2) | 5+ clean co-attestations; 0 successful challenges | Can independently attest C2 certificates | Full stake |
| Independent (C3) | 10+ clean independent C2 attestations; formal verification capability demonstrated | Can attest C3 certificates | Full stake (higher for C3) |
| Senior | 50+ clean attestations; 2+ years active | Can mentor apprentices; eligible for cross-auditor verification roles | Full stake; potential stake discount based on track record |

**Why established auditors would mentor:**
- Mentor receives 20–30% of apprentice's audit fee for co-attested certificates
- Builds reputation as "auditor that trains auditors" — ecosystem leadership
- Reduces own workload on simpler attestations while maintaining quality control
- Expands the auditor pool, which improves the overall ecosystem (less concentration risk)

---

## 7. Audit Scope and Methodology

### 7.1 What Exactly Does a CCP Auditor Verify?

The attestation scope determines what the auditor is staking their reputation and capital on:

**SMART_CONTRACT_VERIFICATION (minimum for C2)**

| Check | What the auditor verifies | Evidence produced |
|---|---|---|
| Constraint existence | Smart contract at stated address implements stated constraint logic | Contract source code review + deployment verification |
| Constraint correctness | Contract logic actually enforces the stated bound (e.g., max_periodic_loss is enforced, not just declared) | Test suite results; edge case analysis |
| Agent independence | The agent cannot call admin functions, upgrade the contract, or otherwise circumvent the constraint | Access control analysis; role enumeration |
| Formal verification (if claimed) | The formal verification proof is valid and covers the stated properties | Proof review; independent re-verification |
| Reserve lock-up | Reserve contract actually prevents withdrawal during certificate validity | Contract analysis; attempted withdrawal test |

**PERMISSION_MODEL_AUDIT**

| Check | What the auditor verifies | Evidence produced |
|---|---|---|
| Permission scope | Agent's actual permissions match what the certificate declares | Permission enumeration; MPC/HSM configuration review |
| Escalation paths | No path for the agent to obtain permissions beyond declared scope | Privilege escalation testing |
| Delegation chains | If agent uses delegated permissions (ERC-7710), delegation scope matches certificate | Delegation chain analysis |

**RESERVE_ADEQUACY**

| Check | What the auditor verifies | Evidence produced |
|---|---|---|
| Reserve amount | Actual balance ≥ stated amount at audit time | On-chain balance verification |
| Reserve exogeneity | Reserve assets are genuinely independent of agent ecosystem | Asset analysis; correlation assessment |
| Reserve ratio | Ratio to max periodic loss meets class requirements | Calculation verification |
| Lock-up enforcement | Smart contract prevents withdrawal during certificate validity | Contract analysis |

**FULL_STACK (required for C3)**

All of the above, plus:

| Check | What the auditor verifies | Evidence produced |
|---|---|---|
| Composition analysis | No gap between constraints where loss can leak through | Full interaction analysis between all constraint contracts |
| Model attestation | If model_version_attested: true, verify TEE actually attests the model | TEE configuration review |
| End-to-end scenario testing | Simulate worst-case scenarios: what happens if the agent tries everything within its power? | Red team report |
| Dependency mapping | All dependencies are correctly disclosed | Infrastructure enumeration |

### 7.2 Audit Deliverables

The auditor produces:
1. **Attestation signature** — On-chain: auditor's signature over the certificate hash
2. **Audit report** — On IPFS: full report documenting methodology, findings, and scope limitations
3. **Scope declaration** — On-chain: which audit types were performed (SMART_CONTRACT_VERIFICATION, etc.)
4. **Residual risk disclosure** — In report: what the audit did NOT cover; known limitations

### 7.3 Renewal Audits

Renewal audits are cheaper because they're delta reviews:

```
Renewal scope = (changes since last attestation) + (spot checks on unchanged components)
```

| Scenario | Renewal work | Cost relative to initial |
|---|---|---|
| No architecture changes | Spot checks + reserve verification + re-sign | 10–15% |
| Minor changes (parameter updates, threshold adjustments) | Focused review of changes + spot checks | 25–40% |
| Major changes (new constraint contract, new enforcement mechanism) | Full review of new components + integration review | 60–80% |
| Architecture overhaul | Effectively a new initial audit | 100% |

**Auditor incentive on renewals:** Renewals are high-margin, low-effort work for honest auditors — but only if the initial audit was thorough. A shallow initial audit creates risk at every renewal (because you don't actually know the baseline). This reinforces the incentive for thorough initial audits.

---

## 8. Challenge Mechanics (Auditor Perspective)

### 8.1 What a Challenge Looks Like

A challenger submits on-chain evidence that an attested claim is false. The auditor's stake is at risk.

**Example challenges:**

| Challenge | Evidence | Adjudication |
|---|---|---|
| "Reserve is below stated amount" | On-chain balance query showing shortfall | **Objective, automatable** — contract can verify balance |
| "Constraint contract doesn't enforce stated limit" | Transaction demonstrating that the agent exceeded the stated max_single_action_loss | **Objective** — the transaction is on-chain |
| "Constraint is agent-influenceable, not agent-independent" | Demonstrated transaction where the agent modified the constraint parameters | **Objective** — the transaction is on-chain |
| "Formal verification proof is invalid" | Counter-proof or demonstration that the proof doesn't cover stated properties | **Semi-objective** — requires verification expertise, but proofs are deterministic |
| "Audit scope was not actually performed" | Harder — may require evidence that specific checks were skipped | **Subjective** — difficult to prove; may require whistleblower evidence |

### 8.2 Adjudication

The PRD specifies that challenges are "informational, not adjudicative" (NF8). But with auditor stakes, some form of resolution is needed.

**Proposal: Tiered adjudication**

| Tier | Applies to | Mechanism | Speed |
|---|---|---|---|
| **Automatic** | On-chain verifiable claims (reserve balance, constraint enforcement, agent independence) | Smart contract checks the evidence directly | Immediate |
| **Expert panel** | Semi-objective claims (formal verification disputes, scope adequacy) | Panel of 3 randomly selected senior auditors (not the challenged auditor); majority vote | 7–14 days |
| **Informational only** | Subjective claims (audit thoroughness, methodology questions) | Published on-chain as a flag; no slashing; verifiers decide weight | N/A |

### 8.3 Auditor Response to Challenge

When challenged, the auditor can:

1. **Accept** — Acknowledge the finding; stake is slashed; certificate is flagged
2. **Defend** — Provide counter-evidence; goes to adjudication
3. **Preemptive revocation** — If the auditor discovers their own attestation was wrong (e.g., operator changed architecture without notifying), they can revoke their attestation and flag the certificate before a challenge lands. This should result in **reduced slashing** (e.g., 25% instead of 100%) — incentivizes auditors to self-report rather than hide problems.

---

## 9. Edge Cases and Open Questions

### 9.1 What If the Operator Changes Architecture After Attestation?

The auditor attested the architecture at time T. At time T+30, the operator modifies a constraint contract without telling the auditor. At T+45, a challenger shows the constraint is broken.

**Who is liable?**

- **Operator** — Changed architecture without re-attestation (certificate should require re-attestation on change)
- **Auditor** — Only if the change was foreseeable or if the auditor failed to verify that the constraint contract is immutable/non-upgradeable

**Design response:**
- Auditors should verify that attested contracts are **not upgradeable** by the operator, or if they are upgradeable, the certificate must disclose this and the attestation explicitly covers the current version only
- Certificates on upgradeable contracts should have shorter expiry or require continuous monitoring
- The `agent_independent` field should account for upgradeability — if the operator can upgrade the constraint contract, the constraint is NOT agent-independent

### 9.2 What If Market Conditions Change Reserve Adequacy?

Auditor attested that reserves are adequate at a 3x ratio. ETH drops 60%. Now reserves are below 1x.

**Not the auditor's fault** — unless the auditor failed to flag the volatility risk in their report. The reserve_ratio is a point-in-time metric.

**Design response:**
- C3 certificates require continuous on-chain reserve monitoring (already in PRD)
- Auditor report should include reserve sensitivity analysis ("reserves remain adequate down to ETH price of $X")
- Automatic certificate degradation or warning if reserve ratio drops below class minimum

### 9.3 What If There Aren't Enough Auditors to Challenge Each Other?

In the early ecosystem, 1–2 auditors exist. Cross-auditor verification is meaningless.

**Design response:**
- Phase 1 relies on reputation + simple bonds (small-numbers game)
- Challenge mechanism is open to anyone, not just auditors — security researchers, bounty hunters, competitors
- Apprentice system accelerates auditor pool growth
- As auditor count reaches 5+, cross-auditor verification becomes viable

### 9.4 What If an Auditor Goes Bankrupt?

The auditor's stakes are in smart contracts, but the firm ceases operations. Who handles ongoing attestations?

**Design response:**
- Stakes remain in the contract regardless of auditor firm status — slashing is still possible
- Certificates attested by the defunct auditor continue until expiry but cannot be renewed
- Operators must find a new auditor for renewal — forced auditor rotation (which is actually healthy)
- Verifier templates could include "auditor must be active" as a check

### 9.5 What about auditor liability beyond staking?

Staking handles on-chain penalties. But real-world legal liability exists too.

**The interaction:**
- If a false attestation causes real financial loss to verifiers, the auditor may face legal claims beyond the on-chain slash
- This mirrors traditional audit liability (Arthur Andersen / Enron)
- Professional liability insurance (E&O) is a cost auditors should carry
- The on-chain slash is the first line of defense; legal liability is the backstop

---

## 10. Auditor Economics by Ecosystem Phase

### Phase 1: Genesis (0–50 certificates)

```
Auditor count: 1–2
Typical client: Early-adopter operator, C2 certificate
Revenue per auditor: $500k–$1M/year (small client base but high per-client value)
Staking: Minimal ($5k–$10k per cert; total $50k–$100k)
Challenge activity: Near zero (small ecosystem, mostly known actors)
Primary trust mechanism: Reputation
Key risk: Auditor concentration (if one auditor attests 80% of certificates)
```

### Phase 2: Growth (50–500 certificates)

```
Auditor count: 5–10
Typical client: Mix of C2 and C3 operators
Revenue per auditor: $2M–$5M/year
Staking: Moderate ($500k–$2M total per auditor)
Challenge activity: Growing (professional monitors emerge)
Primary trust mechanism: Staking + reputation hybrid
Key risk: Race-to-the-bottom on audit quality as new auditors enter
```

### Phase 3: Mature (500+ certificates)

```
Auditor count: 15–30
Typical client: Full range C1–C3
Revenue per auditor: $3M–$10M/year
Staking: Significant ($2M–$10M total per auditor)
Challenge activity: Active market (monitoring firms, bounty hunters, cross-auditor challenges)
Primary trust mechanism: Pure mechanism (staking + challenges + insurance)
Key risk: Too-big-to-fail auditor; regulatory capture
```

---

## 11. Summary: Why Honest Auditing Pays

```
HONEST AUDITOR                          DISHONEST AUDITOR
═══════════════                         ═════════════════

Revenue:    $3.7M/year                  Revenue:    $4.3M/year (+$600k more clients)
Costs:     -$2.3M/year                  Costs:     -$0.9M/year (shallow audits)
Stake:     -$800k locked                Stake:     -$800k locked
                                        Slashing:  -$1.2M/year expected
                                        Reputation: -$7M+ NPV when caught

Profit:     $1.4M/year                  Profit:    -$5M+ (expected, over 2 years)
Trajectory: Growing client base         Trajectory: Business destruction
            Compounding reputation                  Potential legal liability
            Insurance partnerships                  Permanent blacklist
```

The auditor incentive works because:

1. **Recurring revenue** — Renewals create a long-term revenue stream that is destroyed by dishonesty
2. **Proportional staking** — Skin-in-the-game scales with the risk the auditor is attesting
3. **Observable track records** — On-chain history makes quality visible, enabling reputation to function as a market signal
4. **Challenge market** — External monitors raise detection probability, making dishonesty unprofitable in expectation
5. **Fee escrow** — Revenue isn't fully realized until the certificate expires clean, tying payment to outcomes
6. **Capital barrier** — Staking requirement selects for committed, well-capitalized actors
7. **Apprentice system** — Maintains quality while enabling new entry, preventing oligopoly

The system does NOT rely on auditors being altruistic. It relies on honest auditing being the profit-maximizing strategy for a rational, self-interested firm.

---

*This document is a companion to the CCP PRD and Nash Equilibrium note. It provides the detailed economic model for auditor participation in the CCP ecosystem.*
