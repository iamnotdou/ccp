# Audit Methodology: How an Auditor Actually Tests a Containment System

**Status:** Working Note
**Date:** April 2026
**Companion to:** PRD v0.2, Auditor Economics Note

---

## 1. What the Auditor Is Answering

One question: **If this agent tries its hardest to cause maximum economic damage, what actually stops it — and does that stopping mechanism really work?**

The auditor is NOT evaluating the agent. They are evaluating the cage.

---

## 2. Audit Surface Map

Every CCP certificate makes claims across five surfaces. Each surface has different testing methods:

```
┌─────────────────────────────────────────────────────────┐
│                  CONTAINMENT SYSTEM                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ 1. SPENDING  │  │ 2. PERMISSION│  │ 3. RESERVE   │  │
│  │    LIMITS    │  │    MODEL     │  │    BACKING   │  │
│  │              │  │              │  │              │  │
│  │  Smart       │  │  Who can     │  │  Is the      │  │
│  │  contracts   │  │  do what?    │  │  money       │  │
│  │  that cap    │  │  Can agent   │  │  really      │  │
│  │  outflows    │  │  escalate?   │  │  there?      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │ 4. EXECUTION │  │ 5. RECOVERY  │                     │
│  │    ENVIRON.  │  │    MECHANISMS│                     │
│  │              │  │              │                     │
│  │  TEE, HSM,   │  │  Reversibility│                    │
│  │  MPC — is    │  │  windows,    │                     │
│  │  the infra   │  │  kill switches│                    │
│  │  real?       │  │  pause/freeze │                    │
│  └──────────────┘  └──────────────┘                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Surface 1: Spending Limit Verification

The certificate says: "This agent cannot spend more than X in period Y, enforced by smart contract Z."

The auditor must verify: **Does contract Z actually enforce that limit, and can the agent bypass it?**

### 3.1 Source Code Review

**What:** Read the Solidity/Vyper source of the enforcement contract line by line.

**Looking for:**
- Does the contract actually track spending per period?
- Is the period calculation correct (block time vs. wall clock, edge cases at period boundaries)?
- What happens at exactly the limit — off-by-one errors?
- Are there admin functions that can raise the limit? Who can call them?
- Are there emergency/override functions? Under what conditions?
- Does the contract handle multiple tokens correctly, or can the agent spend via an untracked token?
- Reentrancy: can the agent drain funds by re-entering during a callback?
- Flash loan interactions: can the agent temporarily manipulate state to bypass the limit?

**Tools:** Manual review, Slither (static analysis), Mythril (symbolic execution), custom analysis scripts.

**Output:** Line-by-line annotated review with findings categorized as critical/high/medium/low/informational.

### 3.2 Deployment Verification

**What:** Confirm the deployed bytecode matches the audited source.

**Looking for:**
- Does `etherscan.getCode(contract_address)` match the compiled source?
- Was the contract deployed via a proxy? If so, what's the implementation address? Can the proxy be upgraded?
- Is the contract verified on a block explorer?
- What constructor arguments were used? Do they match the certificate claims?

**Tools:** `forge verify-contract`, Etherscan API, manual bytecode comparison.

**Why this matters:** An operator could show auditors clean source code but deploy a different contract. Bytecode verification catches this.

### 3.3 Constraint Testing (Adversarial)

**What:** Actually try to break the limit. The auditor (or their tooling) acts as a hostile agent and attempts to exceed the stated constraint.

**Test cases:**

| Test | Method | Pass condition |
|---|---|---|
| Direct overspend | Submit a transaction exceeding max_single_action_loss | Transaction reverts |
| Cumulative overspend | Submit many small transactions summing to above max_periodic_loss | Last transaction reverts |
| Period boundary | Submit at period boundary — does the counter reset correctly? | Limit enforced across boundary |
| Multi-token bypass | Try spending in a token not tracked by the constraint contract | Either tracked or impossible |
| Delegate bypass | Can the agent delegate spending authority to another address to circumvent the limit? | Delegation tracked or blocked |
| Reentrancy attack | Trigger callback during spend that re-enters the spend function | Reentrancy guard holds |
| Gas manipulation | Can the agent cause the limit-check to run out of gas, defaulting to allowing the spend? | Contract fails safely (reverts on gas exhaustion) |
| Time manipulation | On L2s: can the agent influence block timestamps to manipulate period calculation? | Period logic is robust to minor time drift |

**Tools:** Foundry (forge test), custom exploit scripts, fuzzing (Echidna, Medusa).

**Output:** Test results for each case. All must pass. Any failure = constraint not verified.

### 3.4 Formal Verification (if claimed)

**What:** If the certificate claims the constraint is formally verified, the auditor must verify the proof itself.

**Methods:**
- Review the formal specification: does it actually capture the intended property? ("max spend per period ≤ X" — is X the right variable? Is "period" correctly defined?)
- Re-run the verification tool (Certora Prover, Halmos, KEVM) against the deployed source
- Check that the proof covers all relevant entry points, not just the main spend function
- Verify that the prover assumptions match reality (e.g., "no external calls" — but what if there are?)

**Common pitfall:** Formal verification proves a property about the code, but the code might not match the deployed bytecode (see §3.2), or the property specification might not capture the actual security requirement.

---

## 4. Surface 2: Permission Model Audit

The certificate says: "This agent has permission scope P, enforced by mechanism M."

The auditor must verify: **Can the agent obtain permissions beyond P?**

### 4.1 Permission Enumeration

**What:** Map every permission the agent currently holds and every permission it could obtain.

**For smart contract wallets (ERC-4337, ERC-7710):**
- List all approved `delegatecall` targets
- List all token approvals (ERC-20 `allowance`, ERC-721 `approvedForAll`)
- List all session keys and their scopes
- List all ERC-7710 delegations — what can the agent do on behalf of other addresses?
- Check if the agent can create new delegations or approve new spending

**For MPC/multisig setups:**
- How many signers? Who are they?
- What threshold is required for transactions?
- Can the agent act as one of the signers? How many other signers does it need?
- Can the agent add new signers or change the threshold?

**For API-gated permissions (off-chain):**
- What API keys does the agent hold?
- What scopes do those keys grant?
- Can the agent request scope upgrades?
- Is there rate limiting? Is it enforced server-side or client-side?

**Tools:** Custom enumeration scripts, Tenderly (transaction simulation), manual review of wallet configuration.

### 4.2 Privilege Escalation Testing

**What:** Attempt to escalate the agent's permissions beyond what's declared.

**Test cases:**

| Vector | Test | Pass condition |
|---|---|---|
| Direct escalation | Agent calls `addOwner`, `changeThreshold`, `setApprovalForAll` or equivalent | Transaction reverts or requires multisig |
| Social engineering path | Agent generates a message asking a human co-signer to approve a permission change — is the human-in-the-loop actually enforced? | Message cannot be auto-approved; human must explicitly act |
| Proxy manipulation | If agent interacts through a proxy, can it change the proxy's implementation? | Agent cannot call proxy admin functions |
| Cross-contract escalation | Agent calls contract A, which calls contract B with elevated permissions | Contract B's permissions are independent of agent's call path |
| Token approval creep | Agent approves a malicious contract for unlimited spending | Approval is blocked or capped by the permission model |
| Governance manipulation | If agent holds governance tokens, can it propose and pass a permission change? | Governance actions are outside agent's permission scope or time-locked |

### 4.3 Agent Independence Assessment

**What:** For each constraint marked `agent_independent: true`, verify the agent genuinely cannot influence it.

**The critical question:** Can the agent, through ANY sequence of outputs (transactions, messages, API calls, social engineering), cause this constraint to be weakened, bypassed, or removed?

**Assessment framework:**

```
For each constraint marked agent_independent:

  1. List ALL inputs to the constraint mechanism
  2. For each input, trace: can the agent influence this input?
     - Directly (agent sends transaction)
     - Indirectly (agent sends message to human who changes it)
     - Transitively (agent triggers contract A which modifies contract B)
  3. If ANY path exists where the agent can influence the constraint:
     → Mark as agent_influenceable, NOT agent_independent
