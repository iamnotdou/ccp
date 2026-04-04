# Economic Model: Who Pays What, Where Money Flows

**Status:** Working Note
**Date:** April 2026
**Companion to:** PRD v0.2

---

## 1. Design Principle

CCP charges no protocol fees. No governance token. No rent extraction. The protocol is a public good — like TCP/IP or ERC-20.

But the ecosystem has real money flowing through it: reserve deposits, operator bonds, auditor stakes, audit fees, challenge bonds, insurance premiums, and slash distributions. This document maps every flow.

---

## 2. The Complete Money Map

```
                          ┌──────────────────┐
                          │   OPERATOR        │
                          │                   │
                          │ Funding sources:  │
                          │ - Operating rev.  │
                          │ - VC/treasury     │
                          │ - Insurance rebate│
                          └─┬───┬───┬───┬────┘
                            │   │   │   │
            ┌───────────────┘   │   │   └───────────────┐
            ▼                   ▼   ▼                   ▼
     ┌─────────────┐   ┌──────────┐ ┌──────────┐  ┌──────────┐
     │ RESERVE     │   │ OPERATOR │ │ AUDIT    │  │ INSURANCE│
     │ DEPOSIT     │   │ BOND     │ │ FEE      │  │ PREMIUM  │
     │             │   │          │ │          │  │          │
     │ 3-5x max    │   │ 10% of   │ │ $15k-300k│  │ Based on │
     │ periodic    │   │ contain- │ │ per cert │  │ cert     │
     │ loss        │   │ ment     │ │ cycle    │  │ class    │
     │             │   │ bound    │ │          │  │          │
     └──────┬──────┘   └────┬─────┘ └────┬─────┘  └────┬─────┘
            │               │            │              │
            ▼               ▼            ▼              ▼
     ┌─────────────┐ ┌──────────┐ ┌──────────┐  ┌──────────────┐
     │ Reserve     │ │ Bond     │ │ Fee      │  │ Insurance    │
     │ Contract    │ │ Contract │ │ Escrow   │  │ Provider     │
     │ (on-chain)  │ │(on-chain)│ │(on-chain)│  │ (off-chain   │
     │             │ │          │ │          │  │  or on-chain) │
     │ Locked until│ │ Locked   │ │ Held until│  │              │
     │ cert expires│ │ until    │ │ clean    │  │ Pays claims  │
     │ + grace     │ │ expiry + │ │ expiry   │  │ if loss      │
     │             │ │ grace    │ │          │  │ occurs       │
     └──────┬──────┘ └────┬─────┘ └────┬─────┘  └──────────────┘
            │               │            │
            │               │            │
     ON CLEAN EXPIRY:       │            │
     ┌──────┴──────┐ ┌─────┴──────┐ ┌───┴────────┐
     │ Reserve     │ │ Bond       │ │ Fee paid   │
     │ returned    │ │ returned   │ │ to auditor │
     │ to operator │ │ to operator│ │            │
     └─────────────┘ └────────────┘ └────────────┘

     ON SUCCESSFUL CHALLENGE:
     ┌─────────────┐ ┌────────────┐ ┌────────────┐
     │ Reserve     │ │ Bond       │ │ Fee        │
     │ held for    │ │ SLASHED:   │ │ CLAWED     │
     │ verifier    │ │ 30% →      │ │ BACK from  │
     │ claims      │ │  challenger│ │ auditor    │
     │             │ │ 50% →      │ │            │
     │             │ │  verifiers │ │            │
     │             │ │ 20% → burn │ │            │
     └─────────────┘ └────────────┘ └────────────┘
```

---

## 3. Operator Costs (What It Costs to Certify an Agent)

### 3.1 Cost Breakdown by Certificate Class

| Cost item | C1 (Basic) | C2 (Standard) | C3 (Institutional) |
|---|---|---|---|
| **Reserve deposit** | 1x max periodic loss | 3x max periodic loss | 5x max periodic loss |
| **Operator bond** | 5% of containment bound | 10% of containment bound | 10% of containment bound |
| **Initial audit fee** | $0 (self-attestation) | $15k–$80k | $80k–$300k |
| **Annual renewal fees** | $0 | ~$48k (6 renewals × $8k) | ~$240k (12 renewals × $20k) |
| **Insurance premium** | Optional | Recommended | Expected |
| **Gas costs (annual)** | ~$50 (2 publish + 4 renew) | ~$200 (7 transactions) | ~$500 (13+ transactions) |

