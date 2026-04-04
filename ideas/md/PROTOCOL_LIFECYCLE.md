# Protocol Lifecycle: How CCP Flows End-to-End

**Status:** Working Note
**Date:** April 2026
**Companion to:** PRD v0.2

---

## 1. The Full Lifecycle at a Glance

```
 OPERATOR                    AUDITOR                   REGISTRY                  VERIFIER
 ════════                    ═══════                   ════════                  ════════

 ┌─────────────┐
 │ 1. BUILD    │
 │ Containment │
 │ Architecture│
 └──────┬──────┘
        │
        ▼
 ┌─────────────┐
 │ 2. FUND     │
 │ Reserve +   │───────────────────────────┐
 │ Operator    │                           │
 │ Bond        │                           ▼
 └──────┬──────┘                    ┌─────────────┐
        │                           │ Reserve &   │
        │                           │ Bond locked │
        │                           │ on-chain    │
        │                           └─────────────┘
        ▼
 ┌─────────────┐     ┌─────────────┐
 │ 3. REQUEST  │────▶│ 4. AUDIT    │
 │ Audit       │     │ Containment │
 └─────────────┘     │ (2-12 weeks)│
                      └──────┬──────┘
                             │
                             ▼
                      ┌─────────────┐
                      │ 5. ATTEST   │
                      │ Sign cert   │
                      │ + stake     │───────────┐
                      └─────────────┘           │
        │                                       ▼
        ▼                                ┌─────────────┐
 ┌─────────────┐                         │ Auditor     │
 │ 6. COMPOSE  │                         │ stake locked│
 │ Certificate │                         │ on-chain    │
 └──────┬──────┘                         └─────────────┘
        │
        ▼
 ┌─────────────┐                  ┌─────────────┐
 │ 7. PUBLISH  │─────────────────▶│ 8. REGISTER │
 │ Sign & submit│                 │ Certificate │
 └─────────────┘                  │ on-chain    │
                                  └──────┬──────┘
                                         │
                                         │  Events emitted
                                         ▼
                                  ┌─────────────┐     ┌─────────────┐
                                  │ 9. ACTIVE   │────▶│ 10. VERIFY  │
                                  │ Certificate │     │ Counterparty│
                                  │ live        │     │ queries +   │
                                  └──────┬──────┘     │ evaluates   │
                                         │            └─────────────┘
                          ┌──────────────┼──────────────┐
                          ▼              ▼              ▼
                   ┌───────────┐  ┌───────────┐  ┌───────────┐
                   │ 11a.RENEW │  │ 11b.REVOKE│  │ 11c.EXPIRE│
                   └───────────┘  └───────────┘  └───────────┘
                          │              │              │
                          ▼              ▼              ▼
                   ┌─────────────────────────────────────────┐
                   │ 12. SETTLE — Release or slash stakes,   │
                   │     bonds, reserves, escrowed fees      │
                   └─────────────────────────────────────────┘
```

---

## 2. Stage-by-Stage Detail

### Stage 1: Build Containment Architecture

**Who:** Operator

**What happens:**
The operator designs and deploys the infrastructure that will contain their agent's economic impact. This is the real engineering work — CCP just certifies it.

**Concrete actions:**
- Deploy spending-limit smart contracts (e.g., max $10k/day outflow)
- Configure wallet permissions (ERC-4337 validation logic, ERC-7710 delegation scopes)
- Set up MPC signing (e.g., 2-of-3 with agent + operator + independent co-signer)
- Deploy reversibility time-lock contracts if applicable
- Configure TEE/HSM if used
- Decide which constraints are agent-independent vs. agent-influenceable

**Output:** A deployed, functioning containment stack on-chain (+ any off-chain components).

**Duration:** Days to months depending on complexity. Most of this work exists before CCP — operators already build this. CCP standardizes how to describe and verify it.

---

### Stage 2: Fund Reserve and Operator Bond

**Who:** Operator (and/or third-party reserve provider)

**What happens:**
Before requesting an audit, the operator locks economic backing on-chain. Two separate deposits:

**Reserve deposit:**
```
ReserveContract.deposit(
    amount: 150_000 USDC,          // 3x the $50k max periodic loss
    certificate_validity: 60 days,  // locked for at least this long
    beneficiary: registry_address   // only registry can authorize release
)
```