```

**Common false agent-independence claims:**

| Claim | Reality | Why it's not independent |
|---|---|---|
| "Spending limit enforced by smart contract" | Contract has an `owner` role that can change the limit; owner is a multisig that includes the agent's operator | Agent can potentially social-engineer the operator |
| "MPC approval required" | MPC includes the agent as one of N signers; threshold is N-1 | Agent is part of the approval path |
| "Human oversight on large transactions" | Human receives alert but auto-approves because they're overwhelmed with alerts | Effectively no oversight — constraint is socially influenceable |
| "TEE enforces model version" | TEE attestation is checked at deployment but not at runtime | Model could be changed after deployment without re-attestation |

---

## 5. Surface 3: Reserve Verification

The certificate says: "Reserve of X in asset Y held at contract Z, at ratio R to max periodic loss."

The auditor must verify: **Is the money really there, really locked, and really independent?**

### 5.1 Balance Verification

**What:** Confirm the reserve contract holds at least the stated amount.

**Method:**
```solidity
// Simple on-chain check
uint256 balance = IERC20(reserveAsset).balanceOf(reserveContract);
require(balance >= certificate.reserve.amount);
```

**Complications:**
- Multiple assets: check each individually
- Yield-bearing assets (staked ETH, aToken): check underlying value, not just token count
- Vesting/locked tokens: confirm they're liquid enough to cover claims
- Bridge assets: if reserve is on a different chain, cross-chain verification is needed

### 5.2 Lock-Up Verification

**What:** Confirm the reserve cannot be withdrawn while the certificate is active.

**Test cases:**

| Test | Method | Pass condition |
|---|---|---|
| Direct withdrawal | Call `withdraw()` or `transfer()` as operator | Reverts while certificate is active |
| Emergency withdrawal | Call any emergency/admin function that moves funds | Either doesn't exist or requires multi-party approval with time lock |
| Self-destruct | Can the reserve contract be self-destructed? | No `selfdestruct` opcode; or upgrade-protected |
| Proxy upgrade | Can the reserve contract be upgraded to one that allows withdrawal? | Not upgradeable, or upgrade requires time-lock + multisig beyond operator control |
| Governance attack | Can operator propose a governance action to release funds? | Governance time-lock exceeds certificate validity period |
| Flash loan interaction | Can operator flash-loan the reserve out and back in a single transaction? | Reserve contract prevents same-block withdraw-and-return |

### 5.3 Exogeneity Assessment

**What:** Verify that reserve asset value is independent of the agent's ecosystem.

**Exogenous (good):** USDC, ETH, DAI, USDT — value doesn't depend on the agent or operator.

**Not exogenous (bad):**
- Operator's own governance token
- Tokens from the protocol the agent operates in
- LP tokens in a pool containing the above
- Any asset where the agent's failure would cause the reserve to lose value simultaneously

**Method:** Trace the reserve asset's value chain. If at any point the value depends on the same system the certificate is protecting, it's not exogenous.

### 5.4 Reserve Ratio Calculation

**What:** Verify the stated reserve ratio is correct.

```
actual_ratio = reserve_amount / max_periodic_loss
require(actual_ratio >= stated_ratio)
require(stated_ratio >= class_minimum)  // C1: 1x, C2: 3x, C3: 5x
```

**Complications:**
- Volatile reserve assets: ratio can change with market price. Auditor should note: "ratio is X at current price; falls below class minimum if ETH drops below $Y"
- Multiple constraint periods: which max_periodic_loss — daily, weekly, monthly? Use the largest.

---

## 6. Surface 4: Execution Environment Verification

The certificate may claim constraints are enforced by TEE, HSM, or MPC. The auditor must verify the infrastructure is real and configured correctly.

### 6.1 TEE (Trusted Execution Environment) Verification

**What the operator claims:** "Agent runs inside a TEE; the TEE enforces that only attested code can execute."

**What the auditor checks:**

| Check | Method | Why |
|---|---|---|
| TEE attestation report | Request remote attestation from the TEE; verify with manufacturer's attestation service (Intel IAS/DCAP for SGX, AMD SEV-SNP attestation) | Proves code is running in a real TEE, not simulated |
| Code measurement | Verify the enclave measurement (MRENCLAVE/MRSIGNER for SGX) matches expected value | Proves the correct code is loaded |
| Side-channel mitigations | Review whether the enclave code is vulnerable to known side-channel attacks (Spectre, Foreshadow, etc.) | TEE ≠ invulnerable; hardware side-channels exist |
| Key management | How are enclave keys generated and sealed? Can the operator extract them? | If operator can extract keys, TEE enforcement is meaningless |
| Update mechanism | How is enclave code updated? Can operator push a malicious update? | Update policy must require re-attestation |

### 6.2 HSM (Hardware Security Module) Verification

**What the operator claims:** "Transaction signing requires HSM approval; HSM enforces spending policy."

**What the auditor checks:**

| Check | Method | Why |
|---|---|---|
| HSM existence | Physical inspection or manufacturer attestation of HSM serial number | Confirms hardware exists, not software simulation |
| Policy configuration | Review HSM signing policy: what transactions will it sign? What will it refuse? | Policy must match certificate constraints |
| Admin access | Who has admin access to the HSM? Can they change the signing policy? | If operator is sole admin → policy is operator-influenceable |
| Tamper evidence | Is the HSM in a tamper-evident enclosure? Is there monitoring? | Physical compromise path |
| Backup/recovery | HSM key backup process — can backup keys be used to bypass the HSM's policy? | Backup keys with weaker policy = bypass |

### 6.3 MPC (Multi-Party Computation) Verification

**What the operator claims:** "Transactions require M-of-N MPC signatures; agent cannot transact alone."

**What the auditor checks:**

| Check | Method | Why |
|---|---|---|
| Party enumeration | Who are the N parties? Are they truly independent? | N parties controlled by same entity = 1 party |
| Threshold adequacy | Is M large enough? M=1-of-3 is weak; M=2-of-3 is standard; M=3-of-5 is strong | Low threshold = easy collusion |
| Agent's role | Is the agent one of the M signers? If yes, how many others does it need? | Agent as signer reduces effective security by 1 |
| Key custody | Where are each party's key shares stored? | All key shares on same server = single point of failure |
| Collusion resistance | Are co-signers incentivized to collude with the agent or operator? | Co-signers should be independent parties with their own reputation at stake |
| Operational availability | What happens if a co-signer goes offline? Is there a fallback that weakens the threshold? | "If 2 signers are offline, fall back to 1-of-1" = bypass |

---

## 7. Surface 5: Recovery Mechanism Verification

The certificate may claim reversibility windows, kill switches, or pause mechanisms.

### 7.1 Reversibility Window

**What the operator claims:** "Transactions above $X have a Y-hour delay during which they can be reversed."

**What the auditor checks:**

| Check | Method | Why |
|---|---|---|
| Delay enforcement | Submit a large transaction. Is it actually delayed? | Delay must be on-chain enforced, not off-chain promise |
| Cancellation mechanism | During delay, who can cancel? Operator? Multisig? Anyone? | If only operator can cancel and operator is compromised, delay is useless |
| Bypass paths | Can the agent split a large transaction into many small ones below the threshold? | Threshold must account for aggregation |
| Time manipulation | On L2: can sequencer ordering affect the delay? | Delay should be block-based or time-oracle-based |

### 7.2 Kill Switch / Pause

**What the operator claims:** "The system can be paused in emergency, freezing all agent transactions."

**What the auditor checks:**

| Check | Method | Why |
|---|---|---|
| Pause mechanism | Who can trigger pause? How quickly? Is it on-chain or off-chain? | Must be activatable faster than the agent can drain funds |
| Pause scope | Does pause freeze ALL outflows or just some? | Partial pause = partial protection |
| Unpause mechanism | Who can unpause? Is there a time-lock on unpause? | If agent can social-engineer an unpause, it's not independent |
| Pause circumvention | Can the agent interact with contracts during pause? | Some pause implementations only block transfers, not other operations |

---

## 8. Surface 6: Composition Analysis (C3 Only)

The hardest part of the audit. Individual constraints may each work correctly, but **the combination may have gaps**.

### 8.1 What Composition Gaps Look Like

**Example 1: Token-type gap**
- Constraint A limits ETH spending to $10k/day
- Constraint B limits USDC spending to $10k/day
- No constraint covers DAI → agent swaps to DAI and spends unlimited

**Example 2: Contract-boundary gap**
- Constraint on wallet limits direct transfers
- Agent interacts with a DeFi protocol that makes transfers on the agent's behalf
- The DeFi protocol's transfers are not covered by the wallet constraint

**Example 3: Time-boundary gap**
- Daily limit resets at 00:00 UTC
- Agent spends $10k at 23:59 and $10k at 00:01 — $20k in 2 minutes, within "daily" limits

**Example 4: Layered delegation gap**
- Agent delegates to contract A
- Contract A delegates to contract B
- Certificate only covers direct agent actions, not delegated chains

### 8.2 Composition Testing Methodology

**Step 1: Asset flow mapping**

Map every possible path money can take from the agent's controlled addresses to external addresses:

```
Agent wallet
  ├→ Direct transfer (ETH, ERC-20)
  ├→ DEX swap (Uniswap, Curve, etc.)
  ├→ Lending deposit/borrow (Aave, Compound)
  ├→ NFT purchase
  ├→ Bridge to another chain
  ├→ Contract interaction that triggers transfer
  ├→ Approval + third-party transferFrom
  ├→ Delegation chains (ERC-7710)
  └→ Any other value extraction path