### 3.2 Concrete Example: Medium C2 Agent

An operator deploys an agent that handles up to $50k/day in transactions.

```
Containment bound:           $50,000  (max daily loss if only agent-independent layers hold)
Max periodic loss (daily):   $50,000

UPFRONT COSTS:
  Reserve deposit:           $150,000  (3x × $50k, locked in smart contract)
  Operator bond:               $5,000  (10% × $50k, locked in smart contract)
  Initial audit:              $40,000  (C2, SMART_CONTRACT_VERIFICATION)
  ─────────────────────────────────────
  Total upfront:             $195,000

ANNUAL RECURRING:
  Renewal audits:             $48,000  (6 × $8k)
  Insurance premium:          $15,000  (estimated, based on C2 + $50k containment bound)
  Gas costs:                     $200
  ─────────────────────────────────────
  Total annual:               $63,200

CAPITAL LOCKED (not spent, returned on clean expiry):
  Reserve:                   $150,000
  Bond:                        $5,000
  ─────────────────────────────────────
  Total locked:              $155,000
  Opportunity cost (5% APY):   $7,750/year
```

**Total annual cost of certification:** ~$71,000 ($63,200 recurring + $7,750 opportunity cost)

**Break-even question:** Is $71k/year worth it? Yes, if the agent generates enough transaction value that CCP access (marketplace listing, lower escrow, higher limits, insurance eligibility) produces more than $71k in incremental value. For an agent handling $50k/day ($18M/year), this is 0.4% of transaction volume.

### 3.3 Concrete Example: Large C3 Agent

An operator deploys an institutional agent managing $5M in DeFi positions.

```
Containment bound:         $500,000  (max loss in worst case)
Max periodic loss (daily): $500,000

UPFRONT COSTS:
  Reserve deposit:         $2,500,000  (5x × $500k)
  Operator bond:              $50,000  (10% × $500k)
  Initial audit:             $150,000  (C3, FULL_STACK)
  ─────────────────────────────────────
  Total upfront:           $2,700,000

ANNUAL RECURRING:
  Renewal audits:            $240,000  (12 × $20k)
  Insurance premium:         $100,000  (estimated)
  Gas costs:                     $500
  ─────────────────────────────────────
  Total annual:              $340,500

CAPITAL LOCKED:
  Reserve:                 $2,500,000
  Bond:                       $50,000
  ─────────────────────────────────────
  Total locked:            $2,550,000
  Opportunity cost (5% APY): $127,500/year
```

**Total annual cost:** ~$468,000. For an agent managing $5M+ in positions, this is the cost of institutional-grade trust infrastructure. Comparable to what TradFi funds spend on custody, compliance, and insurance.

### 3.4 Reserve Is Not a Cost — It's Locked Capital

Critical distinction: the reserve is not spent. It's locked and returned on clean expiry. The real cost is the **opportunity cost** — what the operator could have earned with that capital elsewhere.

For operators who already hold reserves for business purposes (exchanges, lending protocols, custodians), the marginal cost of CCP reserve requirements may be near zero — they're already capitalized.

For lean startups deploying agents, reserve requirements may be the biggest barrier. This is **by design** — if you can't afford to back your agent's worst case, you shouldn't be deploying that agent at that scale.

---

## 4. Auditor Revenue Flows

### 4.1 Revenue Sources

```
AUDITOR REVENUE
═══════════════

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ AUDIT FEES  │  │ STAKING     │  │ MENTORSHIP  │
│             │  │ YIELD       │  │ FEES        │
│ Primary     │  │ Secondary   │  │ Tertiary    │
│ revenue     │  │ revenue     │  │ revenue     │
│             │  │             │  │             │
│ $15k-$300k  │  │ 3-4% APY   │  │ 20-30% of  │
│ per initial │  │ on staked   │  │ apprentice's│
│ cert        │  │ capital     │  │ audit fee   │
│             │  │             │  │             │
│ $5k-$30k   │  │ ~$20k-$50k  │  │ $5k-$15k   │
│ per renewal │  │ per year    │  │ per cert    │
└─────────────┘  └─────────────┘  └─────────────┘
```

### 4.2 Revenue Timing

Audit fees are NOT paid immediately. They flow through escrow:

