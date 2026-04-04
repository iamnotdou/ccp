import { type Hash, type Address, encodePacked, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, getWalletClient } from "../client.js";
import { SpendingLimitABI, CCPRegistryABI } from "../contracts/index.js";
import { addresses, keys } from "../config.js";

/**
 * Ledger Co-Signer Module
 *
 * In production: uses @ledgerhq/device-management-kit to interact with
 * physical Ledger hardware device. The Ledger signs transactions that
 * exceed the cosign threshold — this is the agent-independent containment.
 *
 * For hackathon demo: simulates Ledger signing with a separate private key.
 * The key point is the ARCHITECTURE — the SpendingLimit contract enforces
 * dual-signature, and only the Ledger-derived address can change parameters.
 *
 * In a real deployment, `keys.ledger` would be replaced by:
 *   const dmk = new DeviceManagementKit();
 *   const device = await dmk.startDiscovering().first();
 *   const signature = await device.signPersonalMessage(txHash);
 */

export interface CosignRequest {
  to: Address;
  value: bigint;
  spendingLimitAddress: Address;
  chainId: number;
}

/**
 * Generate a Ledger co-signature for a transaction above the cosign threshold.
 * The SpendingLimit contract verifies: keccak256(to, value, chainId, spendingLimit)
 */
export async function ledgerCosign(request: CosignRequest): Promise<Hash> {
  const txHash = keccak256(
    encodePacked(
      ["address", "uint256", "uint256", "address"],
      [request.to, request.value, BigInt(request.chainId), request.spendingLimitAddress]
    )
  );

  // In production: send txHash to Ledger device via DMK
  // Ledger displays Clear Signing JSON showing:
  //   "Co-sign Agent Transaction (above threshold)"
  //   Recipient: <to>
  //   Amount: <value> USDC
  //   Period Spent: <current> / <limit>
  // Operator physically approves on device.

  // For demo: sign with the ledger private key
  const account = privateKeyToAccount(keys.ledger);
  const signature = await account.signMessage({ message: { raw: txHash } });

  console.log(`  [Ledger] Co-signed transaction: ${request.value} to ${request.to}`);
  return signature;
}

/**
 * Sign a CCP certificate hash with the operator's Ledger device.
 * This produces a hardware-attested operator signature.
 */
export async function ledgerSignCertificate(certHash: Hash): Promise<Hash> {
  // In production: send certHash to Ledger device
  // Clear Signing displays:
  //   "Publish CCP Certificate"
  //   Agent: <agent ENS name>
  //   Class: C2
  //   Containment Bound: $50,000 USDC
  //   Expires: <date>

  const account = privateKeyToAccount(keys.operator);
  const signature = await account.signMessage({ message: { raw: certHash } });

  console.log(`  [Ledger] Operator signed certificate: ${certHash.slice(0, 18)}...`);
  return signature;
}

/**
 * Sign a CCP certificate hash as an auditor attestation with Ledger.
 * Hardware-attested audit signature.
 */
export async function ledgerSignAttestation(certHash: Hash): Promise<Hash> {
  // Clear Signing displays:
  //   "Attest CCP Certificate"
  //   Agent: <agent ENS name>
  //   Class: C2
  //   Containment Bound: $50,000 USDC
  //   Your Stake: $1,500 USDC

  const account = privateKeyToAccount(keys.auditor);
  const signature = await account.signMessage({ message: { raw: certHash } });

  console.log(`  [Ledger] Auditor signed attestation: ${certHash.slice(0, 18)}...`);
  return signature;
}

/**
 * Execute a transaction through SpendingLimit with Ledger co-signature.
 */
export async function executeWithLedgerCosign(
  to: Address,
  value: bigint,
  spendingLimitAddress: Address
): Promise<Hash> {
  const cosig = await ledgerCosign({
    to,
    value,
    spendingLimitAddress,
    chainId: 296, // Hedera testnet
  });

  const agentWallet = getWalletClient(keys.agent);
  const txHash = await agentWallet.writeContract({
    address: spendingLimitAddress,
    abi: SpendingLimitABI,
    functionName: "executeWithCosign",
    args: [to, value, "0x", cosig],
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  console.log(`  [Agent] Executed with Ledger co-sign: ${txHash}`);
  return txHash;
}
