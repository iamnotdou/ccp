"use server";

import { parseUnits, type Hash } from "viem";
import { publicClient, auditorClient } from "@/lib/contracts/client";
import { addresses } from "@/lib/contracts/config";
import { AuditorStakingABI } from "@/lib/contracts/abis";

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export async function stakeForCert(certHash: string, amountUsdc: string) {
  try {
    const auditor = auditorClient();
    const amount = parseUnits(amountUsdc, 6);

    // Approve
    const approveTx = await auditor.writeContract({
      address: addresses.usdc,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [addresses.auditorStaking, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // Stake
    const txHash = await auditor.writeContract({
      address: addresses.auditorStaking,
      abi: AuditorStakingABI,
      functionName: "stake",
      args: [certHash as Hash, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to stake" };
  }
}

export async function releaseStake(certHash: string) {
  try {
    const auditor = auditorClient();
    const txHash = await auditor.writeContract({
      address: addresses.auditorStaking,
      abi: AuditorStakingABI,
      functionName: "release",
      args: [certHash as Hash],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to release stake" };
  }
}
