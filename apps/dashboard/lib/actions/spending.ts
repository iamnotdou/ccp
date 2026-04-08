"use server";

import { parseUnits, encodePacked, keccak256, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient, agentClient } from "@/lib/contracts/client";
import { addresses, keys } from "@/lib/contracts/config";
import { SpendingLimitABI } from "@/lib/contracts/abis";

export async function executePayment(to: string, amountUsdc: string) {
  try {
    const agent = agentClient();
    const value = parseUnits(amountUsdc, 6);

    const txHash = await agent.writeContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "execute",
      args: [to as Address, value, "0x"],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Transaction failed" };
  }
}

export async function executeWithCosign(to: string, amountUsdc: string) {
  try {
    const agent = agentClient();
    const value = parseUnits(amountUsdc, 6);

    // Generate Ledger co-signature
    const txHash_to_sign = keccak256(
      encodePacked(
        ["address", "uint256", "uint256", "address"],
        [to as Address, value, 296n, addresses.spendingLimit]
      )
    );

    const ledgerAccount = privateKeyToAccount(keys.ledger);
    const cosig = await ledgerAccount.signMessage({ message: { raw: txHash_to_sign } });

    const txHash = await agent.writeContract({
      address: addresses.spendingLimit,
      abi: SpendingLimitABI,
      functionName: "executeWithCosign",
      args: [to as Address, value, "0x", cosig],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Transaction failed" };
  }
}
