# CCP Track Submission Rationale -- ETHGlobal Cannes 2026

**Date:** April 2026
**Project:** CCP (Containment Certificate Protocol)
**Total Available Prize Pool:** $127,000 across 32 bounties

---

## Executive Summary

CCP's strongest submission strategy targets **5 primary bounties across 4 sponsors** with a combined prize pool of **$31,000**, all achievable from a single cohesive demo. The protocol's core thesis -- agent-independent containment with on-chain verification -- maps directly to bounties that explicitly request AI agent safety, trust layers, and autonomous payment flows.

**Top 5 Targets:**

| Rank | Track | Bounty | Prize | Fit |
|------|-------|--------|-------|-----|
| 1 | Arc (Circle) | Agentic Economy with Nanopayments | $6,000 | 9/10 |
| 2 | Ledger | AI Agents x Ledger | $6,000 | 9/10 |
| 3 | Flare | TEE Extensions + Smart Accounts | $8,000 | 8/10 |
| 4 | 0G | Best OpenClaw Agent | $6,000 | 8/10 |
| 5 | ENS | Best ENS Integration for AI Agents | $5,000 | 7/10 |

---

## Detailed Track-by-Track Analysis

---

### TIER 1: Primary Targets (Fit 8-9/10)

---

#### 1. Arc (Circle) -- Best Agentic Economy with Nanopayments -- $6,000

**Fit Score: 9/10**

**Why this is the #1 target:**

This bounty was written for CCP. The description says: "Build applications enabling autonomous AI agents to transact with each other using nanopayments on Arc. Gas-free micropayments for API calls, data access, compute resources." CCP's TRANSACTION_INTEGRATION.md Scenario 1 describes this exact flow:

1. Agent A requests API access from Service B
2. Service B responds with 402 + CCP minimum requirements (`X-CCP-Min-Class: C1`)
3. Agent A includes CCP certificate hash in payment credential
4. Service B verifies certificate on-chain before accepting payment

With Arc's nanopayments, the agent pays per-API-call while the service verifies containment quality in real-time. This is CCP's primary use case.

**What CCP brings that others won't:**
- Every other submission will show agents paying for things. CCP shows agents paying for things *safely* -- with verifiable, on-chain containment bounds.
- The bounty examples include "multi-agent systems with payment-based coordination" -- CCP enables agents to evaluate *each other's* certificates before transacting.

**Technical requirements met:**
- Functional MVP + architecture diagram
- Video demonstration
- GitHub/Replit repo
- Deploy on Arc (EVM-compatible)
- Use USDC for reserves (Arc is stablecoin-native)

**Implementation plan:**
1. Deploy `ICCPRegistry.sol` on Arc testnet
2. Deploy `ReserveVault.sol` with USDC reserves on Arc
3. Build agent that publishes a C1 certificate
4. Integrate Arc nanopayments -- agent includes cert hash in payment flow
5. Build verifier service that checks certificate before accepting payment
6. Demonstrate full loop: publish cert -> agent pays -> service verifies -> accepts/rejects