```
Day 0:   Operator deposits fee into FeeEscrow contract
Day 1:   Audit begins (auditor works on trust, not on payment)
Day 21:  Audit complete, attestation signed
Day 22:  Certificate published
Day 82:  Certificate expires (60-day validity)
Day 96:  Challenge grace period ends (14 days)
Day 96:  IF no successful challenge → fee released to auditor
         IF challenge succeeded → fee returned to operator (or burned)
```

**Why escrow matters:** Aligns auditor payment with outcome. The auditor earns their fee only if their attestation survives the full validity period. This means:

- Auditor has financial incentive to attest accurately (not just to complete the engagement)
- Operator has recourse if the attestation turns out to be false
- Creates a natural "warranty period" for audit quality

### 4.3 Auditor Costs

```
AUDITOR COSTS
═════════════

FIXED (annual):
  Team compensation (4-6 specialists):    $1,200,000 - $2,400,000
  Tools and infrastructure:                   $50,000 - $150,000
  Professional liability insurance:          $100,000 - $200,000
  Operational overhead:                      $100,000 - $300,000

VARIABLE (per certificate):
  Staking capital (opportunity cost):        $500 - $12,500 per cert
  Research and analysis time:                Included in team comp

CAPITAL REQUIREMENTS:
  Total staking capital (20-25 certs):       $300,000 - $2,000,000
  Working capital (3 months runway):         $400,000 - $800,000
```

---

## 5. Challenger Economics

### 5.1 Who Are Challengers?

Challengers are **anyone** who identifies a false claim in a certificate and submits on-chain evidence. In practice:

| Challenger type | Motivation | Scale |
|---|---|---|
| **Professional monitors** | Profit from challenge rewards | Full-time; monitor many certificates |
| **Competing operators** | Discredit competitors with false certificates | Occasional; targeted |
| **Security researchers** | Bounty + reputation | Part-time; discovery-driven |
| **Automated bots** | Profit from on-chain-verifiable challenges (e.g., reserve shortfall) | 24/7; automated |
| **Insurance providers** | Reduce exposure by catching false certificates before incidents | Systematic; portfolio-wide |

### 5.2 Challenger Revenue Model

```
Challenge reward = slash_amount × 30%

For a C2 certificate with:
  Operator bond:  $5,000
  Auditor stake: $15,000
  Total at risk: $20,000

If challenge succeeds:
  Challenger receives: $20,000 × 30% = $6,000

Challenger costs:
  Challenge bond:    $200 (returned on success, forfeited on failure)
  Gas cost:           $50
  Research time:   varies (from minutes for automated reserve check to weeks for manual analysis)
```

### 5.3 Professional Monitor P&L

A firm dedicated to monitoring CCP certificates:

```
REVENUE:
  Assume 500 active certificates in ecosystem
  Assume 2% have detectable issues per cycle
  = 10 successful challenges per cycle
  Average reward per challenge: $5,000
  Cycles per year: ~6 (average certificate is 60 days)
  Annual revenue: 10 × $5,000 × 6 = $300,000

COSTS:
  2 security engineers:     $500,000
  Monitoring infrastructure: $50,000
  Challenge bonds at risk:   $20,000
  ─────────────────────────────────
  Total:                    $570,000

VERDICT: Not profitable as standalone business at 500 certificates.
```

**This is why challenge rewards alone don't create a monitoring market.** Challengers need supplementary income:

| Supplementary model | How it works |
|---|---|
| **Insurance partnerships** | Insurance providers pay monitors a retainer to watch certificates they insure |
| **Integrator partnerships** | Platforms pay monitors to verify certificates of agents on their platform |
| **Auditor cross-monitoring** | Auditors monitor competitors' attestations (motivation: catch sloppy competitors + earn rewards) |
| **Automated monitoring** | On-chain bots check reserve balances and constraint enforcement at near-zero marginal cost; the easy catches require no team |

**Key insight:** The monitoring market becomes viable when:
1. Automated bots handle cheap, on-chain-verifiable checks (reserve balance, contract existence)
2. Insurance/integrator partnerships fund deeper investigation
3. Auditor cross-monitoring provides expert-level scrutiny

---

## 6. Insurance Economics

### 6.1 How Insurance Fits

Insurance bridges the gap between "bounded loss" (what CCP provides) and "zero loss" (what verifiers want):

