# Transaction Integration: How CCP Works in an Actual Agent Transaction

**Status:** Working Note
**Date:** April 2026
**Companion to:** PRD v0.2

---

## 1. The Core Question

A document can describe schemas and game theory all day. But what actually happens when **Agent A wants to buy something from Merchant B**, and Merchant B wants to know if Agent A is safe to transact with?

This document walks through real transaction flows — step by step, message by message, contract call by contract call.

---

## 2. Scenario 1: Agent Pays Merchant via x402

**Context:** Agent A (an AI shopping agent) wants to purchase API access from Service B. Service B uses the x402 payment protocol (HTTP 402 + payment challenge-response).

### 2.1 The Flow

```
AGENT A                           SERVICE B                      CCP REGISTRY
(shopping agent)                  (API provider)                 (on-chain)
═══════════                       ═════════                      ════════════

  ┌──────────────┐
  │ 1. HTTP GET  │
  │ /api/data    │───────────────▶
  └──────────────┘                  ┌──────────────┐
                                    │ 2. HTTP 402  │
                              ◀─────│ Payment      │
                                    │ Required     │
                                    │              │
                                    │ Headers:     │
                                    │ X-Price:     │
                                    │  0.50 USDC   │
                                    │ X-CCP-Min:   │
                                    │  class=C1,   │
                                    │  max_loss≤   │
                                    │  $1000       │
                                    └──────────────┘

  ┌──────────────┐
  │ 3. Agent     │
  │ reads CCP    │
  │ requirements │
  │ from 402     │
  │ response     │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ 4. Agent     │
  │ includes     │
  │ cert hash    │
  │ in payment   │
  │ credential   │──────────────▶
  │              │                  ┌──────────────┐
  │ Headers:     │                  │ 5. Service   │
  │ X-Payment:   │                  │ verifies:    │
  │  [signed     │                  │              │
  │   USDC tx]   │                  │ a. Payment ✓ │
  │ X-CCP-Cert:  │                  │ b. CCP cert  │──────────────▶
  │  0xABC...    │                  │    ↓         │               │
  └──────────────┘                  └──────────────┘               │
                                                                    ▼
                                                            ┌──────────────┐
                                                            │ 6. Registry  │
                                                            │ query:       │
                                                            │              │
                                                            │ isValid(     │
                                                            │  0xABC)?    │
                                                            │ → true       │
                                                            │              │
                                                            │ getCert(     │
                                                            │  0xABC)     │
                                                            │ → full cert  │
                                                            └──────┬───────┘
                                                                   │
                              ┌──────────────┐                     │
                              │ 7. Service   │◀────────────────────┘
                              │ evaluates    │
                              │ policy:      │
                              │              │
                              │ class ≥ C1?  │
                              │  → yes ✓     │
                              │              │
                              │ max_loss ≤   │
                              │ $1000?       │
                              │  → $50k ✓    │
                              │              │
                              │ not expired? │
                              │  → valid ✓   │
                              │              │
                              │ not revoked? │
                              │  → clean ✓   │
                              └──────┬───────┘
                                     │
                              ┌──────┴───────┐
                              │ 8. HTTP 200  │
                              │ + API data   │
                        ◀─────│              │
                              └──────────────┘
```

### 2.2 What Each Step Does

**Step 1–2: Standard x402 flow.** Agent requests a resource. Server responds with 402 (Payment Required) plus pricing. **CCP addition:** The 402 response includes CCP minimum requirements in headers.

**Step 3: Agent self-checks.** The agent knows its own certificate hash. It checks whether its certificate meets the stated requirements. If not, it can:
- Abort the request
- Try a different service with lower requirements
- Request its operator to upgrade the certificate

**Step 4: Payment + certificate reference.** The agent signs a USDC payment and includes its certificate hash. This is a single HTTP request with both payment credential and CCP reference.

**Step 5–6: Server verification.** The server (or its backend) queries the CCP registry on-chain. This is a `view` call — no gas cost, instant response.

**Step 7: Policy evaluation.** The server runs its policy template against the certificate data. This is a local computation — no network call. The SDK does this in microseconds.