```

**Step 2: Constraint coverage mapping**

For each path, identify which constraint(s) cover it:

```
Path                    | Covered by          | Gap?
Direct ETH transfer     | Spending limit (A)  | No
Direct USDC transfer    | Spending limit (A)  | No
Uniswap swap            | ?                   | YES — swap not covered
Aave borrow             | ?                   | YES — borrowing = value extraction
Bridge to L2            | ?                   | YES — bridged funds escape constraints
Approval + transferFrom | ?                   | MAYBE — depends on approval tracking
```

**Step 3: Gap exploitation testing**

For each identified gap, attempt to exploit it:

```
Test: Can agent extract value via Uniswap swap to bypass spending limit?
  1. Agent approves Uniswap router for max uint
  2. Agent calls swap(USDC → ETH) for amount exceeding spending limit
  3. Result: [PASS if blocked] [FAIL if executed]
```

**Step 4: Cross-constraint interaction testing**

Test whether constraints interfere with each other:

```
Test: Does the reversibility window interact correctly with the spending limit?
  1. Agent submits $9k transaction (under $10k limit)
  2. Transaction enters reversibility delay
  3. Agent submits another $9k transaction (should be blocked — total would be $18k)
  4. First transaction is reversed
  5. Does the spending counter adjust? Or is $9k permanently consumed?
