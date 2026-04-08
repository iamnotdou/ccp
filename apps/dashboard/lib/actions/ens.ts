"use server";

import {
  createPublicClient,
  createWalletClient,
  http,
  namehash,
  formatUnits,
  formatEther,
  type Address,
  type Hash,
} from "viem";
import { sepolia } from "viem/chains";
import { normalize } from "viem/ens";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "@/lib/contracts/client";
import { addresses, keys } from "@/lib/contracts/config";
import { CCPRegistryABI } from "@/lib/contracts/abis";
import crypto from "crypto";

const ENS_RPC = process.env.ENS_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const CONTROLLER = "0xFED6a969AaA60E4961FCD3EBF1A2e8913ac65B72" as Address;
const RESOLVER = "0x8FADE66B79cC9f707aB26799354482EB93a5B7dD" as Address;
const DURATION = 31536000; // 1 year

const CONTROLLER_ABI = [
  { name: "rentPrice", type: "function", inputs: [{ name: "name", type: "string" }, { name: "duration", type: "uint256" }], outputs: [{ name: "base", type: "uint256" }, { name: "premium", type: "uint256" }], stateMutability: "view" },
  { name: "makeCommitment", type: "function", inputs: [{ name: "name", type: "string" }, { name: "owner", type: "address" }, { name: "duration", type: "uint256" }, { name: "secret", type: "bytes32" }, { name: "resolver", type: "address" }, { name: "data", type: "bytes[]" }, { name: "reverseRecord", type: "bool" }, { name: "ownerControlledFuses", type: "uint16" }], outputs: [{ type: "bytes32" }], stateMutability: "view" },
  { name: "commit", type: "function", inputs: [{ name: "commitment", type: "bytes32" }], outputs: [], stateMutability: "nonpayable" },
  { name: "register", type: "function", inputs: [{ name: "name", type: "string" }, { name: "owner", type: "address" }, { name: "duration", type: "uint256" }, { name: "secret", type: "bytes32" }, { name: "resolver", type: "address" }, { name: "data", type: "bytes[]" }, { name: "reverseRecord", type: "bool" }, { name: "ownerControlledFuses", type: "uint16" }], outputs: [], stateMutability: "payable" },
] as const;

const RESOLVER_ABI = [
  { name: "setText", type: "function", inputs: [{ name: "node", type: "bytes32" }, { name: "key", type: "string" }, { name: "value", type: "string" }], outputs: [], stateMutability: "nonpayable" },
  { name: "setAddr", type: "function", inputs: [{ name: "node", type: "bytes32" }, { name: "addr", type: "address" }], outputs: [], stateMutability: "nonpayable" },
] as const;

function getSepoliaClients() {
  const account = privateKeyToAccount(keys.operator);
  const sepoliaPublic = createPublicClient({
    chain: sepolia,
    transport: http(ENS_RPC),
  });
  const sepoliaWallet = createWalletClient({
    account,
    chain: sepolia,
    transport: http(ENS_RPC),
  });
  return { sepoliaPublic, sepoliaWallet, account };
}

// ─── Register ENS Name ───

