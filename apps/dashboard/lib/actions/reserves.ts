"use server";

import { parseUnits } from "viem";
import { publicClient, operatorClient } from "@/lib/contracts/client";
import { addresses } from "@/lib/contracts/config";
import { ReserveVaultABI } from "@/lib/contracts/abis";

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

export async function depositReserve(amountUsdc: string) {
  try {
    const operator = operatorClient();
    const amount = parseUnits(amountUsdc, 6);

    // Approve USDC
    const approveTx = await operator.writeContract({
      address: addresses.usdc,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [addresses.reserveVault, amount],
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // Deposit
    const txHash = await operator.writeContract({
      address: addresses.reserveVault,
      abi: ReserveVaultABI,
      functionName: "deposit",
      args: [amount],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to deposit" };
  }
}

export async function lockVault(lockUntilTimestamp: number) {
  try {
    const operator = operatorClient();
    const txHash = await operator.writeContract({
      address: addresses.reserveVault,
      abi: ReserveVaultABI,
      functionName: "lock",
      args: [lockUntilTimestamp],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to lock vault" };
  }
}
