# HCS (Hedera Consensus Service) Audit Trail

## What It Does

All certificate lifecycle events are published to a Hedera HCS topic, creating an immutable, timestamped event stream.

## Logged Events

- `CertificatePublished` — New certificate published
- `CertificateRevoked` — Certificate revoked
- `TransactionExecuted` — Agent payment processed
- `TransactionBlocked` — Agent payment rejected
- `ChallengeSubmitted` — Dispute initiated
- `ChallengeResolved` — Verdict rendered
- `Slashed` — Auditor stake slashed

## Why It Matters

Mirror Node queries let anyone access:
- Full timeline of agent activity
- History of auditor attestations
- Challenge outcomes
- Slash events

**Use cases:** Perfect audit trail for regulators, insurers, and counterparties.