export async function registerEnsName(ensName: string): Promise<{
  txHash?: string;
  error?: string;
  owner?: string;
  resolvesTo?: string;
}> {
  try {
    const label = ensName.replace(/\.eth$/, "");
    if (label.length < 3) return { error: "ENS names must be at least 3 characters" };

    const { sepoliaPublic, sepoliaWallet, account } = getSepoliaClients();
    const agentAccount = privateKeyToAccount(keys.agent);

    // Check balance
    const balance = await sepoliaPublic.getBalance({ address: account.address });
    if (balance === 0n) return { error: "No Sepolia ETH. Fund the operator address first." };

    // Get rent price
    const [base] = await sepoliaPublic.readContract({
      address: CONTROLLER,
      abi: CONTROLLER_ABI,
      functionName: "rentPrice",
      args: [label, BigInt(DURATION)],
    });
    const cost = base * 110n / 100n;

    // Step 1: Commit
    const secret = `0x${crypto.randomBytes(32).toString("hex")}` as `0x${string}`;
    const commitment = await sepoliaPublic.readContract({
      address: CONTROLLER,
      abi: CONTROLLER_ABI,
      functionName: "makeCommitment",
      args: [label, account.address, BigInt(DURATION), secret, RESOLVER, [], true, 0],
    });

    const commitTx = await sepoliaWallet.writeContract({
      address: CONTROLLER,
      abi: CONTROLLER_ABI,
      functionName: "commit",
      args: [commitment],
    });
    await sepoliaPublic.waitForTransactionReceipt({ hash: commitTx });

    // Step 2: Wait for commitment maturity
    await new Promise((r) => setTimeout(r, 65000));

    // Step 3: Register
    const registerTx = await sepoliaWallet.writeContract({
      address: CONTROLLER,
      abi: CONTROLLER_ABI,
      functionName: "register",
      args: [label, account.address, BigInt(DURATION), secret, RESOLVER, [], true, 0],
      value: cost,
    });
    await sepoliaPublic.waitForTransactionReceipt({ hash: registerTx });

    // Set address to agent
    const node = namehash(normalize(`${label}.eth`));
    const addrTx = await sepoliaWallet.writeContract({
      address: RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "setAddr",
      args: [node, agentAccount.address],
    });
    await sepoliaPublic.waitForTransactionReceipt({ hash: addrTx });

    return {
      txHash: registerTx,
      owner: account.address,
      resolvesTo: agentAccount.address,
    };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "ENS registration failed" };
  }
}

// ─── Setup CCP Text Records ───

export async function setupEnsRecords(ensName: string): Promise<{
  success?: number;
  total?: number;
  error?: string;
}> {
  try {
    const { sepoliaPublic, sepoliaWallet } = getSepoliaClients();
    const agentAccount = privateKeyToAccount(keys.agent);

    // Get current certificate data from Hedera
    let certHash = "0x";
    let certClass = "C2";
    let containmentBound = "50000";
    let expiresAt = "";

    try {
      const hash = await publicClient.readContract({
        address: addresses.registry,
        abi: CCPRegistryABI,
        functionName: "getActiveCertificate",
        args: [agentAccount.address],
      }) as string;

      const zeroCert = "0x0000000000000000000000000000000000000000000000000000000000000000";
      if (hash && hash !== zeroCert) {
        certHash = hash;
        const cert = await publicClient.readContract({
          address: addresses.registry,
          abi: CCPRegistryABI,
          functionName: "getCertificate",
          args: [hash as Hash],
        }) as any;
        const classNames = ["NONE", "C1", "C2", "C3"];
        certClass = classNames[cert.certificateClass] || "C2";
        containmentBound = formatUnits(cert.containmentBound as bigint, 6);
        expiresAt = String(cert.expiresAt);
      }
    } catch {}

    const textRecords: Record<string, string> = {
      "ccp.certificate": certHash,
      "ccp.class": certClass,
      "ccp.bound": containmentBound,
      "ccp.chain": "296",
      "ccp.registry": addresses.registry,
      "ccp.reserve": addresses.reserveVault,
      "ccp.role": "agent",
    };
    if (expiresAt) textRecords["ccp.expires"] = expiresAt;

    // Get resolver
    const resolverAddr = await sepoliaPublic.getEnsResolver({ name: normalize(ensName) });
    if (!resolverAddr) return { error: "No resolver found for this ENS name. Is it registered?" };

    const node = namehash(normalize(ensName));
    let success = 0;

    for (const [key, value] of Object.entries(textRecords)) {
      try {
        const tx = await sepoliaWallet.writeContract({
          address: resolverAddr as Address,
          abi: RESOLVER_ABI,
          functionName: "setText",
          args: [node, key, value],
        });
        await sepoliaPublic.waitForTransactionReceipt({ hash: tx });
        success++;
      } catch {}
    }

    return { success, total: Object.keys(textRecords).length };
  } catch (e: any) {
    return { error: e.message?.slice(0, 200) || "Failed to set ENS records" };
  }
}
