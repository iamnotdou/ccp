# Transaction Integration: Real-World Flows

## Scenario 1: x402 Payment Protocol (Agent → Service)

```
Agent → Service (HTTP GET /api/data)
Service ← 402 Payment Required (CCP min requirements in headers)
Agent → Payment + CCP certificate hash
Service → Queries CCP registry on-chain
Service → Evaluates certificate against its policy
Service → 200 OK + data
```

On-chain verification overhead: ~50ms (negligible for API calls).

## Scenario 2: Agent-to-Agent (DeFi)

```
Agent A → Lending Pool (deposit 50k USDC + cert hash)
Pool → Queries CCP registry (if amount > $10k threshold)
Pool → Evaluates CCP class, containment bound, expiry
Pool → Accepts deposit, mints LP token
```

On-chain verification via contract state queries (no external calls needed).

## Risk Function (Not a Single Score!)

CCP does not produce a single "trust score." It provides a **risk function**:

```
R(t) = P_agent(t) × P_joint_failure(t) × L(t)
```

- **P_agent** = Agent behavior risk (probabilistic, non-stationary)
- **P_joint_failure** = Probability all containment layers fail simultaneously
- **L** = Potential loss magnitude

**The certificate provides inputs** (constraints, reserves, attestations). **The counterparty applies its own function** (risk policy). Different risk tolerances, different transaction sizes → different decisions.
