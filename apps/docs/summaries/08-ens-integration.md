# ENS Integration: Agent Identity and Cross-Chain Discovery

## Agent Naming

Agents are identified via ENS subnames:
- `alpha.operator.eth` → subname of `operator.eth`
- Operators can manage multiple agents as subdomains (fleet management)

## CCP Text Records

Each ENS name carries these text records:
- `ccp.certificate` — Certificate hash
- `ccp.class` — C1, C2, or C3
- `ccp.chain` — Chain ID (e.g. 296 for Hedera testnet)
- `ccp.registry` — Registry contract address

## Cross-Chain Discovery Flow

1. Agent references its ENS name in a transaction (`alpha.operator.eth`)
2. Counterparty resolves the name on Sepolia (ENS registry)
3. Retrieves CCP text records (chain ID, registry, cert hash)
4. Queries CCP registry on Hedera with the cert hash
5. Verifies certificate on-chain — no intermediary trust required

**Result:** Identity lives on ENS (Ethereum), settlement on Hedera — cross-chain discovery works seamlessly.
