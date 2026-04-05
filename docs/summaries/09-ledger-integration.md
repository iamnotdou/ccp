# Ledger Hardware Integration

## Dual-Signature Architecture

The SpendingLimit contract uses the Ledger hardware device as an agent-independent control layer:

- **Below threshold (e.g. <$5k):** Agent signs alone → fast path
- **Above threshold:** Ledger hardware device must co-sign → security gate
- **Parameter changes:** Only the Ledger-derived address can modify

## Why It's Agent-Independent

Even if the agent gains full control of the operator's software, it cannot change Ledger parameters because:
- Ledger is a physically separate device
- Signing keys live inside the hardware, inaccessible to software
- Parameter change functions are authorized only for the Ledger address

## Hardware-Attested Certificate Signing

- Operator signs the certificate with Ledger (hardware identity attestation)
- Auditor attests with Ledger signature
- Immutable on-chain record of hardware involvement

## Summary

Ledger provides the guarantee that "no matter what the agent does, it cannot change these parameters." This makes spending limits genuinely agent-independent.
