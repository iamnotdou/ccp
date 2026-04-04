/**
 * CCP Setup Script
 *
 * Run once after deploying contracts:
 * 1. Create HCS topic for CCP events
 * 2. Mint test USDC to all actors
 * 3. Fund actor accounts with HBAR for gas
 * 4. Operator deposits reserve into ReserveVault
 *
 * Usage: npm run demo:setup
 */

import "dotenv/config";
import {
  Client,
  AccountId,
  PrivateKey,
  TopicCreateTransaction,
  TransferTransaction,
  Hbar,
  AccountCreateTransaction,
} from "@hashgraph/sdk";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hederaConfig, addresses, keys } from "./config.js";
import { hederaTestnet, publicClient } from "./client.js";

const USDC_ABI = [
  {
    name: "mint",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
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

const RESERVE_VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "lock",
    type: "function",
    inputs: [{ name: "_lockUntil", type: "uint48" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "getReserveBalance",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   CCP Setup — Hedera Testnet          ║");
  console.log("╚══════════════════════════════════════╝\n");

  const operatorAccount = privateKeyToAccount(keys.operator);
  const operatorWallet = createWalletClient({
    account: operatorAccount,
    chain: hederaTestnet,
    transport: http(hederaConfig.rpcUrl),
  });

  // ─── Step 1: Create HCS Topic ───
  console.log("━━━ Step 1: Create HCS Topic ━━━\n");

  try {
    const client = Client.forTestnet();
    if (hederaConfig.hcsAccountId && hederaConfig.hcsPrivateKeyDer) {
      client.setOperator(
        AccountId.fromString(hederaConfig.hcsAccountId),
        PrivateKey.fromStringDer(hederaConfig.hcsPrivateKeyDer)
      );
    } else {
      client.setOperator(
        AccountId.fromString(hederaConfig.accountId),
        PrivateKey.fromStringECDSA(hederaConfig.privateKey.replace("0x", ""))
      );
    }

    const topicTx = new TopicCreateTransaction().setTopicMemo(
      "CCP Protocol Events — Containment Certificate Protocol"
    );

    const topicResponse = await topicTx.execute(client);
    const topicReceipt = await topicResponse.getReceipt(client);
    const topicId = topicReceipt.topicId!.toString();

    console.log(`  HCS Topic created: ${topicId}`);
    console.log(`  → Update .env: HCS_TOPIC_ID=${topicId}\n`);
  } catch (e: any) {
    console.log(`  HCS Topic creation failed: ${e.message}`);
    console.log(`  (May need to set HEDERA_PRIVATE_KEY in DER format for HCS)\n`);
  }

  // ─── Step 2: Mint test USDC ───
  console.log("━━━ Step 2: Mint Test USDC ━━━\n");

  const actors = [
    { name: "Operator", address: operatorAccount.address, amount: 500_000_000_000n }, // $500k
    {
      name: "Auditor",
      address: privateKeyToAccount(keys.auditor).address,
      amount: 100_000_000_000n,
    }, // $100k
    {
      name: "Agent",
      address: privateKeyToAccount(keys.agent).address,
      amount: 100_000_000_000n,
    }, // $100k
  ];

  for (const actor of actors) {
    try {
      const tx = await operatorWallet.writeContract({
        address: addresses.usdc,
        abi: USDC_ABI,
        functionName: "mint",
        args: [actor.address as `0x${string}`, actor.amount],
      });
      console.log(`  Minted ${Number(actor.amount) / 1e6} USDC to ${actor.name} (${actor.address.slice(0, 10)}...): ${tx}`);
    } catch (e: any) {
      console.log(`  Failed to mint to ${actor.name}: ${e.message?.slice(0, 80)}`);
    }
  }

  // Also mint to SpendingLimit contract (so agent can spend through it)
  try {
    const tx = await operatorWallet.writeContract({
      address: addresses.usdc,
      abi: USDC_ABI,
      functionName: "mint",
      args: [addresses.spendingLimit, 100_000_000_000n], // $100k
    });
    console.log(`  Minted 100000 USDC to SpendingLimit contract: ${tx}`);
  } catch (e: any) {
    console.log(`  Failed to mint to SpendingLimit: ${e.message?.slice(0, 80)}`);
  }

  // ─── Step 3: Operator deposits reserve ───
  console.log("\n━━━ Step 3: Deposit Reserve ━━━\n");

  const reserveAmount = 150_000_000_000n; // $150k (3x containment bound)

  try {
    // Approve
    const approveTx = await operatorWallet.writeContract({
      address: addresses.usdc,
      abi: USDC_ABI,
      functionName: "approve",
      args: [addresses.reserveVault, reserveAmount],
    });
    console.log(`  Approved ReserveVault: ${approveTx}`);

    // Wait for approval to confirm
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // Deposit
    const depositTx = await operatorWallet.writeContract({
      address: addresses.reserveVault,
      abi: RESERVE_VAULT_ABI,
      functionName: "deposit",
      args: [reserveAmount],
    });
    console.log(`  Deposited ${Number(reserveAmount) / 1e6} USDC to ReserveVault: ${depositTx}`);

    await publicClient.waitForTransactionReceipt({ hash: depositTx });

    // Lock until cert expiry + grace (60 days + 14 days from now)
    const lockUntil = Math.floor(Date.now() / 1000) + 74 * 24 * 3600;
    const lockTx = await operatorWallet.writeContract({
      address: addresses.reserveVault,
      abi: RESERVE_VAULT_ABI,
      functionName: "lock",
      args: [lockUntil],
    });
    console.log(`  Locked reserve until ${new Date(lockUntil * 1000).toISOString()}: ${lockTx}`);

    await publicClient.waitForTransactionReceipt({ hash: lockTx });

    // Verify
    const balance = await publicClient.readContract({
      address: addresses.reserveVault,
      abi: RESERVE_VAULT_ABI,
      functionName: "getReserveBalance",
    });
    console.log(`  Reserve balance verified: ${Number(balance) / 1e6} USDC`);
  } catch (e: any) {
    console.log(`  Reserve deposit failed: ${e.message?.slice(0, 120)}`);
  }

  // ─── Step 4: Fund actor accounts with HBAR for gas ───
  console.log("\n━━━ Step 4: Fund Actor Accounts (HBAR) ━━━\n");

  const actorAddresses = [
    { name: "Auditor", address: privateKeyToAccount(keys.auditor).address },
    { name: "Agent", address: privateKeyToAccount(keys.agent).address },
    { name: "Ledger", address: privateKeyToAccount(keys.ledger).address },
  ];

  for (const actor of actorAddresses) {
    try {
      const tx = await operatorWallet.sendTransaction({
        to: actor.address as `0x${string}`,
        value: parseEther("50"), // 50 HBAR for gas
      });
      console.log(`  Sent 50 HBAR to ${actor.name} (${actor.address.slice(0, 10)}...): ${tx}`);
    } catch (e: any) {
      console.log(`  Failed to fund ${actor.name}: ${e.message?.slice(0, 80)}`);
    }
  }

  // ─── Done ───
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   Setup Complete!                     ║");
  console.log("║                                       ║");
  console.log("║   Next: npm run demo                  ║");
  console.log("╚══════════════════════════════════════╝\n");

  console.log("Contract addresses:");
  console.log(`  USDC:             ${addresses.usdc}`);
  console.log(`  CCPRegistry:      ${addresses.registry}`);
  console.log(`  ReserveVault:     ${addresses.reserveVault}`);
  console.log(`  SpendingLimit:    ${addresses.spendingLimit}`);
  console.log(`  AuditorStaking:   ${addresses.auditorStaking}`);
  console.log(`  FeeEscrow:        ${addresses.feeEscrow}`);
  console.log(`  ChallengeManager: ${addresses.challengeManager}`);
}

main().catch(console.error);
