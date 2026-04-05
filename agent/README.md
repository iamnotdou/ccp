# @iamnotdou/ccp

Containment Certificate Protocol — CLI and MCP server for AI agents on Hedera.

CCP lets AI agents prove they are economically safe to transact with. Instead of reputation (which fails for stochastic, ephemeral agents), CCP uses **agent-independent smart contract constraints** backed by **locked exogenous reserves** and **auditor stake-at-risk**.

The agent cannot modify its own cage. That is the point.

## Install

```bash
npm install -g @iamnotdou/ccp
```

## MCP Server (for AI Agents)

The MCP server exposes 18 tools over Model Context Protocol. Only `AGENT_PRIVATE_KEY` is required.

```json
{
  "mcpServers": {
    "ccp": {
      "command": "npx",
      "args": ["@iamnotdou/ccp", "mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

Contract addresses, RPC, and HCS topic default to Hedera Testnet. No hosting required — the MCP server runs as a local child process.

### Tools

#### Read (no key needed)

| Tool | Description |
|------|-------------|
| `ccp_status` | Full system overview: spending limits, reserve, balances, certificate |
| `ccp_addresses` | Contract addresses and network config |
| `ccp_cert_verify` | Verify agent meets containment requirements |
| `ccp_cert_get` | Get certificate details by hash |
| `ccp_cert_lookup` | Find active certificate for an agent address |
| `ccp_reserve_status` | Reserve balance, lock status, C2/C3 adequacy |
| `ccp_spending_status` | Spending config and period tracking |
| `ccp_auditor_status` | Auditor attestation count, stake, challenges |
| `ccp_auditor_audit` | Read-only containment audit |
| `ccp_challenge_get` | Challenge details by ID |
| `ccp_challenge_list` | List challenges for a certificate |
| `ccp_hcs_timeline` | HCS event timeline from Hedera Consensus Service |

#### Write (key required)

| Tool | Key | Description |
|------|-----|-------------|
| `ccp_spending_pay` | AGENT | Pay below $5k (agent-only signature) |
| `ccp_spending_pay_cosign` | AGENT + LEDGER | Pay $5k-$10k (Ledger co-sign) |
| `ccp_cert_publish` | OPERATOR + AUDITOR + LEDGER | Publish new certificate (full flow) |
| `ccp_cert_revoke` | OPERATOR | Revoke a certificate |
| `ccp_reserve_deposit` | OPERATOR | Deposit USDC into reserve vault |
| `ccp_reserve_lock` | OPERATOR | Lock reserve for N days |

Missing keys return `{ "error": "KEY_NOT_CONFIGURED" }` — no crash.

### Agent Workflow

```
1. ccp_status              → "where am I?"
2. ccp_cert_verify         → "am I trusted?"
3. ccp_spending_status     → "how much can I spend?"
4. ccp_spending_pay        → "pay" (< $5k)
5. ccp_hcs_timeline        → "what happened?"
```

### Spending Rules

| Amount | Signature | Tool |
|--------|-----------|------|
| $0 - $5,000 | Agent only | `ccp_spending_pay` |
| $5,001 - $10,000 | Agent + Ledger | `ccp_spending_pay_cosign` |
| > $10,000 | BLOCKED | Hard limit, cannot be bypassed |
| Period > $50,000 | BLOCKED | Resets after 24h |

These limits are enforced by smart contracts. Even with Ledger co-signature, the agent cannot exceed them.

## CLI

```bash
ccp status                              # system overview
ccp cert:verify <agentAddress>          # verify containment
ccp cert:get <certHash>                 # certificate details
ccp cert:lookup <agentAddress>          # find active cert
ccp cert:publish                        # publish new cert
ccp cert:revoke <certHash>              # revoke cert
ccp reserve:status                      # reserve vault info
ccp reserve:deposit <amount>            # deposit USDC
ccp reserve:lock <days>                 # lock reserve
ccp spending:status                     # spending limits
ccp spending:pay <to> <amount>          # pay (agent-only)
ccp spending:pay:cosign <to> <amount>   # pay (Ledger co-sign)
ccp auditor:status                      # auditor record
ccp auditor:audit                       # containment audit
ccp challenge:get <id>                  # challenge details
ccp challenge:list <certHash>           # challenges for cert
ccp hcs:timeline                        # event timeline
ccp addresses                           # contract addresses
ccp actors                              # actor addresses
ccp help                                # help
```

## Contracts (Hedera Testnet)

| Contract | Address |
|----------|---------|
| CCPRegistry | `0x776CAbA2d5E63F96358f1624976D6Aaa6b780ed1` |
| SpendingLimit | `0x281Feb02bb3AA41d3A75E24a06A1f142eEEA5C85` |
| ReserveVault | `0xb2fFaf44Ae415b0e1dFc99c8E07dfDE2a5369Aa6` |
| AuditorStaking | `0xe786eB0F88b8A30e0ABf4C634fc414084b2134eC` |
| FeeEscrow | `0xe619F278352B4eED4465a176Df0B2A2F2CAf3557` |
| ChallengeManager | `0x6238a4f9ad158dA64a4478FE64Ba0416b176cFC7` |
| HCS Topic | `0.0.8510266` |

Chain ID: 296 | RPC: `https://testnet.hashio.io/api`

