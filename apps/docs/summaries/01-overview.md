# CCP Overview

CCP (Containment Certificate Protocol) is an on-chain standard for issuing, publishing, and verifying containment certificates — machine-readable attestations that an AI agent's economic impact is bounded by agent-independent constraints and backed by exogenous reserves.

## The Problem

AI agents now hold wallets, sign transactions, and make payments. But classical trust models fail because:

- **Probabilistic** — Past behavior weakly predicts future behavior (LLM outputs are stochastic)
- **Non-stationary** — Silent model updates change the entity being scored
- **Ephemeral** — Creating a new identity is nearly costless, making punishment meaningless
- **Containment layers are also probabilistic** — Agents can social-engineer operators and find gaps

## The Solution: Bounded-Loss Architecture

Instead of "will this agent behave well?", counterparties ask: **"What's my worst-case loss, and who absorbs it?"**

CCP relies on structural mechanisms that **bound the agent's impact area**, not trust in the agent's behavior. Even if all agent-influenceable layers collapse, agent-independent layers limit the loss, and enough exogenous reserves are locked to cover it.

## Chains Used

| Chain | Role |
|-------|------|
| **Hedera** | Contract execution, HCS event logs, 3s finality, sub-cent fees |
| **Ledger** | Hardware co-signing, agent-independent constraint enforcement |
| **ENS** | Agent naming, certificate discovery (cross-chain) |