```
WITHOUT CCP + INSURANCE:
  Verifier's max exposure = UNKNOWN (could be anything)

WITH CCP ONLY:
  Verifier's max exposure = containment_bound (e.g., $50k)

WITH CCP + INSURANCE:
  Verifier's max exposure = $0 (insurer absorbs up to containment_bound)
```

### 6.2 Insurance Pricing Based on Certificate Quality

Insurance providers use certificate data to price premiums:

```
base_premium = containment_bound × base_rate

Adjustments:
  Certificate class C3:     -40% (strong containment = lower expected loss)
  Certificate class C2:     -20%
  Certificate class C1:      +0% (baseline)
  No certificate:           +100% or DECLINE TO INSURE

  Agent-independent layers ≥ 3:  -15%
  Formal verification:            -20%
  Reserve ratio > 5x:             -10%
  Auditor track record (top tier): -10%
  High concentration (shared infra): +20%
  New operator (< 6 months):       +30%
```

**Example pricing:**

| Agent profile | Containment bound | Base rate | Adjustments | Annual premium |
|---|---|---|---|---|
| C2, $50k bound, 2 AI layers, verified | $50,000 | 5% | -20% (C2) -20% (verified) -15% (layers) | $50k × 5% × 0.45 = $1,125 |
| C3, $500k bound, 3 AI layers, top auditor | $500,000 | 5% | -40% -15% -20% -10% | $500k × 5% × 0.15 = $3,750 |
| C1, $10k bound, 1 layer, self-attested | $10,000 | 5% | +0% | $500 |

### 6.3 Insurance Provider's Role in the Ecosystem

Insurance providers are uniquely valuable because they are:

1. **Independent assessors** — Their profit depends on accurately pricing risk, not on selling certificates
2. **Post-incident investigators** — When a loss occurs, they investigate root cause, improving detection for everyone
3. **Quality floor creators** — If insurers refuse to cover agents with certain auditors or architectures, it creates market pressure for quality
4. **Data aggregators** — Loss data across many certificates validates whether CCP classes actually predict risk

### 6.4 Insurance Integration Points

| Integration | Mechanism |
|---|---|
| **Certificate → premium API** | Standard interface for insurance providers to ingest certificate data and return a premium quote |
| **Loss event reporting** | When a loss occurs, structured report linking to certificate, constraints that held/failed, and root cause |
| **Insurance-conditional limits** | Integrators allow higher transaction limits when both CCP certificate AND insurance are present |
| **Reinsurance pool** | For systemic risk (correlated failures), a shared pool that individual insurers can tap |

---

## 7. Protocol Sustainability (No-Fee Model)

### 7.1 CCP Has No Revenue. How Does It Survive?

The protocol itself — the registry contract, the schema standard, the SDK — has no revenue model. Like TCP/IP, ERC-20, or HTTP, it's a public standard.

**What costs money:**
| Cost | Who pays | Funded by |
|---|---|---|
| Registry contract deployment | Protocol foundation (one-time) | Grants, ecosystem fund |
| SDK development and maintenance | Protocol foundation (ongoing) | Grants, ecosystem contributions |
| Documentation and community | Protocol foundation (ongoing) | Grants, ecosystem contributions |
| Gas for publish/revoke | Operator (per transaction) | Operator's operating budget |
| Audit costs | Operator (per certificate cycle) | Operator's operating budget |
| Reserve and bond capital | Operator (locked, not spent) | Operator's balance sheet |
| Monitoring infrastructure | Challengers / insurance / integrators | Their own revenue models |

### 7.2 Why No-Fee Works

1. **Network effects create value without extraction.** The more certificates and verifiers, the more valuable each certificate is. This is sufficient motivation for ecosystem participants to fund development.

2. **Ecosystem participants are well-funded.** Operators deploying agents with $50k+ containment bounds can afford audit and reserve costs. Integrators (DeFi protocols, marketplaces) benefit from reduced losses. Insurers benefit from better risk data.

3. **Grants and ecosystem funds.** Major chains (Ethereum Foundation, Base/Coinbase, Avalanche) fund public goods infrastructure. CCP qualifies.

4. **Corporate sponsorship.** Companies deploying agents (the operators) have incentive to fund the protocol that makes their agents more trustworthy.

5. **The alternative is worse.** A fee-extracting protocol creates governance token incentives, reduces adoption, and introduces capture risk. CCP's credibility depends on neutrality.

### 7.3 What If Sustainability Becomes an Issue?