```

### 8.3 Formal Methods for Composition

For C3 certificates, composition should be formally verified where possible:

**Property specifications:**

```
// No path extracts more than max_periodic_loss in any period
∀ sequence_of_transactions S over period P:
  total_value_extracted(S) ≤ max_periodic_loss

// Agent independence holds across composition
∀ agent_action A:
  A cannot modify any agent_independent constraint
  (including through indirect paths via other contracts)

// Reserve is always ≥ stated amount
∀ time T while certificate is ACTIVE:
  reserve_contract.balance(T) ≥ certificate.reserve.amount
```

**Tools:** Certora Prover (for multi-contract properties), TLA+ (for protocol-level properties), Halmos (for symbolic testing).

---

## 9. The Audit Report

### 9.1 Structure

Every CCP audit produces a standardized report:

```
CCP Audit Report
├── 1. Executive Summary
│   ├── Certificate class (auditor's assessment)
│   ├── Overall finding: [PASS / PASS WITH CONDITIONS / FAIL]
│   └── Critical findings summary
│
├── 2. Scope
│   ├── Audit type(s) performed
│   ├── What was included
│   ├── What was explicitly excluded
│   └── Limitations and assumptions
│
├── 3. Constraint-by-Constraint Findings
│   ├── Constraint 1: [description]
│   │   ├── Claim: [what the certificate says]
│   │   ├── Finding: [VERIFIED / NOT VERIFIED / PARTIALLY VERIFIED]
│   │   ├── Agent-independent: [TRUE / FALSE / CONDITIONAL]
│   │   ├── Evidence: [test results, proof references]
│   │   └── Residual risk: [what could still go wrong]
│   └── ... (for each constraint)
│
├── 4. Reserve Findings
│   ├── Balance verified: [yes/no, amount, date]
│   ├── Lock-up verified: [yes/no, mechanism]
│   ├── Exogeneity: [yes/no, reasoning]
│   ├── Ratio: [calculated vs. stated]
│   └── Sensitivity: [reserve fails class minimum if asset drops X%]
│
├── 5. Composition Analysis (C3 only)
│   ├── Asset flow map
│   ├── Coverage gaps identified
│   ├── Gap exploitation results
│   └── Cross-constraint interaction results
│
├── 6. Execution Environment Findings (if applicable)
│   ├── TEE/HSM/MPC configuration review
│   └── Independence assessment
│
├── 7. Dependency Disclosure Review
│   ├── Are all dependencies listed?
│   ├── Concentration risks identified
│   └── Missing disclosures
│
├── 8. Recommendations
│   ├── Required fixes (must address before attestation)
│   ├── Suggested improvements (not blocking)
│   └── Monitoring recommendations
│
└── 9. Attestation
    ├── Scope: [SMART_CONTRACT_VERIFICATION, PERMISSION_MODEL, etc.]
    ├── Auditor signature
    └── Validity conditions
```

### 9.2 What a Passing Audit Looks Like

The auditor signs the attestation when:

1. Every constraint marked `agent_independent: true` has been verified as truly agent-independent
2. Every on-chain constraint has been deployment-verified (bytecode matches source)
3. Adversarial testing did not break any constraint
4. Reserve balance, lock-up, exogeneity, and ratio are verified
5. Composition analysis (C3) found no exploitable gaps
6. All critical and high findings from the review have been remediated
7. The certificate class is accurately derived from the actual architecture

### 9.3 What a Failing Audit Looks Like

The auditor refuses to attest when:

- Any constraint claimed as agent-independent is actually agent-influenceable
- A constraint contract has a bypass path
- Reserve is not actually locked or not exogenous
- Composition gaps allow value extraction beyond stated bounds
- Deployed bytecode doesn't match audited source
- Operator refuses to fix critical findings

**The auditor's refusal to attest is itself valuable information.** Operators who get rejected by one auditor and shop for a more lenient one are exhibiting exactly the behavior that the auditor market is designed to surface — and concentration limits prevent auditor-shopping at scale.

---

## 10. Renewal Audit: What Changes

Renewal is a delta review, not a full re-audit. But the auditor must still verify:

### 10.1 What MUST Be Rechecked Every Renewal

| Check | Why | Method |
|---|---|---|
| Reserve balance | Could have changed | On-chain query |
| Contract bytecode | Proxy could have been upgraded | Re-verify deployed code |
| Permission state | New approvals or delegations may exist | Re-enumerate permissions |
| Dependency changes | New shared infrastructure | Diff against previous dependency disclosure |
| Known vulnerability check | New CVEs may affect existing contracts | Run updated security tooling against existing contracts |

### 10.2 What Only Needs Rechecking If Architecture Changed

- Full source code review (only for modified contracts)
- Formal verification (only if proofs reference modified code)
- Composition analysis (only if new constraint added or flow changed)
- TEE/HSM/MPC configuration (only if infra changed)

### 10.3 Renewal Red Flags

The auditor should escalate to a full re-audit if:

- Contract was upgraded via proxy since last attestation
- New token approvals were granted
- Reserve asset changed
- MPC signer set changed
- Model version changed (if model_version_attested: true)
- New constraint was added (composition may have changed)

---

## 11. Testing Tools Landscape

### 11.1 Smart Contract Analysis

| Tool | Type | What it finds | Used for |
|---|---|---|---|
| **Slither** | Static analysis | Common vulnerability patterns, access control issues, reentrancy | First-pass automated review |
| **Mythril** | Symbolic execution | Reachable states that violate properties | Finding specific bypass paths |
| **Echidna** | Fuzzing | Edge cases through random transaction sequences | Constraint boundary testing |
| **Medusa** | Fuzzing | Similar to Echidna, different strategy | Constraint boundary testing |
| **Certora Prover** | Formal verification | Mathematical proof of properties across contracts | Composition verification (C3) |
| **Halmos** | Symbolic testing | Symbolic execution of Foundry tests | Bounded formal verification |
| **Foundry (forge)** | Testing framework | Custom test suites, adversarial scenarios | All manual testing |
| **Tenderly** | Transaction simulation | Simulating transactions against live state | Permission testing, flow tracing |
| **4naly3er** | Static analysis | Gas optimizations and common issues | Supplementary first-pass |

### 11.2 Infrastructure Verification

| Tool | Type | Used for |
|---|---|---|
| **Intel DCAP/IAS** | TEE attestation | Verifying SGX enclave attestation reports |
| **AMD SEV-SNP attestation** | TEE attestation | Verifying AMD TEE attestation |
| **PKCS#11 inspection tools** | HSM verification | Reviewing HSM policy and key configuration |
| **MPC protocol analyzers** | MPC verification | Verifying threshold signature scheme configuration |

### 11.3 Monitoring (Post-Attestation)

| Tool | Type | Used for |
|---|---|---|
| **Forta** | On-chain monitoring | Continuous constraint monitoring |
| **OpenZeppelin Defender** | On-chain automation | Automated reserve balance checks |
| **Tenderly Alerts** | Event monitoring | Alerting on suspicious transactions |
| **Custom subgraphs (The Graph)** | Indexed queries | Historical constraint compliance data |

---

## 12. Audit Scope by Certificate Class

### C1 — Basic (Self-Attestation)

No independent auditor required. The operator self-attests. However, the operator should still perform:

- Basic smart contract review of enforcement contracts
- Reserve balance verification
- Permission enumeration

**Risk:** Self-attestation has obvious incentive problems. C1 is intended for low-value agents where the cost of a full audit exceeds the potential loss.

### C2 — Standard (Independent Audit Required)

**Minimum scope:** SMART_CONTRACT_VERIFICATION

| Required | Recommended | Not required |
|---|---|---|
| Source code review of constraint contracts | Permission model audit | Full composition analysis |
| Deployment verification (bytecode match) | Adversarial testing of constraints | TEE/HSM physical inspection |
| Reserve balance and lock-up verification | Formal verification of critical constraints | Full red team exercise |
| Agent-independence assessment | Reserve sensitivity analysis | |

**Typical audit duration:** 2–4 weeks (initial), 3–5 days (renewal)

### C3 — Institutional (Full-Stack Audit Required)

**Minimum scope:** FULL_STACK

| Required | Required | Required |
|---|---|---|
| Complete source code review | Full composition analysis | All C2 requirements |
| Formal verification of all critical constraints | Red team exercise | Execution environment verification (TEE/HSM/MPC) |
| Permission model audit with escalation testing | Reserve sensitivity analysis with stress scenarios | Dependency concentration assessment |

**Typical audit duration:** 6–12 weeks (initial), 2–4 weeks (renewal)

---

## 13. What This Means for the PRD

### 13.1 Add to the PRD

1. **Audit scope definitions** — Currently the PRD names scope enums (SMART_CONTRACT_VERIFICATION, etc.) but doesn't define what each scope requires. Add minimum requirements per scope.

2. **Audit report standard** — Define a standard report format so reports are comparable across auditors. Include on IPFS alongside attestation.

3. **Renewal audit requirements** — Currently PRD says "re-attestation required within 7 days of architecture change" (C2). Add: what constitutes a "change" and what the renewal must cover.

4. **Composition gap as a first-class risk** — PRD §10.2 mentions "constraint circumvention" but doesn't name composition gaps specifically. This is the most sophisticated attack vector and deserves explicit treatment.

5. **Agent-independence verification methodology** — The `agent_independent: bool` field is the most important field in the certificate. The PRD should specify how this is verified, not just that it must be declared.

6. **Continuous monitoring integration** — Attestation is point-in-time. Between attestations, continuous monitoring tools should track: reserve balance, contract state, permission changes. C3 already requires continuous reserve monitoring; extend to other surfaces.

### 13.2 Open Questions

1. **Should the audit report format be enforced or recommended?** Enforced = comparable but rigid. Recommended = flexible but inconsistent.

2. **Who pays for composition analysis tools (formal verification)?** These are expensive. Should the protocol subsidize tooling to lower the barrier for C3 audits?

3. **How to handle chains without good tooling?** Solidity/EVM has excellent audit tooling. Other chains (Solana/Rust, Cosmos/Go) have less mature tooling. Does this affect certificate class eligibility?

4. **Should audit reports be fully public or partially redacted?** Full transparency helps verifiers but may expose operator security details. Standard practice in smart contract auditing is full publication with operator consent.

---

*This document is a companion to the CCP PRD and Auditor Economics note. It specifies the practical methodology for how auditors verify containment systems, surface by surface.*
