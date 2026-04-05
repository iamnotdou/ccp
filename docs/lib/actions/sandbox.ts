"use server";

import { publishCertificate, revokeCertificate, checkCertificateValidity } from "./certificate";
import { executePayment, executeWithCosign } from "./spending";
import { stakeForCert } from "./auditor";
import { submitChallenge } from "./challenge";
import { depositReserve } from "./reserves";
import { verify } from "@/lib/contracts/reads";
import type { Address } from "viem";

type SandboxResult = { success: boolean; message: string; txHash?: string };

export async function sandboxPublishCert(data: Record<string, string>): Promise<SandboxResult> {
  const res = await publishCertificate({
    containmentBound: data.bound || "50000",
    certificateClass: parseInt(data.class || "2"),
    expiryDays: parseInt(data.days || "90"),
  });
  if ("error" in res) return { success: false, message: res.error };
  return { success: true, message: "Certificate published!", txHash: res.txHash };
}

export async function sandboxRevokeCert(data: Record<string, string>): Promise<SandboxResult> {
  if (!data.certHash) return { success: false, message: "Certificate hash required" };
  const res = await revokeCertificate(data.certHash);
  if ("error" in res) return { success: false, message: res.error };
  return { success: true, message: "Certificate revoked.", txHash: res.txHash };
}

export async function sandboxVerifyAgent(data: Record<string, string>): Promise<SandboxResult> {
  if (!data.agent) return { success: false, message: "Agent address required" };
  try {
    const res = await verify(
      data.agent as Address,
      parseInt(data.minClass || "2"),
      BigInt(Math.floor(parseFloat(data.maxLoss || "50000") * 1e6))
    );
    return {
      success: true,
      message: res.acceptable
        ? `Agent ACCEPTABLE. Cert: ${res.certHash.slice(0, 12)}...`
        : `Agent NOT acceptable for these requirements.`,
    };
  } catch (e: any) {
    return { success: false, message: e.message?.slice(0, 200) || "Verification failed" };
  }
}

export async function sandboxExecutePayment(data: Record<string, string>): Promise<SandboxResult> {
  if (!data.to || !data.amount) return { success: false, message: "Recipient and amount required" };
  const res = await executePayment(data.to, data.amount);
  if ("error" in res) return { success: false, message: res.error };
  return { success: true, message: `$${data.amount} payment executed.`, txHash: res.txHash };
}

export async function sandboxExecuteWithCosign(data: Record<string, string>): Promise<SandboxResult> {
  if (!data.to || !data.amount) return { success: false, message: "Recipient and amount required" };
  const res = await executeWithCosign(data.to, data.amount);
  if ("error" in res) return { success: false, message: res.error };
  return { success: true, message: `$${data.amount} payment with Ledger co-sign executed.`, txHash: res.txHash };
}

export async function sandboxStake(data: Record<string, string>): Promise<SandboxResult> {
  if (!data.certHash || !data.amount) return { success: false, message: "Cert hash and amount required" };
  const res = await stakeForCert(data.certHash, data.amount);
  if ("error" in res) return { success: false, message: res.error };
  return { success: true, message: `$${data.amount} staked on certificate.`, txHash: res.txHash };
}

export async function sandboxChallenge(data: Record<string, string>): Promise<SandboxResult> {
  if (!data.certHash) return { success: false, message: "Cert hash required" };
  const res = await submitChallenge(data.certHash, parseInt(data.type || "0"), data.evidence || "0x");
  if ("error" in res) return { success: false, message: res.error };
  return { success: true, message: "Challenge submitted with 200 USDC bond.", txHash: res.txHash };
}

export async function sandboxDeposit(data: Record<string, string>): Promise<SandboxResult> {
  if (!data.amount) return { success: false, message: "Amount required" };
  const res = await depositReserve(data.amount);
  if ("error" in res) return { success: false, message: res.error };
  return { success: true, message: `$${data.amount} deposited to reserve vault.`, txHash: res.txHash };
}

export async function sandboxCheckCert(data: Record<string, string>): Promise<SandboxResult> {
  if (!data.certHash) return { success: false, message: "Certificate hash required" };
  const res = await checkCertificateValidity(data.certHash);
  if ("error" in res) return { success: false, message: res.error };
  return {
    success: true,
    message: `Valid: ${res.valid} | Class: C${res.certificateClass} | Bound: $${Number(res.containmentBound).toLocaleString()} | Agent: ${res.agent?.slice(0, 10)}...`,
  };
}
