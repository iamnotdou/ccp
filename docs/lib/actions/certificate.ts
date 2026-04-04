"use server";

import { keccak256, encodePacked, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, operatorClient, auditorClient } from "@/lib/contracts/client";
import { addresses, keys } from "@/lib/contracts/config";
import { CCPRegistryABI } from "@/lib/contracts/abis";

export async function publishCertificate(params: {
  containmentBound: string; // USDC amount as string e.g. "50000"
  certificateClass: number; // 1, 2, or 3
  expiryDays: number;
}) {
  try {
    const operator = operatorClient();
    const agentAccount = privateKeyToAccount(keys.agent);
    const auditorAccount = privateKeyToAccount(keys.auditor);

    const bound = BigInt(Math.floor(parseFloat(params.containmentBound) * 1e6));
    const expiresAt = Math.floor(Date.now() / 1000) + params.expiryDays * 86400;

    // Compute cert hash
    const certHash = keccak256(
      encodePacked(
        ["address", "address", "uint256", "string"],
        [agentAccount.address, operator.account.address, BigInt(Date.now()), "ccp-v0.2"]
      )
    );

    // Operator signs cert hash
    const operatorSig = await operator.account.signMessage({ message: { raw: certHash } });

    // Auditor signs cert hash
    const auditorSig = await auditorAccount.signMessage({ message: { raw: certHash } });

    const publishParams = {
      certHash,
      agent: agentAccount.address,
      certificateClass: params.certificateClass,
      expiresAt,
      containmentBound: bound,
      reserveVault: addresses.reserveVault,
      spendingLimit: addresses.spendingLimit,
      ipfsUri: "ipfs://QmCCPDemoCertificate",
    };

    const txHash = await operator.writeContract({
      address: addresses.registry,
      abi: CCPRegistryABI,
      functionName: "publish",
      args: [publishParams, operatorSig, [auditorSig]],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to publish certificate" };
  }
}
