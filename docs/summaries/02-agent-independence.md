# Agent-Independent vs Agent-Influenceable Containment

CCP's most critical distinction: can the agent degrade a given constraint, or can't it?

## Agent-Independent Controls

Mechanisms the agent cannot influence in any way:

- **Formally verified smart contracts** — Agent cannot modify the code
- **TEE hardware attestations** — Outside the agent's causal reach
- **HSM signing policies** — Physically separated
- **MPC multi-party approval** — Requires independent parties

## Agent-Influenceable Controls

Mechanisms that depend on human judgment or systems the agent can interact with:

- **Human oversight** — Agent can persuade humans
- **Reputation scores** — Agent can game the scoring
- **Mutable API rate limits** — Configuration can be changed

## The Design Rule

> Even if ALL agent-influenceable layers are compromised, remaining agent-independent layers must bound loss to a level exogenous reserves can absorb.

The `agent_independent: true/false` flag on each constraint declares this status. **Only constraints marked `true` contribute to the containment bound calculation.**