## How CCP Works

```
┌─────────────────────────────────────────────┐
│          CONTAINMENT CERTIFICATE            │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐ ┌──────────┐ ┌─────────┐ │
│  │ CONTAINMENT  │ │ RESERVE  │ │  AUDIT  │ │
│  │              │ │          │ │         │ │
│  │ SpendingLimit│ │ $150k    │ │ Auditor │ │
│  │ • $10k/tx   │ │ USDC     │ │ staked  │ │
│  │ • $50k/day  │ │ locked   │ │ $13.5k  │ │
│  │ • Ledger    │ │ 3x ratio │ │ at risk │ │
│  │   cosign    │ │          │ │         │ │
│  └──────────────┘ └──────────┘ └─────────┘ │
│                                             │
│  Agent-independent. The cage holds because  │
│  the agent cannot modify it.                │
│                                             │
└─────────────────────────────────────────────┘
```

**Three layers of trust:**
1. **Containment** — Smart contract spending limits + Ledger co-signing. Agent-independent.
2. **Reserve** — $150k USDC locked on-chain. Exogenous, verifiable, non-recoverable during cert validity.
3. **Auditor stake** — $13.5k at risk. Slashed if attestation proven false (30% to challenger, 50% to verifiers, 20% burned).

## Env Variables

Only `AGENT_PRIVATE_KEY` is required. Everything else has Hedera Testnet defaults.

| Variable | Default | Required |
|----------|---------|----------|
| `AGENT_PRIVATE_KEY` | — | Yes (for write ops) |
| `OPERATOR_PRIVATE_KEY` | — | For cert/reserve management |
| `AUDITOR_PRIVATE_KEY` | — | For attestation |
| `LEDGER_PRIVATE_KEY` | — | For co-signed payments |
| `HEDERA_RPC_URL` | `https://testnet.hashio.io/api` | No |
| `HEDERA_CHAIN_ID` | `296` | No |
| `HCS_TOPIC_ID` | `0.0.8510266` | No |
| `REGISTRY_ADDRESS` | Testnet default | No |
| `RESERVE_VAULT_ADDRESS` | Testnet default | No |
| `SPENDING_LIMIT_ADDRESS` | Testnet default | No |
| `AUDITOR_STAKING_ADDRESS` | Testnet default | No |
| `FEE_ESCROW_ADDRESS` | Testnet default | No |
| `CHALLENGE_MANAGER_ADDRESS` | Testnet default | No |
| `USDC_ADDRESS` | Testnet default | No |

## Links

- [Documentation](https://ccp-docs.vercel.app)
- [AI Agent Integration Guide](https://ccp-docs.vercel.app/docs/integrations/ai-agents)
- [GitHub](https://github.com/iamnotdou/ccp)

## License

MIT
