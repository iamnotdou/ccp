"use client";

import { useState } from "react";
import { SponsorTag } from "@/components/dashboard/SponsorTag";
import { AddressDisplay } from "@/components/dashboard/AddressDisplay";
import {
  auditStep1_ReadConfig,
  auditStep2_CheckReserve,
  auditStep3_ClassifyAndCheck,
  auditStep4_AuditorStatus,
  auditStep5_FinalVerdict,
} from "@/lib/actions/audit";

type StepStatus = "pending" | "running" | "pass" | "fail" | "info";

interface AuditStep {
  id: number;
  title: string;
  description: string;
  status: StepStatus;
  result?: Record<string, any>;
}

const initialSteps: AuditStep[] = [
  {
    id: 1,
    title: "Read Containment Config",
    description:
      "Query SpendingLimit contract for max actions, periodic limits, cosign threshold, and Ledger cosigner address",
    status: "pending",
  },
  {
    id: 2,
    title: "Check Reserve Adequacy",
    description:
      "Verify ReserveVault has sufficient locked USDC — 3x for C2, 5x for C3",
    status: "pending",
  },
  {
    id: 3,
    title: "Classify & Check Existing Cert",
    description:
      "Determine certificate class based on reserve ratio, check if agent already has an active certificate",
    status: "pending",
  },
  {
    id: 4,
    title: "Auditor Stake Status",
    description:
      "Check auditor's track record, total staked capital, and existing stake on this certificate",
    status: "pending",
  },
  {
    id: 5,
    title: "Final Verdict",
    description:
      "Aggregate all checks — spending, Ledger, reserve, stake, certificate — and deliver PASS or FAIL",
    status: "pending",
  },
];

function CheckRow({
  label,
  value,
  pass,
}: {
  label: string;
  value: string;
  pass: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-fd-border/50 last:border-0">
      <span className="text-sm text-fd-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono">{value}</span>
        <span className={`text-xs font-bold ${pass ? "text-green-400" : "text-red-400"}`}>
          {pass ? "PASS" : "FAIL"}
        </span>
      </div>
    </div>
  );
}