**Resources:**
- [Nanopayments Docs](https://developers.circle.com/gateway/nanopayments)
- [USDC Contract Addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses)
- [Circle Gateway Docs](https://developers.circle.com/gateway)

---

#### 2. Ledger -- AI Agents x Ledger -- $6,000

**Fit Score: 9/10**

**Why this is a near-perfect fit:**

The bounty description reads like CCP's design doc:
- "Secure agent payments" = CCP's core purpose
- "Human approval for sensitive actions" = CCP's HUMAN_OVERSIGHT_THRESHOLD constraint
- "Device-backed identity, authentication, credentials" = CCP's HSM-based agent-independent containment
- "x402-style payment flows" = CCP has a full x402 integration spec

**The key insight:** Ledger hardware IS agent-independent containment. The agent cannot social-engineer a hardware device. When a Ledger device enforces a spending limit, that constraint is `agent_independent: true` in the strongest possible sense -- it's physically separated from the agent's execution environment.

This maps directly to CCP's core distinction (PRD Section 4.1, PROBLEM.MD Section 5):

| Agent-Independent (Ledger) | Agent-Influenceable |
|---|---|
| Ledger HSM enforces $10K max per transaction | Human reviews transactions manually |
| Hardware signing policy cannot be modified by agent | Software rate limits can be circumvented |
| Physical device approval required | API keys can be leaked |

**What CCP brings that others won't:**
- Other submissions will use Ledger as a wallet. CCP frames Ledger as a *containment mechanism* -- a load-bearing safety component, not just a key store.
- The CCP certificate *certifies* the Ledger enforcement, making the hardware constraint machine-readable and verifiable by counterparties.

**Technical requirements met:**
- Build agents with Ledger-secured payment flows (x402-style)
- Human-in-the-loop agents (Ledger approves above threshold)
- Device-backed identity/credentials (HSM constraint in certificate)

**Implementation plan:**
1. Build agent that proposes transactions
2. Ledger device enforces spending limit (agent-independent constraint)
3. CCP certificate records: `enforcement: HSM, agent_independent: true, contract_address: <ledger_policy>`
4. Demonstrate: agent tries to exceed limit -> Ledger blocks -> containment verified
5. Counterparty checks certificate -> sees HSM enforcement -> accepts transaction

**Resources:**
- [Ledger Developer Tracks](https://developers.ledger.com/ethglobal)

---

#### 3. Flare -- TEE Extensions + Smart Accounts -- $8,000

**Fit Score: 8/10 | Largest single bounty with strong fit**

**Why this matters:**

Flare's TEE Extensions solve one of CCP's hardest problems: how do you verify that the agent is actually running the claimed model inside a secure enclave? The answer is Flare's TEE architecture -- TEE machines receive instructions, execute in a secure enclave, and return *signed results* that are verifiable from Flare.

CCP's certificate schema includes:
```
model_version_attested: bool  // true if TEE attests model version
```

Flare's TEE Extensions make this field real instead of theoretical.

**The narrative:**
"CCP certificates backed by Flare TEE Extensions: the first protocol where AI agent containment is hardware-attested and on-chain verifiable."

**What CCP brings that others won't:**
- Most TEE submissions will focus on generic offchain computation. CCP provides the *framework* for what the TEE should attest -- containment constraints, model version, spending limits.
- CCP's audit methodology (AUDIT_METHODOLOGY.md Section 6.1) specifies exactly what TEE verification means: remote attestation, code measurement (MRENCLAVE), side-channel mitigations, key management, update mechanisms.

**Technical requirements met:**
- Use TEE Extensions for attested offchain logic and signed results
- The attestation goes into the CCP certificate
- Supporting use of related Flare infrastructure (encouraged)

**Implementation plan:**
1. Build TEE Extension that verifies agent containment constraints
2. TEE attests: "this agent runs model X with spending limit Y"
3. TEE signs attestation -> becomes part of CCP certificate
4. Deploy ICCPRegistry on Flare
5. Certificate includes TEE attestation as an agent-independent constraint
6. Demonstrate end-to-end: TEE attests -> certificate published -> counterparty verifies

**Risk:** Flare TEE Extensions may be new/undocumented, increasing implementation uncertainty. The $8K prize compensates for this risk.

---

#### 4. 0G -- Best OpenClaw Agent on 0G -- $6,000

**Fit Score: 8/10**

**Why this fits:**

0G explicitly lists these as bounty ideas:
- "OpenClaw agent reputation & KYA system"
- "Sandboxed OpenClaw execution environment"

CCP is *exactly* the alternative to reputation that 0G is looking for. The submission argues: "You asked for an agent KYA system. We built one -- but instead of reputation scores (which fail for probabilistic agents), we use containment certificates."

**0G infrastructure integration:**
- **0G Chain (EVM-compatible):** Deploy ICCPRegistry.sol + ReserveVault.sol
- **0G Storage:** Store full certificate data and audit reports (replaces IPFS)
- **0G Compute:** Optional -- run containment verification computations on 0G's decentralized compute
- **iNFTs (ERC-7857):** Certificate itself as an iNFT -- agent ownership/composability through the containment certificate

**What CCP brings that others won't:**
- The essay (PROBLEM.MD) directly argues why reputation fails for agents -- stochastic behavior, non-stationarity, ephemeral identity. This intellectual framework differentiates from generic KYA implementations.
- CCP's game theory (NASH_EQUILIBRIUM.md) shows why honest behavior is the Nash equilibrium -- something judges at a crypto hackathon will appreciate.

**Technical requirements met:**
- Project name + description
- Contract deployment addresses (0G Chain)
- Public GitHub repo with README + setup instructions
- Demo video (under 3 mins)
- Explanation of 0G features/SDKs used
- Team contact info

**Implementation plan:**
1. Deploy ICCPRegistry + ReserveVault on 0G Chain
2. Use 0G Storage for certificate data (instead of IPFS)
3. Build OpenClaw agent that publishes a CCP certificate
4. Build second agent that verifies the certificate before transacting
5. Demonstrate: Agent A publishes cert on 0G -> Agent B queries 0G Storage -> Agent B evaluates certificate -> transaction proceeds

**Resources:**
- [0G Documentation](https://docs.0g.ai/)
- [Builder Hub](https://build.0g.ai/)
- [Zero Coding Guide](https://build.0g.ai/zero-coding/)

---

#### 5. Hedera -- AI & Agentic Payments -- $6,000

**Fit Score: 8/10**

**Why this fits:**

The bounty explicitly mentions technologies CCP integrates with:
- **x402 payment standard** -- CCP has full x402 header spec (TRANSACTION_INTEGRATION.md Section 2.4)
- **ERC-8004: Trustless Agents** -- CCP integrates as the containment layer for ERC-8004 identity (PRD Section 9.3)
- **On-chain agent identity** -- CCP certificates ARE on-chain agent containment identity
- **Agent discovery** -- Certificate registry enables agent discovery by containment quality

**Optional enhancements that directly map to CCP:**
- "On-chain agent identity using ERC-8004 or HCS-14" -- CCP certificate hash stored in ERC-8004 registry
- "x402 for pay-per-request" -- CCP's x402 integration flow
- "Token creation/custom fee schedules via HTS" -- CCP reserve could use HTS tokens

**Implementation plan:**
1. Deploy ICCPRegistry on Hedera Testnet (EVM)
2. Use Hedera Agent Kit to build AI agent
3. Agent publishes CCP certificate on Hedera
4. Implement x402 payment flow with CCP verification
5. ERC-8004 identity references CCP certificate
6. Demo: agent discovers service -> checks certificate requirements -> pays via x402 -> service verifies certificate on Hedera -> serves request

**Resources:**
- [Hedera Agent Kit (JS/TS)](https://github.com/hashgraph/hedera-agent-kit)
- [x402 Protocol](https://www.x402.org/)
- [ERC-8004: Trustless Agents](https://eips.ethereum.org/EIPS/eip-8004)
- [Getting Started with Hedera](https://docs.hedera.com/hedera/getting-started)
- [Hedera Discord](https://hedera.com/discord)

---

### TIER 2: Strong Secondary Targets (Fit 6-7/10)

---

#### 6. ENS -- Best ENS Integration for AI Agents -- $5,000

**Fit Score: 7/10**

**Angle:** ENS as the human-readable discovery layer for CCP-certified agents.

**How it works:**
- Register `operator.eth` for the operator
- Register `agent1.operator.eth` as subname for each agent
- Store CCP certificate hash in ENS text records: `com.ccp.certificate = 0xABC...`
- Store containment bound: `com.ccp.bound = 50000`
- Store certificate class: `com.ccp.class = C2`

**Discovery flow:**
```
resolve("tradingbot.agentco.eth")
  -> address: 0x1234 (agent wallet)
  -> text("com.ccp.certificate"): 0xABC... (cert hash)
  -> text("com.ccp.class"): "C2"
```

A counterparty can discover an agent by name, immediately see its containment quality, and verify the full certificate on-chain.

**Requirement note:** Must present at ENS booth in person on Sunday morning.

---

#### 7. ENS -- Most Creative Use of ENS -- $5,000

**Fit Score: 7/10**

**Angle:** CCP certificates as verifiable credentials stored in ENS text records.

**Creative elements:**
- Subnames as certificate class badges: `c2.agent.operator.eth` indicates C2 certification
- ENS text records store the full verification chain: cert hash, attestor address, reserve contract, containment bound
- Auto-resolving: when an agent introduces itself as `tradingbot.eth`, the resolver returns not just the address but the full containment profile
- Agents can query each other's ENS names to evaluate containment quality before transacting

---

#### 8. Arc (Circle) -- Smart Contracts with Advanced Stablecoin Logic -- $3,000

**Fit Score: 8/10**

**Angle:** CCP's reserve/bond/escrow contracts as showcase of advanced USDC programmable logic.

**Contracts to deploy:**
1. **ReserveVault.sol** -- Conditional USDC escrow: locked while certificate is ACTIVE, released on clean expiry, held for claims on challenge. This is "conditional escrow with onchain dispute + automatic release."
2. **BondContract.sol** -- Operator bond with slashing distribution: 30% to challenger, 50% to verifiers, 20% burned.
3. **FeeEscrow.sol** -- Audit fee held until clean certificate expiry. Released to auditor if no challenge; clawed back on successful challenge.

Each contract demonstrates a distinct advanced stablecoin pattern:
- Time-locked conditional release
- Multi-party slashing distribution
- Escrow with external trigger conditions

---

#### 9. 0G -- Best DeFi App on 0G -- $6,000

**Fit Score: 7/10**

**Angle:** DeFi lending pool that gates agent deposits by CCP certificate quality.

**Implementation:** Deploy a lending pool on 0G Chain where deposits above $10K require CCP verification. Higher certificate class = higher deposit limits. Demonstrates CCP's DeFi Protocol Policy Template (PRD Section 4.6): minimum C2 class, max periodic loss <= per-user exposure limit, reserve ratio >= 3x.

---

#### 10. Uniswap Foundation -- Best API Integration -- $10,000

**Fit Score: 6/10**

**Angle:** CCP-certified trading agent using Uniswap API. The agent's containment (max position size, max daily loss) is certified and verifiable. Demonstrates that AI-driven DeFi strategies can be made economically safe through CCP.

**Risk:** The bounty primarily evaluates Uniswap API integration quality. CCP would be a differentiator but not the main deliverable. The $10K prize is tempting but competition will be fierce and judges want to see impressive Uniswap usage.

---

#### 11. World -- Best use of Agent Kit -- $8,000

**Fit Score: 6/10**

**Angle:** World ID for operator identity (proving the human behind the agent) + CCP for containment quality (proving the cage around the agent). AgentKit-powered agent that verifies counterparty CCP certificates before transacting.

**Narrative:** "World ID solves 'is there a real human behind this agent?' CCP solves 'even if there is, what's the worst that can happen?'"

**Risk:** AgentKit is specifically about human-vs-bot distinction. CCP argues the agent itself is irrelevant -- narrative tension.

---

#### 12. Chainlink -- Best CRE Workflow -- $4,000

**Fit Score: 6/10**

**Angle:** CRE Workflow for continuous CCP certificate monitoring. The workflow checks reserve balances on-chain, queries external price feeds, calculates reserve ratios, and alerts when a certificate's metrics drop below class minimums.

---

### TIER 3: Weak/Avoid (Fit <= 5/10)

| Track | Bounty | Fit | Reason to Skip |
|-------|--------|-----|----------------|
| World | World ID 4.0 | 5/10 | CCP separates identity from containment by design |
| World | Minikit 2.0 | 3/10 | Consumer mini-app, not protocol work |
| Hedera | Tokenization | 2/10 | CCP is not about RWA tokenization |
| Hedera | No Solidity | 3/10 | CCP needs smart contracts |
| Hedera | Naryo Challenge | 5/10 | Monitoring is secondary to core CCP |
| Arc | Chain Abstracted USDC | 4/10 | CCP is not about chain abstraction |
| Arc | Prediction Markets | 2/10 | No connection |
| Flare | Smart Account App | 3/10 | XRPL-focused, not agent containment |
| Ledger | Clear Signing | 5/10 | Supplementary, not core |
| Chainlink | Connect the World | 5/10 | Small prize, supplementary integration |
| Chainlink | Privacy Standard | 3/10 | Conflicts with CCP's transparency model |
| WalletConnect | Reown SDK | 3/10 | Generic connectivity |
| WalletConnect | Pay | 4/10 | Human consumer payments, not agent containment |
| Unlink | All bounties | 2-3/10 | Privacy conflicts with CCP's public verifiability |
| Dynamic | All bounties | 2-5/10 | CCP is not a wallet/auth product |

---

## Multi-Track Submission Strategy

ETHGlobal allows submitting the same project to multiple tracks. The optimal approach is to build ONE cohesive demo that qualifies for multiple bounties.

### Option A: "Payment-First" Build (Recommended)

**Target bounties:** Arc Nanopayments ($6K) + Ledger AI Agents ($6K) + Arc Stablecoin Logic ($3K)
**Max prize:** $15,000

**Single demo:** CCP-certified agent making nanopayments on Arc, with Ledger hardware enforcing spending limits. Reserves held in USDC escrow contracts.

**Build scope:**
1. `ICCPRegistry.sol` deployed on Arc
2. `ReserveVault.sol` (USDC escrow) deployed on Arc
3. Agent with Ledger hardware enforcement (HSM constraint)
4. Arc nanopayment integration with CCP certificate in payment flow
5. Verifier service that checks certificate before accepting payment

**Why this works:** Each bounty evaluates a different aspect of the same demo:
- Arc Nanopayments judges evaluate: agent-to-agent payment flow with CCP verification
- Ledger judges evaluate: Ledger as trust layer / HSM containment
- Arc Stablecoin judges evaluate: reserve/escrow smart contract logic

### Option B: "Infrastructure-First" Build

**Target bounties:** 0G OpenClaw ($6K) + ENS AI Agents ($5K) + Hedera Agentic Payments ($6K)
**Max prize:** $17,000

**Single demo:** CCP-certified OpenClaw agent with ENS name resolution and x402 payment flow, deployable across 0G Chain and Hedera.

**Build scope:**
1. `ICCPRegistry.sol` deployed on 0G Chain
2. OpenClaw agent integration with CCP certificate issuance
3. ENS subnames for agent discovery with cert metadata in text records
4. x402 payment flow with CCP verification headers
5. Port deployment to Hedera Testnet for that submission

**Why this works:** Broader ecosystem integration story, more bounties, but more implementation surface.

### Option C: "Technical Depth" Build

**Target bounty:** Flare TEE Extensions ($8K) -- single track, highest single prize with strong fit
**Max prize:** $8,000

**Single demo:** CCP certificates with hardware-attested containment via Flare TEE Extensions.

**Why this works:** Deepest technical differentiation. Fewer competitors will attempt TEE work. The narrative -- "hardware-attested agent containment" -- is compelling and novel. But single-track risk.

---

## Recommended Strategy: Option A + ENS

**Primary build:** Option A (Arc + Ledger)
**Additional submission:** ENS AI Agents (requires ENS name setup + text records, minimal extra work)

**Total target:** Arc Nanopayments ($6K) + Ledger AI Agents ($6K) + Arc Stablecoin ($3K) + ENS AI Agents ($5K)
**Max prize potential: $20,000**

**Build priority:**
1. Smart contracts (Registry + Reserve) on Arc -- core deliverable
2. Agent payment flow with nanopayments -- Arc submission
3. Ledger hardware enforcement integration -- Ledger submission
4. ENS name + text record setup -- ENS submission (low effort, high upside)
5. Demo video + architecture diagram -- all submissions need this

---

## Key Qualification Checklist

Every submission must have:

- [ ] Public GitHub repository
- [ ] README with setup instructions and architecture
- [ ] Demo video (2-5 min depending on track)
- [ ] Functional, working demo (not mockups)

Track-specific:
- [ ] **Arc:** Architecture diagram, video demonstration, GitHub/Replit
- [ ] **Ledger:** Show Ledger-secured payment flow, human-in-the-loop demo
- [ ] **ENS:** Present at ENS booth in person Sunday morning, no hard-coded values
- [ ] **0G:** Contract deployment addresses, team contact info (Telegram & X)
- [ ] **Hedera:** Deploy on Hedera Testnet, 5-min max video
- [ ] **Uniswap:** Real on-chain transaction IDs, Uniswap Developer Feedback Form

---

*This analysis is based on the full text of all CCP design documents (PRD, PROBLEM, NASH_EQUILIBRIUM, AUDITOR_ECONOMICS, AUDIT_METHODOLOGY, ECONOMIC_MODEL, GOVERNANCE, PROTOCOL_LIFECYCLE, TRANSACTION_INTEGRATION) cross-referenced against all 32 bounty descriptions, qualification requirements, and resource links from the ETHGlobal Cannes 2026 prizes page.*