The reserve contract enforces:
- No withdrawal while any certificate referencing it has status ACTIVE
- Balance publicly queryable by anyone at any time
- Only exogenous assets accepted (USDC, ETH — not operator's own tokens)

**Operator bond deposit:**
```
BondContract.deposit(
    amount: 5_000 USDC,            // 10% of containment bound
    operator: operator_address,
    minimum_lock: 90 days           // survives certificate expiry for challenge grace
)
```

The bond is the operator's skin-in-the-game — slashed on revocation-for-cause or successful challenge.

**Output:** On-chain receipts (transaction hashes) for reserve and bond deposits. These become inputs to the certificate.

---

### Stage 3: Request Audit

**Who:** Operator → Auditor

**What happens:**
Operator engages an auditor and provides:
- All smart contract source code for constraint contracts
- Deployment addresses on the target chain
- Wallet configuration details
- Permission model documentation
- Reserve contract address and deposit proof
- Architecture diagram showing how components interact
- Any formal verification proofs already produced
- Access to TEE attestation endpoints, HSM configuration, MPC setup (as applicable)

**Auditor selection considerations:**
- Auditor must not be affiliated with operator (independence)
- For C2+: auditor must be a recognized independent attestor
- For C3: auditor should have FULL_STACK capability
- Concentration limits: if the verifier's policy says "max 20% same auditor," operator should check existing auditor distribution

**Output:** Engagement agreement. Audit begins.

---

### Stage 4: Audit Containment

**Who:** Auditor

**What happens:**
The auditor tests all claimed containment across the relevant surfaces (see AUDIT_METHODOLOGY.md for full detail):

**For C2 (minimum scope: SMART_CONTRACT_VERIFICATION):**
1. Source code review of all constraint contracts
2. Bytecode verification (deployed matches audited)
3. Adversarial constraint testing (try to break every limit)
4. Agent-independence assessment for each constraint
5. Reserve balance, lock-up, and exogeneity verification
6. Permission enumeration and escalation testing

**For C3 (scope: FULL_STACK):**
All C2 checks, plus:
7. Formal verification of all critical constraints
8. Composition analysis (gap testing across all constraint interactions)
9. Execution environment verification (TEE/HSM/MPC)
10. Red team exercise (simulate worst-case agent behavior)

**Possible outcomes:**
- **Pass** → Auditor proceeds to attestation
- **Pass with required fixes** → Operator remediates; auditor re-tests specific items
- **Fail** → Auditor refuses to attest; operator must rebuild and re-engage

**Duration:** C2: 2–4 weeks (initial). C3: 6–12 weeks (initial).

---

### Stage 5: Attest and Stake

**Who:** Auditor

**What happens:**
The auditor signs the certificate and locks their stake.

**Attestation:**
```
attestation = {
    auditor_id: auditor_address,
    auditor_name: "TrailOfBits",
    scope: SMART_CONTRACT_VERIFICATION,
    date: block.timestamp,
    report_uri: "ipfs://QmAuditReport...",
    signature: sign(certificate_hash, auditor_private_key)
}
```

**Stake deposit:**
```
StakingContract.stake(
    auditor: auditor_address,
    certificate_hash: certificate_hash,
    amount: min(containment_bound * 0.03, 100_000 USDC),  // C2
    lock_until: certificate_expiry + challenge_grace_period
)
```

**Audit fee escrow (optional but recommended):**
```
FeeEscrow.deposit(
    payer: operator_address,
    payee: auditor_address,
    amount: audit_fee,
    release_condition: certificate_expiry + challenge_grace AND no_successful_challenge
)
```

**Output:** Signed attestation + stake locked on-chain + fee in escrow. Auditor sends attestation data back to operator.

---

### Stage 6: Compose Certificate

**Who:** Operator

**What happens:**
The operator assembles the full certificate from all components:

```
certificate = {
    // Identity
    version: "ccp-v0.2",
    certificate_id: keccak256(agent_id, operator_id, nonce),
    agent_id: 0xAgentAddress,
    operator_id: 0xOperatorAddress,
    chain_id: 8453,  // Base

    // Validity
    issued_at: block.timestamp,
    expires_at: block.timestamp + 60 days,
    status: ACTIVE,

    // Classification (derived, not declared)
    certificate_class: C2,  // computed from constraints + reserve + attestations

    // Constraints (from Stage 1)
    constraints: [
        {
            type: MAX_PERIODIC_LOSS,
            value: 50_000,
            denomination: "USDC",
            period: 86400,  // 1 day
            enforcement: SMART_CONTRACT,
            contract_address: 0xSpendingLimit,
            formally_verified: true,
            verification_proof_uri: "ipfs://QmProof...",
            agent_independent: true
        },
        {
            type: MAX_SINGLE_ACTION_LOSS,
            value: 10_000,
            denomination: "USDC",
            enforcement: SMART_CONTRACT,
            contract_address: 0xSpendingLimit,
            formally_verified: true,
            verification_proof_uri: "ipfs://QmProof...",
            agent_independent: true
        },
        {
            type: PERMISSION_SCOPE,
            value: "transfer_only",
            enforcement: MPC,
            agent_independent: true
        },
        {
            type: REVERSIBILITY_WINDOW,
            value: 3600,  // 1 hour for transactions > $5k
            denomination: "seconds",
            enforcement: SMART_CONTRACT,
            contract_address: 0xTimeLock,
            agent_independent: true
        }
    ],

    // Reserve (from Stage 2)
    reserve: {
        amount: 150_000,
        denomination: "USDC",
        contract_address: 0xReserveVault,
        reserve_type: ESCROW,
        reserve_ratio: 30000,  // 3x in basis points
        exogenous: true
    },

    // Dependencies
    dependencies: {
        enforcement_contracts: [0xSpendingLimit, 0xTimeLock],
        auditor_addresses: [0xTrailOfBits],
        model_provider: "anthropic",
        model_id: "claude-sonnet-4-6",
        shared_infrastructure: []
    },

    // Derived metrics
    containment_bound: 50_000,  // worst case with only agent-independent layers
    agent_independent_layer_count: 3,
    total_layer_count: 3,

    // Attestations (from Stage 5)
    attestations: [attestation_from_stage_5],

    // Operator metadata
    operator_metadata: {
        operator_name: "AgentCo",
        model_type: "claude-sonnet-4-6",
        model_version_attested: false
    },

    // Bond reference
    bond: {
        amount: 5_000,
        contract_address: 0xBondContract
    }
}
```

**Certificate class derivation:**
```
function deriveClass(cert):
    if cert.reserve_ratio >= 50000                    // 5x
       AND cert.agent_independent_layer_count >= 3
       AND cert.attestations.any(scope == FULL_STACK)
       AND cert.constraints.all_critical(formally_verified == true)
       AND cert.expires_at - cert.issued_at <= 30 days:
        return C3

    if cert.reserve_ratio >= 30000                    // 3x
       AND cert.agent_independent_layer_count >= 2
       AND cert.attestations.any(scope >= SMART_CONTRACT_VERIFICATION)
       AND cert.expires_at - cert.issued_at <= 60 days:
        return C2

    if cert.reserve_ratio >= 10000                    // 1x
       AND cert.agent_independent_layer_count >= 1
       AND cert.expires_at - cert.issued_at <= 90 days:
        return C1

    return UNCLASSIFIED  // does not meet minimum for any class
```

**Output:** Complete certificate object, ready for signing and publishing.

---

### Stage 7: Publish

**Who:** Operator

**What happens:**
Two transactions:

**Transaction 1: Upload full certificate to IPFS**
```
certificate_json = serialize(certificate)
ipfs_hash = ipfs.add(certificate_json)
// → ipfs://QmCertificate...
```

**Transaction 2: Register on-chain**
```
certificate_hash = keccak256(certificate_json)
operator_signature = sign(certificate_hash, operator_private_key)

CCPRegistry.publish(
    certificateHash: certificate_hash,
    agentId: agent_address,
    expiresAt: certificate.expires_at,
    ipfsUri: ipfs_hash,
    operatorSignature: operator_signature,
    attestorSignatures: [auditor_signature]
)
```

**What the registry does on publish:**
1. Verify operator signature
2. Verify all attestor signatures
3. Check no active certificate already exists for this agent (or revoke previous)
4. Store certificate hash → metadata mapping
5. Store agent address → certificate hash mapping
6. Emit `CertificatePublished` event

**Gas cost:** Target < 500k gas (~$0.50–$5 depending on chain and gas price).

---

### Stage 8: Certificate Goes Active

**Who:** Registry (automatic)

**What happens:**
The certificate is now live. The registry returns `isValid(certificateHash) == true`.

**What is now publicly queryable:**
- `getActiveCertificate(agentAddress)` → certificate hash
- `getCertificate(certificateHash)` → full data or IPFS pointer
- `isValid(certificateHash)` → bool
- Reserve balance via `IERC20(reserveAsset).balanceOf(reserveContract)`
- Auditor stake via `StakingContract.getStake(auditorAddress, certificateHash)`
- Operator bond via `BondContract.getBond(operatorAddress)`
- Concentration queries: `getCertificateCountByAuditor(auditorAddress)`

**Monitoring begins:**
- On-chain monitors (Forta, OZ Defender) watch reserve balance
- Challenge window is open — anyone can challenge with evidence
- For C3: continuous reserve monitoring active

---

### Stage 9–10: Verification (Counterparty Side)

See [TRANSACTION_INTEGRATION.md] for detailed transaction flow.

**Quick summary:**
1. Counterparty queries `getActiveCertificate(agentAddress)`
2. Fetches full certificate from IPFS
3. Validates signatures (operator + attestors)
4. Checks status (not expired, not revoked, not challenged)
5. Evaluates constraints against their policy template
6. Checks reserve adequacy
7. Checks dependency concentration
8. Decision: accept, reject, or request additional constraints

---

### Stage 11: Certificate Termination

Three paths:

#### 11a. Renewal (Happy Path)

**Trigger:** Certificate approaching expiry (operator should start renewal ~2 weeks before expiry).

**Flow:**
1. Operator engages auditor for delta review
2. Auditor performs renewal audit (cheaper — only checks changes + spot checks)
3. Auditor signs new attestation + stakes for new period
4. Operator composes new certificate (new certificate_id, new issued_at/expires_at)
5. Operator publishes new certificate (old one is revoked atomically)
6. Old auditor stake enters challenge grace period
7. Old reserve can be swapped if new reserve is funded (or same reserve continues)

**Key detail:** The old certificate is revoked at the moment the new one is published. There is no gap in coverage. The registry handles this atomically:

```
CCPRegistry.publishAndRevokePrevious(
    newCertificateHash,
    previousCertificateHash,
    ...
)
```

#### 11b. Revocation

**Trigger:** Operator decides to revoke (voluntary) or protocol forces revocation (for-cause).

**Voluntary revocation:**
- Operator calls `CCPRegistry.revoke(certificateHash)`
- Status → REVOKED
- Reserve enters release countdown (challenge grace period must pass)
- Bond enters release countdown
- Auditor stake enters challenge grace period

**For-cause revocation (triggered by successful challenge):**
- Status → REVOKED
- Bond is slashed (partial or full, depending on severity)
- Auditor stake is slashed if auditor attested the false claim
- Reserve remains locked (may be used to compensate affected verifiers)
- Operator address flagged on-chain

#### 11c. Expiry

**Trigger:** `block.timestamp > certificate.expires_at`

**What happens:**
- `isValid(certificateHash)` starts returning `false` automatically
- No transaction needed — expiry is checked at query time
- Challenge grace period begins (14–30 days)
- After grace period: reserve release eligible, bond release eligible, auditor stake release eligible

---

### Stage 12: Settlement

**Who:** Smart contracts (automatic)

**After challenge grace period passes with no successful challenge:**

```
// Reserve release
ReserveContract.release(operator_address)  // operator can withdraw

// Bond release
BondContract.release(operator_address)     // bond returned to operator

// Auditor stake release
StakingContract.release(auditor_address, certificate_hash)  // stake returned

// Fee escrow release
FeeEscrow.release(auditor_address)         // audit fee paid to auditor
```

**If a successful challenge occurred during grace period:**

```
// Bond slash
BondContract.slash(
    operator_address,
    slash_amount,
    distribution: {
        challenger: 30%,
        affected_verifiers: 50%,
        burn: 20%
    }
)

// Auditor stake slash (if auditor attested the false claim)
StakingContract.slash(
    auditor_address,
    certificate_hash,
    slash_amount,
    distribution: { challenger: 30%, verifiers: 50%, burn: 20% }
)

// Fee clawback
FeeEscrow.clawback(auditor_address)  // fee returned to operator or burned

// Reserve: NOT slashed (reserve is for covering agent losses, not punishing operator)
// Reserve release delayed until all claims resolved
```

---

## 3. Challenge Flow (Detailed)

Challenges can happen any time during certificate ACTIVE status or during the post-expiry grace period.

```
CHALLENGER                         REGISTRY                    ADJUDICATION
══════════                         ════════                    ════════════

┌───────────────┐
│ Discover       │
│ false claim    │
│ (monitoring,   │
│  research,     │
│  incident)     │
└───────┬───────┘
        │
        ▼
┌───────────────┐          ┌───────────────┐
│ Submit         │─────────▶│ Record         │
│ challenge      │          │ challenge      │
│ + evidence     │          │ on-chain       │
│ + challenge    │          └───────┬───────┘
│   bond         │                  │
└───────────────┘                  ▼
                            ┌───────────────┐
                            │ Certificate    │
                            │ status →       │
                            │ CHALLENGED     │
                            └───────┬───────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌───────────┐  ┌───────────┐  ┌───────────┐
             │ AUTO       │  │ EXPERT     │  │ INFO       │
             │ On-chain   │  │ PANEL      │  │ ONLY       │
             │ verifiable │  │ Semi-      │  │ Subjective │
             │            │  │ objective  │  │            │
             │ e.g.       │  │ e.g.       │  │ e.g.       │
             │ reserve    │  │ formal     │  │ audit      │
             │ balance <  │  │ verif.     │  │ thorough-  │
             │ stated     │  │ dispute    │  │ ness       │
             └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
                   │              │              │
                   ▼              ▼              ▼
            ┌───────────┐  ┌───────────┐  ┌───────────┐
            │ Contract   │  │ 3 senior  │  │ Published  │
            │ auto-      │  │ auditors  │  │ as flag.   │
            │ resolves   │  │ vote.     │  │ No slash.  │
            │ (1 block)  │  │ (7-14d)   │  │ Verifiers  │
            └─────┬─────┘  └─────┬─────┘  │ decide.    │
                  │              │         └───────────┘
                  ▼              ▼
           ┌─────────────────────────┐
           │  UPHELD → slash bonds   │
           │  + stakes; reward       │
           │  challenger; revoke     │
           │  certificate            │
           │                         │
           │  REJECTED → return      │
           │  challenge bond to      │
           │  challenger; restore    │
           │  certificate status     │
           └─────────────────────────┘
```

---

## 4. State Machine

```
                    publish()
                        │
                        ▼
    ┌──────────────────────────────────────┐
    │               ACTIVE                  │
    │                                       │
    │  isValid() → true                     │
    │  Verifiers can rely on it             │
    │  Challenges accepted                  │
    │  Monitoring active                    │
    └───┬──────────┬──────────┬────────────┘
        │          │          │
  revoke()    challenge()  block.timestamp
        │          │       > expires_at
        ▼          ▼          ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ REVOKED  │ │CHALLENGED│ │ EXPIRED  │
  │          │ │          │ │          │
  │ Terminal │ │ Pending  │ │ Terminal │
  │          │ │ resolut. │ │          │
  └──────────┘ └────┬─────┘ └──────────┘
                    │
              ┌─────┴──────┐
              ▼            ▼
        ┌──────────┐ ┌──────────┐
        │ REVOKED  │ │ ACTIVE   │
        │ (for     │ │ (chall.  │
        │  cause)  │ │ rejected)│
        └──────────┘ └──────────┘
```

Valid terminal states: REVOKED, EXPIRED, REVOKED_FOR_CAUSE
Transient state: CHALLENGED (must resolve to REVOKED_FOR_CAUSE or back to ACTIVE)

---

## 5. Timing Diagram (Typical C2 Certificate)

```
Day 0        Day 14       Day 21       Day 22       Day 82       Day 96
│            │            │            │            │            │
▼            ▼            ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────┐    ┌──────────────────────┐ ┌──────────┐
│ Operator │ │ Auditor  │ │Audit │    │  CERTIFICATE ACTIVE   │ │ Grace    │
│ builds + │ │ engaged  │ │done  │    │  (60 days)            │ │ period   │
│ funds    │ │ audit    │ │attest│    │                        │ │ (14 days)│
│ reserve  │ │ begins   │ │+stake│    │  Verifiers rely on it  │ │          │
│ + bond   │ │          │ │      │    │  Challenges accepted   │ │ Challenges│
│          │ │          │ │      │    │  Monitoring active     │ │ still ok │
└──────────┘ └──────────┘ └──┬───┘    └──────────┬─────────────┘ └────┬─────┘
                              │                    │                    │
                              │ Day 22: Publish    │ Day 82: Expires    │ Day 96:
                              │ on-chain           │ isValid → false    │ All stakes
                              │                    │                    │ released
                              │                    │
                              │            Day 68: Renewal audit starts
                              │            Day 80: New cert published
                              │                    Old cert revoked atomically
```

---

*This document specifies the complete lifecycle of a CCP certificate from containment architecture design through settlement. Every stage has concrete actions, smart contract interactions, and timing constraints.*
