# Bound — Hackathon Readiness Report

**Date:** 2026-04-05
**Event:** ETHGlobal Cannes 2026
**Tracks:** Hedera (AI & Agentic Payments) | Ledger (AI Agents x Ledger) | ENS (Best ENS Integration)

---

## 1. Feature Inventory — What's Ready

### Smart Contracts (6/6 deployed + verified)

| Contract | Address | Status | Features |
|----------|---------|--------|----------|
| CCPRegistry | `0x776C...ed1` | Verified (Sourcify) | Publish, revoke, verify, challenge state management, dual-signature enforcement |
| SpendingLimit | `0x530e...E6C` | Verified | Agent-only execute, Ledger co-sign, period limit blocking, threshold enforcement |
| ReserveVault | `0xb2fF...Aa6` | Verified | USDC deposit, lock/unlock, adequacy checks per class |
| AuditorStaking | `0xe786...eC` | Verified | Stake per cert, slash distribution (30/50/20), release after grace |
| FeeEscrow | `0xe619...557` | Verified | Fee holdback, clawback on upheld challenge |
| ChallengeManager | `0x6238...C7` | Verified | 5 challenge types, bond mechanism, panel verdict, auto-resolve |

**Tests:** 9/9 passing (`forge test -vv`)

---

### Dashboard (15 pages, all functional)

#### PROTOCOL SECTION (protocol-wide, indexer-driven)

| Page | Route | Status | Key Features |
|------|-------|--------|-------------|
| Explorer | `/dashboard/explorer` | READY | Stats bar (5 metrics), force-directed network graph, quick entity lists, activity feed |
| All Agents | `/dashboard/all-agents` | READY | Agent cards with status badges, tx counts, containment bound, operator |
| Agent Detail | `/dashboard/all-agents/[address]` | READY | Full agent profile: certs, stats, activity feed, operator link |
| All Certificates | `/dashboard/all-certificates` | READY | Cert list with class/status badges, Bound verification seal, auditor count |
| Certificate Detail | `/dashboard/all-certificates/[hash]` | READY | Auditor attestations with stakes, challenge history, participants, validity seal |
| Auditor Board | `/dashboard/auditor-board` | READY | Leaderboard sorted by stake, attestation count, challenge record, cert links |

#### AGENT SECTION (single-agent, env-configured)

| Page | Route | Status | Key Features |
|------|-------|--------|-------------|
| Overview | `/dashboard/overview` | READY | 4 stat cards, spending gauge, containment status, HCS timeline |
| Certificate | `/dashboard/certificates` | READY | Active cert detail, revoke button, validity checker, risk reduction bar |
| Reserves | `/dashboard/reserves` | READY | Balance, lock status, C2/C3 adequacy checks, contract details |
| Spending | `/dashboard/spending` | READY | Period gauge, 3 enforcement tiers (agent-only / cosign / blocked), contract config |
| Auditors | `/dashboard/auditors` | READY | Auditor record, stake amounts, slash distribution explanation |
| Challenges | `/dashboard/challenges` | READY | Challenge list with expandable details, 5 challenge type descriptions |
| Identity (ENS) | `/dashboard/identity` | READY | ENS lookup, registration, CCP text record writing, fleet discovery |

#### INTERACT SECTION

| Page | Route | Status | Key Features |
|------|-------|--------|-------------|
| Live Demo | `/dashboard/demo` | READY | 7-phase guided walkthrough: attest → publish → verify → pay → cosign → BLOCKED → timeline |
| Audit Flow | `/dashboard/audit-flow` | READY | 5-step auditor workflow: config check → reserve check → classify → auditor status → verdict |
| Sandbox | `/dashboard/sandbox` | READY | 9 freeform action cards: publish, verify, check, pay, cosign, stake, challenge, deposit, revoke |

#### FEED

| Page | Route | Status | Key Features |
|------|-------|--------|-------------|
| Activity | `/dashboard/activity` | READY | Full event feed from contract logs + HCS, type filters, block numbers |