**Step 8: Accept or reject.** If the certificate meets the policy, the transaction proceeds. If not, the server returns an error explaining which requirement wasn't met.

### 2.3 Latency Impact

```
Standard x402 flow:           ~200ms (HTTP + payment verification)
CCP verification overhead:     ~50ms  (one on-chain view call + policy evaluation)
Total:                         ~250ms
```

The CCP check adds ~50ms of latency. For API calls, this is negligible. For high-frequency trading, the SDK can cache certificate data locally and re-verify periodically rather than on every call.

### 2.4 x402 Header Specification

```
# In 402 response (server → agent):
X-CCP-Required: true
X-CCP-Min-Class: C1
X-CCP-Max-Single-Loss: 1000 USDC
X-CCP-Min-Reserve-Ratio: 10000        # 1x in basis points
X-CCP-Min-AI-Layers: 1
X-CCP-Registry: 0x1234...5678          # registry contract address
X-CCP-Chain: 8453                       # chain ID

# In payment request (agent → server):
X-CCP-Certificate: 0xABCD...EF01       # certificate hash
X-CCP-Agent: 0x9876...5432             # agent address
```

---

## 3. Scenario 2: Agent-to-Agent Transaction (DeFi)

**Context:** Agent A wants to deposit USDC into a lending pool managed by Agent B (a DeFi protocol's agent). The lending pool requires CCP verification for depositors above $10k.

### 3.1 The Flow

```
AGENT A                    LENDING POOL               AGENT B                CCP REGISTRY
(depositor)                (smart contract)           (pool manager)         (on-chain)
═══════════                ════════════════           ═════════════          ════════════

  ┌──────────────┐
  │ 1. Call      │
  │ deposit(     │
  │  50000 USDC, │
  │  certHash    │
  │ )            │─────────▶
  └──────────────┘          ┌──────────────┐
                            │ 2. Contract  │
                            │ checks:      │
                            │              │
                            │ amount >     │
                            │ $10k?        │
                            │ → yes, need  │
                            │   CCP check  │──────────────────────────────▶
                            └──────────────┘                               │
                                                                           ▼
                                                                    ┌──────────────┐
                                                                    │ 3. Registry  │
                                                                    │              │
                                                                    │ isValid(     │
                                                                    │  certHash)?  │
                                                                    │ → true       │
                                                                    │              │
                                                                    │ getCert(     │
                                                                    │  certHash)   │
                                                                    │ → cert data  │
                                                                    └──────┬───────┘
                                                                           │
                            ┌──────────────┐                               │
                            │ 4. Contract  │◀──────────────────────────────┘
                            │ evaluates    │
                            │ on-chain:    │
                            │              │
                            │ class ≥ C2?  │
                            │ → check      │
                            │              │
                            │ reserve ≥ 3x?│
                            │ → check      │
                            │              │
                            │ not expired? │
                            │ → check      │
                            │              │
                            │ AI layers    │
                            │ ≥ 2?         │
                            │ → check      │
                            └──────┬───────┘
                                   │
                            ┌──────┴───────┐
                            │ 5. IF pass:  │
                            │ Accept       │
                            │ deposit      │
                            │              │
                            │ IF fail:     │
                            │ Revert with  │
                            │ reason code  │
                            └──────────────┘
```

### 3.2 On-Chain Verification (Solidity)

The lending pool contract integrates CCP verification directly:

```solidity
interface ICCPRegistry {
    function isValid(bytes32 certHash) external view returns (bool);
    function getCertificate(bytes32 certHash) external view returns (bytes memory);
}

interface ICCPVerifier {
    struct Policy {
        uint8 minClass;           // 1=C1, 2=C2, 3=C3
        uint256 minReserveRatio;  // basis points
        uint8 minAILayers;        // minimum agent-independent layers
        uint256 maxSingleLoss;    // maximum allowed single-action loss
    }

    function verify(
        bytes32 certHash,
        Policy memory policy
    ) external view returns (bool passed, uint8 failReason);
}

contract LendingPool {
    ICCPRegistry public ccpRegistry;
    ICCPVerifier public ccpVerifier;

    uint256 public constant CCP_THRESHOLD = 10_000e6; // $10k USDC

    ICCPVerifier.Policy public depositPolicy = ICCPVerifier.Policy({
        minClass: 2,              // C2 minimum
        minReserveRatio: 30000,   // 3x
        minAILayers: 2,
        maxSingleLoss: 100_000e6  // $100k
    });

    function deposit(uint256 amount, bytes32 certHash) external {
        if (amount > CCP_THRESHOLD) {
            require(ccpRegistry.isValid(certHash), "CCP: invalid certificate");

            (bool passed, uint8 reason) = ccpVerifier.verify(certHash, depositPolicy);
            require(passed, string(abi.encodePacked("CCP: policy fail #", reason)));
        }

        // ... proceed with deposit
    }
}
```

### 3.3 Gas Cost Analysis

```
CCP verification gas breakdown:
  isValid() call:           ~5,000 gas  (storage read + timestamp check)
  getCertificate() call:   ~20,000 gas  (storage read of certificate data)
  Policy evaluation:       ~10,000 gas  (comparisons and field extraction)
  ─────────────────────────────────────
  Total CCP overhead:      ~35,000 gas  (~$0.05-$0.50 depending on chain)

For comparison:
  Standard ERC-20 transfer:  ~65,000 gas
  Uniswap swap:            ~150,000 gas
  Aave deposit:            ~200,000 gas
```

CCP verification adds ~15-20% gas overhead to a typical DeFi transaction. For transactions above $10k, this is negligible.

---

## 4. Scenario 3: Marketplace Admission (Agent Registry)

**Context:** Agent A wants to register on a marketplace (e.g., agent-to-agent service marketplace). The marketplace uses ERC-8004 for agent identity and requires CCP certification for agents offering services above $500/transaction.

### 3.1 The Flow

```
AGENT A                    MARKETPLACE                 CCP REGISTRY        ERC-8004 REGISTRY
(service provider)         (admission gate)            (on-chain)          (on-chain)
═══════════                ═══════════════             ════════════         ═════════════════

  ┌──────────────┐
  │ 1. Request   │
  │ registration │
  │              │
  │ Includes:    │
  │ - agent ID   │
  │ - KYA JWT    │
  │ - CCP cert   │
  │   hash       │
  │ - service    │
  │   listing    │─────────▶
  └──────────────┘          ┌──────────────┐
                            │ 2. Verify    │
                            │ identity     │──────────────────────────────────────────▶
                            │ (ERC-8004)   │                                          │
                            └──────┬───────┘                                          ▼
                                   │                                          ┌──────────────┐
                                   │                                          │ 3. Identity  │
                                   │                                          │ check:       │
                                   │                                          │ registered,  │
                                   │                                          │ not banned   │
                            ┌──────┴───────┐                                  └──────┬───────┘
                            │ 4. Verify    │                                         │
                            │ containment  │◀────────────────────────────────────────┘
                            │ (CCP)        │──────────────────────▶
                            └──────────────┘                       │
                                                                   ▼
                                                            ┌──────────────┐
                                                            │ 5. CCP check │
                                                            │              │
                                                            │ Valid? ✓     │
                                                            │ Class ≥ C2? ✓│
                                                            │ Loss ≤ max? ✓│
                                                            │ Auditor not  │
                                                            │ >20% of      │
                                                            │ marketplace  │
                                                            │ agents? ✓    │
                                                            └──────┬───────┘
                                                                   │
                            ┌──────────────┐                       │
                            │ 6. Admission │◀──────────────────────┘
                            │ decision:    │
                            │              │
                            │ Identity ✓   │
                            │ Containment ✓│
                            │ Concentr. ✓  │
                            │              │
                            │ → ADMITTED   │
                            │              │
                            │ Tier:        │
                            │ C2 → Standard│
                            │ (max $10k/tx)│
                        ◀───│              │
                            └──────────────┘

  ┌──────────────┐
  │ 7. Agent     │
  │ listed on    │
  │ marketplace  │
  │ with CCP     │
  │ badge and    │
  │ tier limits  │
  └──────────────┘
```

### 4.2 Concentration Check (Critical for Marketplaces)

The marketplace doesn't just check the certificate — it checks whether admitting this agent would create dangerous concentration:

```typescript
async function checkConcentration(certHash: string, marketplace: Marketplace) {
  const cert = await registry.getCertificate(certHash);
  const auditor = cert.attestations[0].auditor_id;
  const enforcementContracts = cert.dependencies.enforcement_contracts;

  // Check auditor concentration
  const auditorCount = await registry.getCertificateCountByAuditor(auditor);
  const totalCerts = marketplace.activeCertificateCount;
  const auditorShare = auditorCount / totalCerts;

  if (auditorShare > 0.20) {
    return { pass: false, reason: "AUDITOR_CONCENTRATION_EXCEEDED" };
  }

  // Check enforcement contract concentration
  for (const contract of enforcementContracts) {
    const contractCount = await registry.getCertificateCountByContract(contract);
    const contractShare = contractCount / totalCerts;

    if (contractShare > 0.30) {
      return { pass: false, reason: "CONTRACT_CONCENTRATION_EXCEEDED" };
    }
  }

  return { pass: true };
}
```

**Why this matters:** If 50% of agents on a marketplace use the same spending-limit contract, a bug in that contract could compromise half the marketplace simultaneously. The concentration check prevents this.

---

## 5. Scenario 4: Wallet Delegation (ERC-7710)

**Context:** A human user wants to delegate spending authority to their AI agent via ERC-7710. The wallet provider requires CCP certification before allowing delegation above $100/day.

### 5.1 The Flow

```
HUMAN USER                 WALLET APP                  AGENT              CCP REGISTRY
═══════════                ══════════                  ═════              ════════════

  ┌──────────────┐
  │ 1. "Delegate │
  │ $500/day to  │
  │ my agent"    │─────────▶
  └──────────────┘          ┌──────────────┐
                            │ 2. Amount >  │
                            │ $100/day?    │
                            │ → yes        │
                            │              │
                            │ Check agent's│
                            │ CCP cert     │────────────────────────────────▶
                            └──────────────┘                                │
                                                                           ▼
                                                                    ┌──────────────┐
                                                                    │ 3. Verify    │
                                                                    │              │
                                                                    │ Valid? ✓     │
                                                                    │              │
                                                                    │ Max periodic │
                                                                    │ loss ≤       │
                                                                    │ delegation   │
                                                                    │ limit?       │
                                                                    │ ($500 ≤ cert │
                                                                    │  periodic    │
                                                                    │  loss) ✓     │
                                                                    │              │
                                                                    │ Permission   │
                                                                    │ scope matches│
                                                                    │ delegation?  │
                                                                    │ ✓            │
                                                                    │              │
                                                                    │ Reserve      │
                                                                    │ exogenous?   │
                                                                    │ ✓            │
                                                                    │              │
                                                                    │ ≥ 2 AI       │
                                                                    │ layers? ✓    │
                                                                    └──────┬───────┘
                                                                           │
                            ┌──────────────┐                               │
                            │ 4. Show user │◀──────────────────────────────┘
                            │ CCP summary: │
                            │              │
                            │ "This agent  │
                            │ has a C2     │
                            │ certificate: │
                            │              │
                            │ • Max loss:  │
                            │   $500/day   │
                            │ • Backed by  │
                            │   $1500 USDC │
                            │   reserve    │
                            │ • 2 hardware │
                            │   safety     │
                            │   layers     │
                            │ • Audited by │
                            │   TrailOfBits│
                            │ • Expires in │
                            │   45 days    │
                            │              │
                            │ [Approve]    │
                            │ [Deny]       │
                        ◀───│ [See full    │
                            │  cert]       │
                            └──────────────┘

  ┌──────────────┐
  │ 5. User      │
  │ approves     │─────────▶
  └──────────────┘          ┌──────────────┐
                            │ 6. Create    │
                            │ ERC-7710     │
                            │ delegation:  │
                            │              │
                            │ delegate:    │
                            │  agent_addr  │
                            │ scope:       │
                            │  transfer,   │
                            │  $500/day    │
                            │ condition:   │
                            │  CCP cert    │
                            │  must remain │
                            │  valid       │
                            └──────┬───────┘
                                   │
                                   │  On-chain delegation tx
                                   ▼
                            ┌──────────────┐
                            │ 7. Delegation│
                            │ active.      │
                            │              │
                            │ Agent can    │
                            │ spend up to  │
                            │ $500/day.    │
                            │              │
                            │ IF cert      │
                            │ expires or   │
                            │ revoked →    │
                            │ delegation   │
                            │ automatically│
                            │ paused.      │
                            └──────────────┘
```

### 5.2 Certificate-Conditional Delegation

The delegation is **bound to the certificate's validity**. If the certificate expires, is revoked, or is challenged, the delegation automatically pauses:

```solidity
contract CertificateConditionalDelegation {
    ICCPRegistry public ccpRegistry;

    struct Delegation {
        address agent;
        uint256 dailyLimit;
        bytes32 requiredCertHash;
        bool active;
    }

    mapping(address => Delegation) public delegations;

    modifier requiresValidCert(address agent) {
        Delegation memory d = delegations[agent];
        require(
            ccpRegistry.isValid(d.requiredCertHash),
            "CCP certificate no longer valid — delegation paused"
        );
        _;
    }

    function executeAsDelegate(
        address token,
        address to,
        uint256 amount
    ) external requiresValidCert(msg.sender) {
        // ... execute transfer within daily limit
    }
}
```

### 5.3 The UX: Risk Reduction Contribution Display

When the wallet shows the user the CCP summary (Step 4), it can include the **risk reduction contribution** breakdown:

```
┌─────────────────────────────────────────────┐
│  AGENT SAFETY CERTIFICATE (C2)              │
│                                             │
│  Max possible loss: $500/day                │
│  Backed by: $1,500 USDC reserve             │
│                                             │
│  What protects you:                         │
│  ██████████████████░░░░░░░░  Reserve   35%  │
│  ████████████████░░░░░░░░░░  Spend cap 30%  │
│  ██████████░░░░░░░░░░░░░░░░  MPC auth  20%  │
│  █████░░░░░░░░░░░░░░░░░░░░░  Time lock 10% │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░  Audit     5%  │
│                                             │
│  Audited by: Trail of Bits (Jan 2026)       │
│  Expires: May 15, 2026 (45 days)            │
│                                             │
│        [Approve Delegation]                 │
│        [Deny]                               │
│        [View Full Certificate →]            │
└─────────────────────────────────────────────┘
```

---

## 6. Scenario 5: Insurance-Gated High-Value Transaction

**Context:** Agent A wants to execute a $500k DeFi position. The protocol requires both CCP certification AND insurance coverage for transactions above $100k.

### 6.1 The Flow

```
AGENT A                  DEFI PROTOCOL             CCP REGISTRY         INSURANCE PROVIDER
═══════                  ═════════════             ════════════         ═══════════════════

  ┌──────────────┐
  │ 1. Request   │
  │ $500k swap   │
  │              │
  │ Includes:    │
  │ - CCP cert   │
  │ - Insurance  │
  │   policy ID  │─────────▶
  └──────────────┘          ┌──────────────┐
                            │ 2. Amount >  │
                            │ $100k?       │
                            │ → yes, need  │
                            │ CCP + insur. │
                            └──────┬───────┘
                                   │
                     ┌─────────────┴──────────────┐
                     ▼                            ▼
              ┌──────────────┐             ┌──────────────┐
              │ 3a. CCP      │             │ 3b. Insurance│
              │ verification │             │ verification │
              │              │             │              │
              │ Valid C3? ✓  │             │ Policy       │
              │ Reserve 5x?✓ │             │ active? ✓    │
              │ Full-stack   │             │ Coverage ≥   │
              │ audit? ✓     │             │ $500k? ✓     │
              │ Formal       │             │ Not          │
              │ verif? ✓     │             │ excluded? ✓  │
              └──────┬───────┘             └──────┬───────┘
                     │                            │
                     └─────────────┬──────────────┘
                                   ▼
                            ┌──────────────┐
                            │ 4. Both pass │
                            │ → Execute    │
                            │   swap with  │
                            │   elevated   │
                            │   limits     │
                            │              │
                            │ CCP bounds   │
                            │ max loss.    │
                            │ Insurance    │
                            │ covers       │
                            │ residual.    │
                            │ Protocol is  │
                            │ protected.   │
                            └──────────────┘
```

### 6.2 The Insurance Check

```typescript
interface InsuranceVerification {
  policy_id: string;
  agent_address: string;
  coverage_amount: bigint;
  coverage_asset: string;
  policy_active: boolean;
  certificate_hash: string;     // insurance policy references the CCP cert
  exclusions: string[];          // what's NOT covered
}

async function verifyInsurance(policyId: string, txAmount: bigint): Promise<boolean> {
  const policy = await insuranceProvider.getPolicy(policyId);

  return (
    policy.policy_active &&
    policy.coverage_amount >= txAmount &&
    !policy.exclusions.includes(transactionType) &&
    await ccpRegistry.isValid(policy.certificate_hash)  // insurance requires valid CCP
  );
}
```

**Key insight:** Insurance policies reference CCP certificates. If the certificate expires or is revoked, the insurance policy may also lapse. This creates a virtuous cycle: operators must maintain valid certificates to keep insurance, and must have insurance to access high-value transactions.

---

## 7. Scenario 6: Real-Time Monitoring and Automatic Response

**Context:** An on-chain monitoring bot detects that Agent A's reserve has dropped below the stated amount. The certificate should be flagged.

### 7.1 The Flow

```
MONITORING BOT              RESERVE CONTRACT           CCP REGISTRY
══════════════              ════════════════           ════════════

  ┌──────────────┐
  │ 1. Periodic  │
  │ check        │
  │ (every block │
  │  or every    │
  │  N minutes)  │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐          ┌──────────────┐
  │ 2. Query     │─────────▶│ 3. Return    │
  │ reserve      │          │ balance:     │
  │ balance      │          │ $120,000     │
  │              │◀─────────│              │
  └──────┬───────┘          │ (cert says   │
         │                  │  $150,000)   │
         │                  └──────────────┘
         ▼
  ┌──────────────┐
  │ 4. Balance < │
  │ stated       │
  │ amount!      │
  │              │
  │ Shortfall:   │
  │ $30,000      │
  │ (20%)        │
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐                          ┌──────────────┐
  │ 5. Submit    │─────────────────────────▶│ 6. Registry  │
  │ challenge:   │                          │ records      │
  │              │                          │ challenge:   │
  │ cert: 0xABC  │                          │              │
  │ evidence:    │                          │ Status →     │
  │  balance =   │                          │ CHALLENGED   │
  │  $120k at    │                          │              │
  │  block #N    │                          │ Auto-verify: │
  │ challenge    │                          │ balance <    │
  │ bond: $200   │                          │ stated?      │
  │              │                          │ → YES        │
  └──────────────┘                          │              │
                                            │ → SLASH      │
                                            │   operator   │
                                            │   bond       │
                                            │              │
                                            │ → REWARD     │
                                            │   challenger │
                                            │   (30%)      │
                                            └──────────────┘
```

### 7.2 Automated Challenge Resolution

Reserve balance challenges are the simplest case — fully automatable on-chain:

```solidity
contract CCPChallengeResolver {
    ICCPRegistry public registry;

    function challengeReserveShortfall(
        bytes32 certHash
    ) external payable {
        // Require challenge bond
        require(msg.value >= CHALLENGE_BOND, "Insufficient challenge bond");

        // Get certificate data
        CertificateData memory cert = registry.parseCertificate(certHash);

        // Check reserve balance on-chain
        uint256 actualBalance = IERC20(cert.reserve.denomination)
            .balanceOf(cert.reserve.contract_address);

        if (actualBalance < cert.reserve.amount) {
            // Challenge succeeds — reserve is below stated amount
            registry.flagCertificate(certHash, ChallengeType.RESERVE_SHORTFALL);

            // Slash operator bond
            bondContract.slash(
                cert.operator_id,
                certHash,
                SLASH_PERCENTAGE
            );

            // Reward challenger
            payable(msg.sender).transfer(msg.value); // return bond
            // + 30% of slash (handled by bond contract)
        } else {
            // Challenge fails — reserve is adequate
            // Forfeit challenge bond
            // (bond goes to protocol treasury or is burned)
        }
    }
}
```

---

## 8. SDK Integration Patterns

### 8.1 TypeScript SDK (Off-Chain Verification)

```typescript
import { CCPVerifier, PolicyTemplates } from '@ccp-protocol/sdk';

// Initialize verifier
const verifier = new CCPVerifier({
  registryAddress: '0x1234...5678',
  chainId: 8453,
  rpcUrl: 'https://mainnet.base.org',
  conventionVersion: '1.0',
});

// Quick check: is this agent safe to transact with?
const result = await verifier.verify(agentAddress, {
  template: PolicyTemplates.MERCHANT,
  overrides: {
    maxSingleLoss: 5000_000000n,  // $5k USDC (6 decimals)
  }
});

if (result.valid) {
  console.log(`Agent has valid ${result.certificateClass} certificate`);
  console.log(`Containment bound: $${result.containmentBound}`);
  console.log(`Reserve ratio: ${result.reserveRatio / 100}x`);
  // Proceed with transaction
} else {
  console.log(`Verification failed: ${result.failReasons.join(', ')}`);
  // Reject or request higher certification
}
```

### 8.2 Python SDK (Off-Chain Verification)

```python
from ccp_sdk import CCPVerifier, PolicyTemplates

verifier = CCPVerifier(
    registry_address="0x1234...5678",
    chain_id=8453,
    rpc_url="https://mainnet.base.org",
)

result = verifier.verify(
    agent_address="0xABCD...EF01",
    policy=PolicyTemplates.DEFI_PROTOCOL,
    overrides={"min_reserve_ratio": 40000},  # 4x
)

if result.valid:
    print(f"Certificate class: {result.certificate_class}")
    print(f"Containment bound: ${result.containment_bound:,.0f}")
    # Proceed
else:
    print(f"Failed: {result.fail_reasons}")
```

### 8.3 Solidity Library (On-Chain Verification)

```solidity
import { CCPLib } from "@ccp-protocol/contracts/CCPLib.sol";

contract MyProtocol {
    using CCPLib for ICCPRegistry;

    ICCPRegistry public registry;

    function doSomethingWithAgent(address agent, uint256 amount) external {
        // One-line CCP check
        require(
            registry.meetsPolicy(agent, CCPLib.Policy({
                minClass: 2,
                minReserveRatio: 30000,
                minAILayers: 2,
                maxSingleLoss: amount * 2
            })),
            "CCP: insufficient containment"
        );

        // ... business logic
    }
}
```

### 8.4 Agent SDK Integration (Agent-Side)

For the agent itself — how to include CCP in outgoing requests:

```typescript
import { CCPAgent } from '@ccp-protocol/agent-sdk';

const ccpAgent = new CCPAgent({
  certificateHash: '0xABCD...EF01',
  agentAddress: '0x9876...5432',
  privateKey: process.env.AGENT_KEY,
});

// When making an x402 payment
const paymentHeaders = ccpAgent.getPaymentHeaders({
  amount: 500_000000n,  // $0.50 USDC
  recipient: serviceAddress,
});
// Returns: { 'X-CCP-Certificate': '0xABCD...', 'X-CCP-Agent': '0x9876...' }

// When interacting with a smart contract that requires CCP
const tx = await ccpAgent.executeWithCert(
  lendingPool.address,
  lendingPool.interface.encodeFunctionData('deposit', [amount, ccpAgent.certHash])
);

// Self-check: does my cert meet a service's requirements?
const meetsReqs = ccpAgent.checkRequirements({
  minClass: 'C2',
  maxSingleLoss: 10000_000000n,
});
// Returns: { meets: true, certificate: {...}, gaps: [] }
// Or:      { meets: false, gaps: ['reserve_ratio_too_low'] }
```

---

## 9. Caching and Performance

### 9.1 Certificate Caching Strategy

On-chain queries are cheap but not free. For high-frequency verification:

```typescript
const verifier = new CCPVerifier({
  cache: {
    enabled: true,
    ttl: 300,              // cache certificate data for 5 minutes
    reserveCheckInterval: 60,  // re-check reserve balance every 60 seconds
    invalidateOnEvent: true,   // listen for CertificateRevoked/Challenged events
  }
});
```

**Cache invalidation triggers:**
- `CertificateRevoked` event → immediately invalidate
- `CertificateChallenged` event → immediately invalidate
- TTL expiry → re-fetch from chain
- Reserve balance check → periodic, configurable interval

### 9.2 Performance Targets

| Operation | Target latency | Method |
|---|---|---|
| Cached certificate verification | < 1ms | Local policy evaluation against cached data |
| Fresh certificate verification | < 100ms | On-chain view call + policy evaluation |
| Reserve balance check | < 50ms | Direct contract call |
| Full verification (no cache) | < 200ms | Certificate fetch + reserve check + policy eval |
| On-chain verification (Solidity) | ~35,000 gas | Single transaction, all checks |

---

## 10. Error Handling and Edge Cases

### 10.1 Certificate Not Found

```typescript
const result = await verifier.verify(agentAddress);
// result.status === 'NO_CERTIFICATE'

// Agent has no CCP certificate. Verifier options:
// 1. Reject transaction (strict policy)
// 2. Allow with lower limits (permissive policy)
// 3. Request certificate from agent (negotiation)
```

### 10.2 Certificate Expired Between Check and Transaction

```
Time 0:    Verifier checks cert → valid (expires in 10 seconds)
Time 5:    Verifier submits transaction
Time 8:    Transaction hits chain
Time 10:   Certificate expires
Time 11:   Transaction executes — cert was valid at check time but expired at execution
```

**On-chain defense:** The smart contract checks validity at execution time, not at submission time:

```solidity
function deposit(uint256 amount, bytes32 certHash) external {
    // This check happens at execution time
    require(ccpRegistry.isValid(certHash), "CCP: expired");
    // ...
}
```

**Off-chain defense:** Check certificate expiry margin:

```typescript
const result = await verifier.verify(agentAddress, {
  minRemainingValidity: 3600,  // require at least 1 hour until expiry
});
```

### 10.3 Certificate Challenged During Transaction

If a certificate is challenged between verification and execution:

- On-chain: Contract sees `status == CHALLENGED` → depends on policy. Some verifiers reject challenged certs; others accept (challenge is informational).
- Off-chain: Cache is invalidated by `CertificateChallenged` event → next verification sees the challenge.

### 10.4 Chain Reorgs

On L2s, reorgs can cause a published certificate to temporarily appear then disappear:

**Defense:** Wait for finality before relying on a newly published certificate. SDK should expose:

```typescript
const cert = await verifier.getCertificate(certHash, {
  requireFinality: true,  // only return if the publish tx is finalized
});
```

---

## 11. Integration Summary Table

| Integration Point | CCP Role | Data Flow | Latency Impact |
|---|---|---|---|
| **x402 payments** | Certificate hash in payment credential; server verifies | Agent → Server → Registry → Server | +50ms |
| **DeFi protocols** | On-chain verification in transaction validation | Agent → Protocol → Registry (same tx) | +35k gas |
| **Marketplaces** | Admission gate + concentration check | Agent → Marketplace → Registry | +100ms (one-time) |
| **Wallet delegation (ERC-7710)** | Certificate-conditional delegation; auto-pause on expiry | Wallet → Registry → Delegation contract | +50ms (setup); 0 (runtime, cached) |
| **Insurance** | Certificate data → premium calculation; coverage conditional on valid cert | Operator → Insurer → Registry | Minutes (underwriting, not real-time) |
| **Agent registries (ERC-8004)** | CCP hash in identity metadata; validation hook | Registry → ERC-8004 → Verifier | +35k gas |
| **KYA (Skyfire)** | `ccp_certificate_hash` field in KYA JWT | Agent → KYA issuer → Merchant (includes CCP ref) | 0 (bundled in existing flow) |
| **Monitoring** | Continuous reserve and constraint checks | Monitor → Reserve contract → Registry (on violation) | Background; async |

---

*This document shows how CCP integrates into real transactions across six scenarios — from simple API payments to high-value DeFi operations to wallet delegation. The protocol adds minimal latency (~50ms off-chain, ~35k gas on-chain) while providing machine-readable, verifiable trust infrastructure that every participant in the transaction can evaluate automatically.*
