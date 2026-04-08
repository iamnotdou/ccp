"use server";

import { parseUnits, type Hash, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, getWalletClient } from "@/lib/contracts/client";
import { addresses, keys } from "@/lib/contracts/config";
import { ChallengeManagerABI } from "@/lib/contracts/abis";

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

export async function submitChallenge(
  certHash: string,
  challengeType: number,
  evidence: string
) {
  try {
    // Use operator key as challenger for demo
    const challenger = getWalletClient(keys.operator);
    const bond = parseUnits("200", 6); // 200 USDC min bond

    // Approve bond
    const approveTx = await challenger.writeContract({
      address: addresses.usdc,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [addresses.challengeManager, bond],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // Submit challenge
    const txHash = await challenger.writeContract({
      address: addresses.challengeManager,
      abi: ChallengeManagerABI,
      functionName: "challenge",
      args: [certHash as Hash, challengeType, evidence as `0x${string}`],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to submit challenge" };
  }
}
