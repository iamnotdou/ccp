# CCP — Containment Certificate Protocol

**ETHGlobal Cannes 2026 | Hedera × Ledger × ENS**

An on-chain standard for issuing, publishing, and verifying containment certificates — machine-readable attestations that an AI agent's economic impact is bounded by agent-independent constraints and backed by exogenous reserves.

> The cage held. The agent could not exceed its containment bound — even with Ledger co-signature. Smart contract limits are absolute. That is the CCP thesis.

## Architecture

```
  OPERATOR (Ledger)              AUDITOR (Ledger)
       |                              |
       |── deploys containment        |── audits + stakes
       |── deposits reserve           |── signs attestation
       |                              |
       v              v               v
  CCPRegistry.publish(operatorSig, attestorSigs)
       |
  ┌────|────┬───────────┬───────────┐
  v    v    v           v           v
Registry  Reserve   Spending    Auditor    Challenge
          Vault     Limit       Staking    Manager
                      |
              Ledger co-signs
              above $5k threshold
```

**Three layers:**
- **Hedera** — Settlement: contracts, HCS event logging, 3s finality, sub-cent fees
- **Ledger** — Containment: hardware co-signing, agent-independent constraints
- **ENS** — Identity: agent naming, certificate discovery via text records

## Live on Hedera Testnet

| Contract | Address |
|----------|---------|
| CCPRegistry | [`0x776CAbA2...`](https://hashscan.io/testnet/contract/0x776CAbA2d5E63F96358f1624976D6Aaa6b780ed1) |
| SpendingLimit | [`0x281Feb02...`](https://hashscan.io/testnet/contract/0x281Feb02bb3AA41d3A75E24a06A1f142eEEA5C85) |
| ReserveVault | [`0xb2fFaf44...`](https://hashscan.io/testnet/contract/0xb2fFaf44Ae415b0e1dFc99c8E07dfDE2a5369Aa6) |
| AuditorStaking | [`0xe786eB0F...`](https://hashscan.io/testnet/contract/0xe786eB0F88b8A30e0ABf4C634fc414084b2134eC) |
| FeeEscrow | [`0xe619F278...`](https://hashscan.io/testnet/contract/0xe619F278352B4eED4465a176Df0B2A2F2CAf3557) |
| ChallengeManager | [`0x6238a4f9...`](https://hashscan.io/testnet/contract/0x6238a4f9ad158dA64a4478FE64Ba0416b176cFC7) |

All contracts verified on [Sourcify](https://sourcify.dev) (status: perfect).

HCS Event Topic: `0.0.8510266` — [View events](https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.8510266/messages?limit=100&order=asc)

## Project Structure

```
contracts/           Solidity (Foundry)
  src/
    CCPRegistry.sol       Certificate storage, publish, verify
    SpendingLimit.sol     Agent containment + Ledger co-sign
    ReserveVault.sol      Locked USDC reserve backing
    AuditorStaking.sol    Auditor skin-in-the-game
    FeeEscrow.sol         Audit fee escrow
    ChallengeManager.sol  Dispute resolution + slash
  test/
    FullFlow.t.sol        9 integration tests (all passing)

agent/               TypeScript (Hedera SDK + viem)
  src/
    demo.ts               Full 7-phase demo scenario
    ledger/cosigner.ts    Ledger DMK co-signing
    ens/textRecords.ts    ENS certificate discovery
    hcs/publisher.ts      HCS event logging
    auditor/attest.ts     Auditor workflow
    hedera/mirrorNode.ts  Mirror Node queries

docs/                Next.js documentation site (Fumadocs)
ideas/               Design documents (10 files)
```

## Quick Start

### Prerequisites

- [Foundry](https://getfoundry.sh) (`forge`, `cast`)
- Node.js 22+
- Hedera Testnet account ([portal.hedera.com](https://portal.hedera.com))

### Run Tests

```bash
cd contracts
forge test -vv
```

### Deploy

```bash
# Deploy MockUSDC
forge script script/Deploy.s.sol:DeployMockUSDC \
  --rpc-url https://testnet.hashio.io/api \
  --private-key $YOUR_KEY --broadcast --slow

# Deploy all CCP contracts
OPERATOR_ADDRESS=$ADDR AGENT_ADDRESS=$ADDR LEDGER_ADDRESS=$ADDR USDC_ADDRESS=$ADDR \
forge script script/Deploy.s.sol:DeployAll \
  --rpc-url https://testnet.hashio.io/api \
  --private-key $YOUR_KEY --broadcast --slow
```

### Run Demo

```bash
cd agent
cp .env.example .env  # fill in your keys + deployed addresses
npm install
npm run demo:setup    # create HCS topic, mint USDC, fund accounts, deposit reserve
npm run demo          # run full 7-phase demo
```

### Documentation

```bash
cd docs
npm install
npm run dev           # http://localhost:3000
```

## Demo Flow

1. **Auditor stakes & attests** — reviews containment, stakes 1,500 USDC, signs with Ledger
2. **Operator publishes certificate** — Ledger-signed, on-chain, HCS logged
3. **Counterparty verifies** — ENS → registry → auditor stake → reserve → PASS
4. **Agent pays $500** — below threshold, agent-only signature
5. **Agent pays $7,000** — above threshold, Ledger co-signs
6. **Agent tries $45,000** — BLOCKED. Smart contract enforces absolute limit.
7. **HCS timeline** — full audit trail via Mirror Node

## Partner Prize Tracks

### Hedera — AI & Agentic Payments ($6,000)
- 6 EVM contracts deployed on Hedera Testnet
- HCS topic for certificate lifecycle events (publish, attest, transact, block)
- Mirror Node queries for audit trail
- All contracts verified on Sourcify

### Ledger — AI Agents x Ledger ($6,000)
- SpendingLimit dual-signature: agent alone < $5k, Ledger co-signs above
- Certificate signing via Ledger (hardware-attested operator identity)
- Auditor attestation via Ledger (hardware-attested audit)
- Clear Signing JSON for CCP transaction types
- Only Ledger can change containment parameters (agent-independent)

### ENS — Best ENS Integration for AI Agents ($5,000)
- Agent identity: `alpha.operator.eth` → agent address
- Certificate discovery via text records (`ccp.certificate`, `ccp.class`, `ccp.chain`)
- Operator fleet management via subnames
- Auditor reputation via ENS text records
- Cross-chain discovery: ENS (Sepolia) → Hedera (testnet)

## The Thesis

Trust for probabilistic AI agents should not be modeled as behavioral reputation. It should be modeled as **bounded-loss architecture**. The certificate attests to the containment system, not the agent's character. A counterparty verifying a certificate answers one question:

> Does the surrounding system make this agent economically safe enough to transact with?

Read the full essay: [Trust Infrastructure for Probabilistic Agents](ideas/md/PROBLEM.MD)