If grants and ecosystem support prove insufficient:

| Option | Impact on equilibrium |
|---|---|
| **Optional registry "tip"** | Voluntary contribution on publish; no enforcement | Minimal — adoption not affected |
| **Premium SDK features** | Free core SDK; paid enterprise features (analytics, alerting, compliance reporting) | None — core protocol remains free |
| **Certification body** | Foundation offers "CCP Certified" label for auditors; small annual fee | Minor — could create centralization risk if label becomes de facto required |
| **Protocol fee (last resort)** | Small fee (0.01% of containment bound) on publish | Reduces adoption; adds governance complexity; should be avoided unless absolutely necessary |

---

## 8. Flow-of-Funds Summary

### 8.1 Normal Operation (No Challenge)

```
OPERATOR pays:
  → Reserve contract:    $150,000 (locked, returned at expiry + grace)
  → Bond contract:         $5,000 (locked, returned at expiry + grace)
  → Fee escrow:           $40,000 (held, released to auditor at expiry + grace)
  → Insurance provider:   $15,000 (premium, non-refundable)
  → Gas (blockchain):        $200 (non-refundable)

AUDITOR receives (after escrow release):
  → $40,000 audit fee
  → Staking yield on $15,000 locked capital

OPERATOR receives back:
  → $150,000 reserve (after expiry + grace)
  → $5,000 bond (after expiry + grace)

NET COST TO OPERATOR: $55,200/year
  ($40,000 audit + $15,000 insurance + $200 gas)
  + opportunity cost on locked capital
```

### 8.2 Challenge Succeeds

```
OPERATOR loses:
  → Bond slashed:         $5,000
  → Reserve held pending claims
  → Fee clawed back:     $40,000 (returned or burned)
  → Insurance premium:   $15,000 (already paid, non-refundable)
  → Future: integration ban, reputation damage

AUDITOR loses (if attested false claim):
  → Stake slashed:       $15,000
  → Fee clawed back:     $40,000 (not received)
  → Future: reputation damage, client loss

CHALLENGER receives:
  → 30% of $20,000 slashed (bond + stake): $6,000
  → Challenge bond returned: $200

AFFECTED VERIFIERS receive:
  → 50% of $20,000 slashed: $10,000 (pro-rata)

BURNED:
  → 20% of $20,000 slashed: $4,000
```

### 8.3 Complete Financial Flow Diagram

```
                    OPERATOR ($210,200 total outflow)
                    ║
          ┌─────────╬──────────┬──────────┬──────────┐
          ▼         ▼          ▼          ▼          ▼
     ┌─────────┐ ┌──────┐ ┌────────┐ ┌────────┐ ┌─────┐
     │Reserve  │ │Bond  │ │Fee     │ │Insur.  │ │Gas  │
     │$150,000 │ │$5,000│ │Escrow  │ │Premium │ │$200 │
     │         │ │      │ │$40,000 │ │$15,000 │ │     │
     └────┬────┘ └──┬───┘ └───┬────┘ └────┬───┘ └──┬──┘
          │         │         │            │        │
          │ LOCKED  │ LOCKED  │ ESCROWED   │ SPENT  │ SPENT
          │         │         │            │        │
     ┌────┴─────────┴────┐    │       ┌────┴───┐   │
     │                   │    │       │Insurance│   │
     │  On clean expiry: │    │       │Provider │   │
     │  ← returned to    │    │       │         │   │
     │    operator        │    │       │ Pays    │   │
     │                   │    │       │ claims  │   │
     │  On challenge:    │    │       │ if loss │   │
     │  → slash/hold     │    │       │ occurs  │   │
     │                   │    │       └─────────┘   │
     └───────────────────┘    │                     │
                              │                     │
                         ┌────┴────┐           ┌────┴────┐
                         │         │           │         │
                         │ On clean│           │Validator│
                         │ expiry: │           │Nodes    │
                         │ → pay   │           │(block-  │
                         │ auditor │           │ chain)  │
                         │         │           │         │
                         │ On      │           └─────────┘
                         │challenge│
                         │ → clawbk│
                         └─────────┘
```

---

*This document maps every financial flow in the CCP ecosystem — who pays, who receives, under what conditions, and why. The core principle: CCP as a protocol extracts zero rent; all costs flow between ecosystem participants as payment for real services (auditing, insurance, monitoring) or as committed capital (reserves, bonds, stakes).*