---

### Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| Protocol Indexer | READY | Merges HCS + contract event logs, hydrates entities, 30s cache, no DB required |
| HCS Event Logging | READY | Topic `0.0.8510266`, logs cert lifecycle + transactions + blocks |
| ENS Integration | READY | Sepolia text records (11 keys), name resolution, fleet discovery, registration |
| Ledger Co-sign | READY | Architecture production-ready, demo uses simulated key (swappable to real DMK) |
| CLI (`@iamnotdou/ccp`) | READY | 30+ commands, published on npm |
| MCP Server | READY | All CCP operations exposed as AI agent tools, minimal config |
| Documentation | READY | 33 MDX pages across concepts, protocol, economics, guides, integrations, reference |
| Vercel Deployment | READY | Auto-deploy from main |

---

## 2. Demo Script — Judge Walkthrough

### Path A: Protocol Overview (2 min)

1. **Homepage** → Click "Enter Bound"
2. **Explorer** → Show network graph, stats bar (certs, agents, auditors, volume)
3. **All Certificates** → Click a cert → show auditor attestations, "VERIFIED WITH BOUND" seal
4. **Auditor Board** → Show leaderboard, explain staking mechanism

### Path B: Live Demo (3 min)

1. **Live Demo** → Click "Run All" or step through:
   - Phase 1: Auditor stakes $1,500, signs attestation
   - Phase 2: Operator publishes C2 certificate ($50k bound)
   - Phase 3: Counterparty verifies agent → ACCEPTABLE
   - Phase 4: Agent pays $500 → agent-only signature, goes through
   - Phase 5: Agent pays $7,000 → above threshold, Ledger co-signs
   - Phase 6: Agent tries $45,000 → **BLOCKED** — "The cage held"
   - Phase 7: Show HCS timeline — every event consensus-timestamped

### Path C: Sandbox (1 min)

1. **Sandbox** → Show 9 action cards
2. Execute a payment, show HashScan link
3. Verify an agent, show pass/fail result

### Path D: Deep Dive (if judges ask)

- **Audit Flow** → Walk through 5-step auditor process
- **Spending** → Show 3 enforcement tiers
- **ENS Identity** → Resolve an agent name, show text records
- **Docs** → Point to game theory, economics, architecture

---

## 3. What Each Track Sees

### Hedera — AI & Agentic Payments

- 6 contracts deployed + verified on Hedera Testnet
- HCS for immutable audit trail (every cert event logged with consensus timestamps)
- Mirror Node integration for protocol-wide indexing
- Real-time spending enforcement with period limits
- Full EVM compatibility via viem + Hashio RPC

### Ledger — AI Agents x Ledger

- SpendingLimit contract enforces hardware co-signing above threshold
- Agent cannot bypass Ledger — the "cage" is agent-independent
- Certificate publication requires hardware-attested operator signature
- Clear Signing: operator sees exactly what they approve
- Architecture is production-ready (swappable from simulated key to real DMK)

### ENS — Best ENS Integration

- Agents discoverable by ENS name (e.g., `agent.operator.eth`)
- 11 CCP text record keys stored on Sepolia
- Cross-chain discovery: ENS (Sepolia) → address → Hedera registry → certificate
- Fleet management via subnames
- Registration + record writing built into dashboard

---

## 4. Post-Hackathon Roadmap

### P1 — Production Hardening

| Item | Effort | Description |
|------|--------|-------------|
| Real Ledger integration | 2-3 days | Replace simulated key with @ledgerhq/device-management-kit |
| Mainnet deployment | 1 day | Deploy contracts to Hedera mainnet, update config |
| Real USDC | 1 day | Switch from mock ERC20 to Circle USDC |
| Challenge panel | 2 days | Multi-sig verdict submission (currently simplified to single arbiter) |
| Subgraph indexer | 3 days | Replace in-memory indexer with The Graph for production scale |

### P2 — Product Features

