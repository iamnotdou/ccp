# Landing Page Plan — CCP (Containment Certificate Protocol)

## 1. HERO — The Punch

**Headline:**
> **Trust scores are a category error.**

**Subheadline:**
> You're scoring a distribution, not an entity. The right output is a risk function, not a trust score.

**One-liner:**
> CCP is a containment certificate protocol for AI agents. It doesn't ask "is this agent trustworthy?" — it asks "how bad can it get, and who pays?"

**CTA:** `Read the Paper` / `View on GitHub`

---

## 2. THE PROBLEM — Burn the Old Model

**Section title:** `Reputation is load-bearing nothing.`

Three cards, each destroying an assumption:

**Card 1 — Prediction Fails**
> Credit scoring assumes past behavior predicts future behavior. LLMs are stochastic. Same prompt, same context, different output. You're not scoring an entity — you're scoring a probability distribution. The agent doesn't *choose* to hallucinate. It samples wrong.

**Card 2 — Punishment Fails**
> Reputation slashing means nothing if creating a new identity is free. A human who defaults still exists. An agent can just stop existing. That's the Sybil problem applied to credit, and no karma system survives it.

**Card 3 — The Cage Is Also Probabilistic**
> "Just add guardrails" — except the agent can talk the operator into disabling them. Persuasion isn't an exotic attack vector for language models. It's what they're best at. Your containment boundary is not a wall. It's another probability distribution.

---

## 3. THE INSIGHT — The Chernobyl Line

**Section title:** `A nuclear reactor can't talk the operator into disabling the cooling system. Except that's almost exactly what happened.`

> Traditional trust infrastructure works by predicting behavior and punishing deviation. Neither mechanism works for probabilistic agents. This is not a reputation problem. It is not a credit scoring problem. It is a **containment-and-loss-bounding problem** — closer to safety engineering than to credit scoring.

> The question is not "will this agent always do the right thing?" It is: **when it doesn't — and it will — how bad can it get?**

---

## 4. THE FRAMEWORK — What We Actually Build

**Section title:** `A function, not a score.`

Show the risk equation:

```
R(t) = P_agent(t) × P_joint_failure(t, correlation, agent_influence) × L(t)
```

> The certificate provides the inputs. The counterparty applies the function. Different risk tolerance, different answer. No universal "trust score." Just math.

**Three pillars** (visual — three columns):

| **Containment** | **Residual Absorption** | **Reputation** |
|---|---|---|
| Load-bearing. Agent-independent constraint layers — formally verified smart contracts, TEEs, HSMs — whose failure probability is bounded and *causally independent* of the agent. | Economic. Collateral, risk pools, insurance — funded by exogenous assets the agent can't mint or manipulate. Priced by containment quality, not behavioral history. | Marginal signal. Not load-bearing. Reputation of the *operator*, not the agent. Adjusts premiums, informs selection. Never the primary mechanism. |

---

## 5. THE CERTIFICATE — Show the Product

**Section title:** `Machine-readable. On-chain. Verifiable by anyone.`

Show a stylized version of the `ContainmentCertificate` schema — the key fields:

- `agent_independent: true` ← **THE critical field**
- `containment_bound: $10,000` ← worst-case if only agent-independent layers hold
- `reserve: 50,000 USDC` ← exogenous, locked, verifiable
- `formally_verified: true` ← proof on IPFS

> A counterparty — human or agent — checks one thing: **does the surrounding system make this agent economically safe enough to use?**

---

## 6. THE DISTINCTION — The Key Idea

**Section title:** `Agent-independent vs. agent-influenceable. This is the entire game.`

Two-column visual:

| **Agent-Independent** ✓ | **Agent-Influenceable** ✗ |
|---|---|
| Formally verified smart contracts | Human oversight |
| TEEs attesting model version | Reputation gates |
| HSM-enforced signing policies | Mutable API rate limits |
| MPC multi-party approval | Permission models requiring human approval |
| *The agent cannot degrade these.* | *The agent can talk its way through these.* |

> Design constraint: even if ALL agent-influenceable layers are compromised, the remaining agent-independent layers must bound the loss to a level the economic backstop can absorb.

---

## 7. INTEGRATION — Where It Plugs In

**Section title:** `Infrastructure is shipping. The structural layer is missing.`

Logo row / integration map:

- **Wallets:** MoonPay OWS, ERC-7710, ERC-4337
- **Payments:** Coinbase x402, Stripe/Tempo MPP, Skyfire KYA
- **Identity:** Visa TAP, ERC-8004
- **Chains:** EVM-first, then cross-ecosystem

> Everyone is building plumbing. Nobody is building the load-bearing layer underneath.

---

## 8. CLOSING — The Ask

**Section title:** `The goal is not to trust the agent. It is to make the agent economically safe enough to use.`

> CCP is a hackathon-born protocol for the structural trust layer that doesn't exist yet. On-chain containment certificates. Exogenous reserves. Agent-independent bounds. No governance token. No protocol fee. No reputation theater.

**CTA:** `GitHub` / `Read the Essay` / `Join the Discussion`

---

## Design Notes

- **Tone:** Academic aggression. Every section destroys a wrong assumption before presenting the right one.
- **Color:** Dark background, monospace type for equations/code, high-contrast accent (red or amber — safety engineering vibes, not fintech blue).
- **Visual motif:** Probability distributions, not checkmarks. Bell curves, not shields.
- **No fluff:** Zero stock photos, zero "revolutionizing trust," zero "powered by blockchain." The copy does the work.
- **Key phrases to hit hard:** "category error," "scoring a distribution not an entity," "the cage is also probabilistic," "a function not a score," "load-bearing nothing."
