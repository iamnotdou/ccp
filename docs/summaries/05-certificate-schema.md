# Certificate Schema and Constraint System

## Certificate Structure

A CCP certificate contains:
- **Identity:** certificate ID, agent ID, operator ID, chain ID
- **Validity:** issued date, expiry date, status
- **Constraints:** each with type, value, enforcement mechanism, agent-independence flag
- **Reserve:** amount, denomination, contract address, exogenous flag
- **Derived metrics:** containment bound, layer counts
- **Attestations:** auditor signatures and scope

## Constraint Types

| Type | Description | Example |
|------|-------------|---------|
| `SPENDING_LIMIT` | Max value per period | $50k/day |
| `PERMISSION_BOUNDARY` | Prohibited actions | No access to withdrawal functions |
| `EXECUTION_ENVIRONMENT` | TEE/HSM/MPC config | SGX enclave |
| `TIME_LOCK` | Execution delay | 24-hour delay for >$10k transfers |
| `MULTI_SIG` | Multiple signatures required | Operator + Ledger co-signature |
| `KILL_SWITCH` | Halt mechanism | Pause function |
| `REVERSIBILITY_WINDOW` | Reversal period | 30-minute reversal window |

## Certificate Classes

| Class | Self-Attested? | Auditor | Min Stake | Max Duration | Use Case |
|-------|----------------|---------|-----------|--------------|----------|
| **C1** | Yes | No | None | 90 days | Low-risk (e.g. read-only queries) |
| **C2** | No | Yes | 3% of bound | 60 days | Medium-risk (payment agents) |
| **C3** | No | Yes (rigorous) | 5% of bound | 30 days | High-risk (complex, permission-critical) |

## Containment Bound

The worst-case economic loss assuming only agent-independent layers hold and all agent-influenceable layers fail simultaneously. This is the certificate's answer to "how many dollars of risk do you carry?"