| Item | Effort | Description |
|------|--------|-------------|
| Python SDK | 3 days | Python client for CCP verification |
| Insurance marketplace | 5 days | Connect certificate-backed reserves to actual insurance pools |
| Certificate marketplace | 3 days | Operators can browse/compare auditors |
| Multi-chain registry | 5 days | Deploy to additional EVM chains, cross-chain verification |
| Agent reputation layer | 3 days | Opt-in behavioral scoring layered on top of containment certificates |

### P3 — Ecosystem

| Item | Effort | Description |
|------|--------|-------------|
| DeFi protocol integrations | Ongoing | Pre-built hooks for Uniswap, Aave, etc. |
| Auditor onboarding | Ongoing | Real security firms as certified auditors |
| ERC standard proposal | 2 weeks | Formalize CCP as an ERC for containment certificates |

---

## 5. Tech Highlights for Pitch

1. **No database, no indexer infra** — Protocol state reconstructed from event logs + HCS in real-time. Deploys to Vercel with zero backend.

2. **Agent-independent containment** — The Ledger co-sign cannot be social-engineered by the agent. This is a physical enforcement boundary, not a software promise.

3. **Game-theoretic security** — Honest auditing is the Nash equilibrium. Dishonest auditors lose their stake (30% to challenger, 50% to panel, 20% burned). The math makes honesty more profitable than fraud.

4. **"The cage held"** — The demo's phase 6 moment: agent tries $45k, contract blocks it, HCS logs the attempt. This is the single most powerful visual for judges.

5. **Cross-chain identity** — ENS on Sepolia → Hedera on testnet. Agent discovery works across chains via text records. No bridge, no oracle — just DNS-style resolution.

6. **Full-stack in 1 repo** — 6 Solidity contracts + TypeScript CLI + MCP server + Next.js dashboard + 33 pages of docs. One `npm run demo` shows the entire protocol end-to-end.

---

## 6. Environment Checklist

```bash
# Required in docs/.env.local
NEXT_PUBLIC_HEDERA_RPC_URL=https://testnet.hashio.io/api
NEXT_PUBLIC_HEDERA_CHAIN_ID=296
NEXT_PUBLIC_REGISTRY_ADDRESS=0x776CAbA2d5E63F96358f1624976D6Aaa6b780ed1
NEXT_PUBLIC_RESERVE_VAULT_ADDRESS=0xb2fFaf44Ae415b0e1dFc99c8E07dfDE2a5369Aa6
NEXT_PUBLIC_SPENDING_LIMIT_ADDRESS=0x530ecF8Afddb752748aCE1Ece90e34FD1ca7eE6C
NEXT_PUBLIC_AUDITOR_STAKING_ADDRESS=0xe786eB0F88b8A30e0ABf4C634fc414084b2134eC
NEXT_PUBLIC_FEE_ESCROW_ADDRESS=0xe619F278352B4eED4465a176Df0B2A2F2CAf3557
NEXT_PUBLIC_CHALLENGE_MANAGER_ADDRESS=0x6238a4f9ad158dA64a4478FE64Ba0416b176cFC7
NEXT_PUBLIC_USDC_ADDRESS=0xC618490530af70b6Ce22729250Ffe8b5086225cE
OPERATOR_PRIVATE_KEY=0x...
AUDITOR_PRIVATE_KEY=0x...
AGENT_PRIVATE_KEY=0x...
LEDGER_PRIVATE_KEY=0x...
AGENT_ADDRESS=0x...
HCS_TOPIC_ID=0.0.8510266
ENS_RPC_URL=https://sepolia.infura.io/v3/...
NEXT_PUBLIC_ENS_RPC_URL=https://sepolia.infura.io/v3/...
```

---

## 7. Quick Start

```bash
# Test contracts
cd contracts && forge test -vv

# Run docs site
cd docs && npm install && npm run dev
# → http://localhost:3000

# Run CLI demo
cd agent && npm install && npm run demo:setup && npm run demo
```