export default function AuditFlowPage() {
  const [steps, setSteps] = useState<AuditStep[]>(initialSteps);
  const [currentStep, setCurrentStep] = useState(0);
  const [running, setRunning] = useState(false);

  function updateStep(id: number, updates: Partial<AuditStep>) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }

  async function runStep(stepId: number) {
    setRunning(true);
    updateStep(stepId, { status: "running" });

    try {
      let result: Record<string, any> = {};

      switch (stepId) {
        case 1:
          result = await auditStep1_ReadConfig();
          break;
        case 2:
          result = await auditStep2_CheckReserve();
          break;
        case 3:
          result = await auditStep3_ClassifyAndCheck();
          break;
        case 4:
          result = await auditStep4_AuditorStatus();
          break;
        case 5:
          result = await auditStep5_FinalVerdict();
          break;
      }

      if (result.error) {
        updateStep(stepId, { status: "fail", result });
      } else {
        // Determine pass/fail based on step results
        let status: StepStatus = "info";
        if (stepId === 1) {
          status = result.checks?.every((c: any) => c.pass) ? "pass" : "fail";
        } else if (stepId === 2) {
          status = result.checks?.every((c: any) => c.pass) ? "pass" : "fail";
        } else if (stepId === 3) {
          status = result.certClass !== "UNCLASSIFIED" ? "pass" : "fail";
        } else if (stepId === 4) {
          status = "info";
        } else if (stepId === 5) {
          status = result.verdict === "PASS" ? "pass" : "fail";
        }
        updateStep(stepId, { status, result });
        setCurrentStep(stepId);
      }
    } catch (e: any) {
      updateStep(stepId, {
        status: "fail",
        result: { error: e.message || "Unknown error" },
      });
    }

    setRunning(false);
  }

  async function runAll() {
    for (let i = 1; i <= 5; i++) {
      setRunning(true);
      updateStep(i, { status: "running" });

      try {
        let result: Record<string, any> = {};
        switch (i) {
          case 1:
            result = await auditStep1_ReadConfig();
            break;
          case 2:
            result = await auditStep2_CheckReserve();
            break;
          case 3:
            result = await auditStep3_ClassifyAndCheck();
            break;
          case 4:
            result = await auditStep4_AuditorStatus();
            break;
          case 5:
            result = await auditStep5_FinalVerdict();
            break;
        }

        if (result.error) {
          updateStep(i, { status: "fail", result });
          break;
        }

        let status: StepStatus = "info";
        if (i === 1)
          status = result.checks?.every((c: any) => c.pass) ? "pass" : "fail";
        else if (i === 2)
          status = result.checks?.every((c: any) => c.pass) ? "pass" : "fail";
        else if (i === 3)
          status = result.certClass !== "UNCLASSIFIED" ? "pass" : "fail";
        else if (i === 4) status = "info";
        else if (i === 5)
          status = result.verdict === "PASS" ? "pass" : "fail";

        updateStep(i, { status, result });
        setCurrentStep(i);
      } catch (e: any) {
        updateStep(i, {
          status: "fail",
          result: { error: e.message || "Unknown error" },
        });
        break;
      }
    }
    setRunning(false);
  }

  const allDone = currentStep >= 5;
  const finalVerdict = steps[4]?.result?.verdict;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Audit Flow</h1>
          <p className="text-fd-muted-foreground text-sm mt-1">
            Step-by-step containment audit — verify the cage holds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SponsorTag sponsor="ledger" />
          {!allDone && (
            <button
              onClick={runAll}
              disabled={running}
              className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {running ? "Running..." : "Run All"}
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              step.status === "pass"
                ? "bg-green-500"
                : step.status === "fail"
                  ? "bg-red-500"
                  : step.status === "info"
                    ? "bg-blue-500"
                    : step.status === "running"
                      ? "bg-fd-primary animate-pulse"
                      : "bg-fd-muted/30"
            }`}
          />
        ))}
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => {
          const canRun =
            step.status === "pending" &&
            !running &&
            (step.id === 1 || currentStep >= step.id - 1);

          return (
            <div
              key={step.id}
              className={`rounded-lg border bg-fd-card overflow-hidden transition-all ${
                step.status === "pass"
                  ? "border-green-500/30"
                  : step.status === "fail"
                    ? "border-red-500/30"
                    : step.status === "info"
                      ? "border-blue-500/30"
                      : step.status === "running"
                        ? "border-fd-primary/50 ring-1 ring-fd-primary/20"
                        : canRun
                          ? "border-fd-border ring-1 ring-fd-primary/10"
                          : "border-fd-border opacity-60"
              }`}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  {/* Step indicator */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      step.status === "pass"
                        ? "bg-green-500/20 text-green-400"
                        : step.status === "fail"
                          ? "bg-red-500/20 text-red-400"
                          : step.status === "info"
                            ? "bg-blue-500/20 text-blue-400"
                            : step.status === "running"
                              ? "bg-fd-primary/20 text-fd-primary"
                              : "bg-fd-muted/30 text-fd-muted-foreground"
                    }`}
                  >
                    {step.status === "pass" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    ) : step.status === "fail" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    ) : step.status === "info" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                    ) : step.status === "running" ? (
                      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      step.id
                    )}
                  </div>

                  <div className="flex-1">
                    <span className="font-semibold">{step.title}</span>
                    <p className="text-sm text-fd-muted-foreground">
                      {step.description}
                    </p>
                  </div>

                  {canRun && (
                    <button
                      onClick={() => runStep(step.id)}
                      className="rounded-lg border border-fd-border px-4 py-2 text-sm font-medium hover:bg-fd-muted/50 shrink-0"
                    >
                      Run
                    </button>
                  )}
                </div>

                {/* Results */}
                {step.result && (
                  <div className="mt-4 ml-11">
                    {step.result.error && (
                      <div className="rounded bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                        {step.result.error}
                      </div>
                    )}

                    {/* Step 1: Spending config checks */}
                    {step.id === 1 && step.result.checks && (
                      <div className="rounded-lg bg-fd-muted/10 border border-fd-border p-4">
                        <div className="text-xs font-medium text-fd-muted-foreground mb-2">
                          SPENDING LIMIT CONTRACT
                        </div>
                        {(step.result.checks as any[]).map(
                          (c: any, i: number) => (
                            <CheckRow
                              key={i}
                              label={c.label}
                              value={c.value}
                              pass={c.pass}
                            />
                          )
                        )}
                      </div>
                    )}

                    {/* Step 2: Reserve checks */}
                    {step.id === 2 && step.result.checks && (
                      <div className="rounded-lg bg-fd-muted/10 border border-fd-border p-4">
                        <div className="text-xs font-medium text-fd-muted-foreground mb-2">
                          RESERVE VAULT
                        </div>
                        {(step.result.checks as any[]).map(
                          (c: any, i: number) => (
                            <CheckRow
                              key={i}
                              label={c.label}
                              value={c.value}
                              pass={c.pass}
                            />
                          )
                        )}
                      </div>
                    )}

                    {/* Step 3: Classification */}
                    {step.id === 3 && step.result.certClass && (
                      <div className="rounded-lg bg-fd-muted/10 border border-fd-border p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-medium text-fd-muted-foreground">
                            ASSIGNED CLASS
                          </div>
                          <span
                            className={`text-sm font-bold px-2 py-0.5 rounded ${
                              step.result.certClass === "C3"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : step.result.certClass === "C2"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {step.result.certClass}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 text-sm">
                          <span className="text-fd-muted-foreground">Required Stake</span>
                          <span className="font-mono">
                            ${parseFloat(step.result.requiredStake).toLocaleString()} USDC
                          </span>
                        </div>
                        {step.result.hasExistingCert && (
                          <div className="flex items-center justify-between py-1.5 text-sm border-t border-fd-border/50">
                            <span className="text-fd-muted-foreground">
                              Existing Certificate
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  step.result.existingCertValid
                                    ? "text-green-400"
                                    : "text-yellow-400"
                                }`}
                              >
                                {step.result.existingCertValid
                                  ? "VALID"
                                  : "INVALID"}
                              </span>
                            </div>
                          </div>
                        )}
                        {step.result.agentAddress && (
                          <div className="flex items-center justify-between py-1.5 text-sm border-t border-fd-border/50">
                            <span className="text-fd-muted-foreground">Agent</span>
                            <AddressDisplay address={step.result.agentAddress} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 4: Auditor status */}
                    {step.id === 4 && step.result.auditorAddress && (
                      <div className="rounded-lg bg-fd-muted/10 border border-fd-border p-4 space-y-2">
                        <div className="text-xs font-medium text-fd-muted-foreground mb-2">
                          AUDITOR RECORD
                        </div>
                        <div className="flex items-center justify-between py-1.5 text-sm">
                          <span className="text-fd-muted-foreground">Address</span>
                          <AddressDisplay address={step.result.auditorAddress} />
                        </div>
                        <div className="flex items-center justify-between py-1.5 text-sm border-t border-fd-border/50">
                          <span className="text-fd-muted-foreground">
                            Total Attestations
                          </span>
                          <span className="font-mono">
                            {step.result.totalAttestations}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 text-sm border-t border-fd-border/50">
                          <span className="text-fd-muted-foreground">
                            Challenges Against
                          </span>
                          <span
                            className={`font-mono ${
                              step.result.successfulChallenges > 0
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                          >
                            {step.result.successfulChallenges}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-1.5 text-sm border-t border-fd-border/50">
                          <span className="text-fd-muted-foreground">
                            Active Stake
                          </span>
                          <span className="font-mono">
                            ${parseFloat(step.result.activeStake).toLocaleString()} USDC
                          </span>
                        </div>
                        {parseFloat(step.result.existingStakeOnCert) > 0 && (
                          <div className="flex items-center justify-between py-1.5 text-sm border-t border-fd-border/50">
                            <span className="text-fd-muted-foreground">
                              Stake on This Cert
                            </span>
                            <span className="font-mono text-green-400">
                              ${parseFloat(step.result.existingStakeOnCert).toLocaleString()} USDC
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 5: Final Verdict */}
                    {step.id === 5 && step.result.verdict && (
                      <div className="space-y-3">
                        <div
                          className={`rounded-lg p-4 border-2 ${
                            step.result.verdict === "PASS"
                              ? "bg-green-500/10 border-green-500/40"
                              : "bg-red-500/10 border-red-500/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {step.result.verdict === "PASS" ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            )}
                            <div>
                              <div
                                className={`text-xl font-bold ${
                                  step.result.verdict === "PASS"
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                AUDIT {step.result.verdict}
                              </div>
                              {step.result.certClass &&
                                step.result.certClass !== "UNCLASSIFIED" && (
                                  <div className="text-sm text-fd-muted-foreground">
                                    Certificate Class: {step.result.certClass}
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Summary grid */}
                          {step.result.summary && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                              {Object.entries(
                                step.result.summary as Record<string, boolean>
                              ).map(([key, val]) => (
                                <div
                                  key={key}
                                  className={`rounded px-3 py-2 text-xs font-medium flex items-center gap-1.5 ${
                                    val
                                      ? "bg-green-500/10 text-green-400"
                                      : "bg-red-500/10 text-red-400"
                                  }`}
                                >
                                  {val ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                  )}
                                  {key
                                    .replace(/([A-Z])/g, " $1")
                                    .replace(/^./, (s) => s.toUpperCase())}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {step.result.reasons &&
                          (step.result.reasons as string[]).length > 0 && (
                            <div className="rounded-lg bg-fd-muted/10 border border-fd-border p-4">
                              <div className="text-xs font-medium text-fd-muted-foreground mb-2">
                                {step.result.verdict === "PASS"
                                  ? "NOTES"
                                  : "FAILURE REASONS"}
                              </div>
                              <ul className="space-y-1">
                                {(step.result.reasons as string[]).map(
                                  (r, i) => (
                                    <li
                                      key={i}
                                      className="text-sm text-fd-muted-foreground flex items-center gap-2"
                                    >
                                      <span className="text-red-400">-</span>
                                      {r}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                        {step.result.verdict === "PASS" && (
                          <div className="rounded-lg bg-fd-primary/5 border border-fd-primary/20 p-4 text-sm">
                            <strong>The cage holds.</strong> All containment
                            constraints verified on-chain. Spending limits
                            enforced by smart contract, Ledger cosigner
                            configured, reserve locked and adequate, auditor
                            staked. This agent&apos;s maximum economic impact is
                            bounded.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset */}
      {currentStep > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => {
              setSteps(initialSteps);
              setCurrentStep(0);
            }}
            className="rounded-lg border border-fd-border px-4 py-2 text-sm text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50"
          >
            Reset Audit
          </button>
        </div>
      )}
    </div>
  );
}
