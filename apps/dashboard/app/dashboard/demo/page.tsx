"use client";

import { useState, useRef } from "react";
import { SponsorTag } from "@/components/dashboard/SponsorTag";
import { TimelineEvent } from "@/components/dashboard/TimelineEvent";
import { ClassBadge } from "@/components/dashboard/ClassBadge";
import { GaugeBar } from "@/components/dashboard/GaugeBar";
import { UsdcAmount } from "@/components/dashboard/UsdcAmount";
import { RiskReductionBar } from "@/components/dashboard/RiskReductionBar";
import {
  demoPhase1_AuditorAttest,
  demoPhase2_PublishCert,
  demoPhase3_Verify,
  demoPhase4_SmallPayment,
  demoPhase5_LargePayment,
  demoPhase6_OverLimit,
  demoPhase7_Timeline,
} from "@/lib/actions/demo";

type PhaseStatus = "pending" | "running" | "success" | "error";

interface Phase {
  id: number;
  title: string;
  description: string;
  sponsor: "ledger" | "ens";
  status: PhaseStatus;
  result?: Record<string, any>;
}

const initialPhases: Phase[] = [
  {
    id: 1,
    title: "Auditor Audit & Attestation",
    description: "Auditor verifies containment bounds, stakes $1,500 USDC, signs attestation via Ledger",
    sponsor: "ledger",
    status: "pending",
  },
  {
    id: 2,
    title: "Certificate Publication",
    description: "Operator publishes C2 certificate with $50,000 containment bound, Ledger-signed",
    sponsor: "ledger",
    status: "pending",
  },
  {
    id: 3,
    title: "Counterparty Verification",
    description: "Resolve agent ENS name, query registry, verify certificate and reserves",
    sponsor: "ens",
    status: "pending",
  },
  {
    id: 4,
    title: "Small Payment ($500)",
    description: "Agent executes $500 payment — below cosign threshold, agent signature only",
    sponsor: "ledger",
    status: "pending",
  },
  {
    id: 5,
    title: "Large Payment ($7,000)",
    description: "Agent executes $7,000 payment — above threshold, Ledger co-signature required",
    sponsor: "ledger",
    status: "pending",
  },
  {
    id: 6,
    title: "Over-Limit Payment ($45,000)",
    description: "Agent attempts $45,000 — BLOCKED. Even with Ledger co-sign, periodic limit holds.",
    sponsor: "ledger",
    status: "pending",
  },
  {
    id: 7,
    title: "Event Timeline (HCS)",
    description: "Full audit trail from Hedera Consensus Service — every transition recorded",
    sponsor: "ledger",
    status: "pending",
  },
];

export default function DemoPage() {
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const spendingRef = useRef<{ spent: string; limit: string }>({ spent: "0", limit: "50000" });

  function updatePhase(id: number, updates: Partial<Phase>) {
    setPhases((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  async function runPhase(phaseId: number) {
    updatePhase(phaseId, { status: "running" });
    let result: Record<string, any> = {};

    try {
      switch (phaseId) {
        case 1:
          result = await demoPhase1_AuditorAttest();
          break;
        case 2:
          result = await demoPhase2_PublishCert();
          break;
        case 3:
          result = await demoPhase3_Verify();
          break;
        case 4:
          result = await demoPhase4_SmallPayment();
          break;
        case 5:
          result = await demoPhase5_LargePayment();
          break;
        case 6:
          result = await demoPhase6_OverLimit();
          break;
        case 7:
          result = await demoPhase7_Timeline();
          break;
      }

      // Track spending state for gauge
      if ((phaseId === 4 || phaseId === 5) && result.spent && result.limit) {
        spendingRef.current = { spent: result.spent, limit: result.limit };
      }

      if (result.error && !result.blocked) {
        updatePhase(phaseId, { status: "error", result });
      } else {
        updatePhase(phaseId, { status: "success", result });
        setCurrentPhase(phaseId);
        // Cooldown to prevent nonce collisions
        setCooldown(true);
        setTimeout(() => setCooldown(false), 1500);
      }
    } catch (e: any) {
      updatePhase(phaseId, {
        status: "error",
        result: { error: e.message || "Unknown error" },
      });
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Live Demo</h1>
        <p className="text-fd-muted-foreground text-sm mt-1">
          Interactive walkthrough of the full CCP protocol flow
        </p>
        <div className="flex gap-2 mt-2">
          <SponsorTag sponsor="ledger" />
          <SponsorTag sponsor="ens" />
        </div>
      </div>

      <div className="space-y-4">
        {phases.map((phase) => {
          const isNext = phase.id === currentPhase + 1;
          const canRun = phase.status === "pending" && !cooldown && (phase.id === 1 || currentPhase >= phase.id - 1);

          return (
            <div
              key={phase.id}
              className={`rounded-lg border bg-fd-card overflow-hidden transition-all ${
                phase.status === "success"
                  ? "border-green-500/30"
                  : phase.status === "error"
                    ? "border-red-500/30"
                    : phase.status === "running"
                      ? "border-fd-primary/50 ring-1 ring-fd-primary/20"
                      : isNext
                        ? "border-fd-border ring-1 ring-fd-primary/10"
                        : "border-fd-border opacity-60"
              }`}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  {/* Step indicator */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      phase.status === "success"
                        ? "bg-green-500/20 text-green-400"
                        : phase.status === "error"
                          ? "bg-red-500/20 text-red-400"
                          : phase.status === "running"
                            ? "bg-fd-primary/20 text-fd-primary"
                            : "bg-fd-muted/30 text-fd-muted-foreground"
                    }`}
                  >
                    {phase.status === "success" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : phase.status === "running" ? (
                      <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    ) : (
                      phase.id
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{phase.title}</span>
                      <SponsorTag sponsor={phase.sponsor} />
                    </div>
                    <p className="text-sm text-fd-muted-foreground">{phase.description}</p>
                  </div>

                  {canRun && (
                    <button
                      onClick={() => runPhase(phase.id)}
                      className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground hover:opacity-90 shrink-0"
                    >
                      Execute
                    </button>
                  )}
                </div>

                {/* Results */}
                {phase.result && (
                  <div className="mt-4 ml-11">
                    {phase.result.error && !phase.result.blocked && (
                      <div className="rounded bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                        {phase.result.error}
                      </div>
                    )}

                    {/* Phase 1: Audit findings */}
                    {phase.id === 1 && phase.result.findings && (
                      <div className="space-y-2">
                        {phase.result.reusedExisting && (
                          <div className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1 inline-block">
                            Using existing certificate and stake
                          </div>
                        )}
                        <div className="text-xs text-fd-muted-foreground font-medium">AUDIT FINDINGS</div>
                        <div className="rounded bg-fd-muted/20 p-3 font-mono text-xs space-y-1">
                          {(phase.result.findings as string[]).map((f: string, i: number) => (
                            <div key={i}>{f}</div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Class: <strong>{phase.result.certClass}</strong></span>
                          <span>Stake: <strong>${phase.result.stakeAmount} USDC</strong></span>
                          {phase.result.txHash && (
                            <a href={`https://hashscan.io/testnet/transaction/${phase.result.txHash}`} target="_blank" rel="noopener noreferrer" className="text-fd-primary text-xs hover:underline font-mono">
                              {(phase.result.txHash as string).slice(0, 18)}...
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Phase 2: Published cert — Certificate Card */}
                    {phase.id === 2 && phase.result.certHash && (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-fd-border bg-fd-muted/10 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <ClassBadge certClass={2} showDesc />
                            {phase.result.isValid && (
                              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded px-2 py-0.5 font-medium">
                                VALID
                              </span>
                            )}
                            {phase.result.reusedExisting && (
                              <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5">
                                Existing
                              </span>
                            )}
                            <SponsorTag sponsor="ledger" />
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-fd-muted-foreground mb-0.5">Containment Bound</div>
                              <div className="font-semibold">
                                <UsdcAmount amount="50000" size="sm" />
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-fd-muted-foreground mb-0.5">Status</div>
                              <div className="text-green-400 font-medium text-sm">
                                {phase.result.reusedExisting ? "Certificate Active" : "Certificate Published"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 font-mono text-[11px] break-all text-fd-muted-foreground">{phase.result.certHash}</div>
                          {phase.result.txHash && (
                            <a href={`https://hashscan.io/testnet/transaction/${phase.result.txHash}`} target="_blank" rel="noopener noreferrer" className="text-fd-primary text-xs hover:underline font-mono mt-2 inline-block">
                              View on HashScan
                            </a>
                          )}
                          <div className="mt-3">
                            <RiskReductionBar compact />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Phase 3: Verification */}
                    {phase.id === 3 && phase.result.acceptable !== undefined && (
                      <div className="space-y-2">
                        <div className={`text-sm font-medium ${phase.result.acceptable ? "text-green-400" : "text-red-400"}`}>
                          {phase.result.acceptable ? "VERIFICATION PASSED" : "VERIFICATION FAILED"}
                        </div>
                        <div className="text-xs text-fd-muted-foreground space-y-1">
                          <div>Auditor stake: ${phase.result.stake} USDC</div>
                          <div>Reserve balance: ${phase.result.reserve} USDC</div>
                        </div>
                      </div>
                    )}

                    {/* Phase 4 & 5: Payment success with GaugeBar */}
                    {(phase.id === 4 || phase.id === 5) && phase.result.txHash && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-medium text-sm">
                            {phase.id === 5 ? "Ledger Co-Signed" : "Agent Signed"}
                          </span>
                          <a href={`https://hashscan.io/testnet/transaction/${phase.result.txHash}`} target="_blank" rel="noopener noreferrer" className="text-fd-primary text-xs hover:underline font-mono">
                            View on HashScan
                          </a>
                        </div>
                        <GaugeBar
                          spent={phase.result.spent}
                          limit={phase.result.limit}
                          label="Period Spending"
                        />
                      </div>
                    )}

                    {/* Phase 6: BLOCKED — Enhanced */}
                    {phase.id === 6 && phase.result.blocked && (
                      <div className="space-y-3">
                        <div className="rounded-lg bg-red-500/10 border-2 border-red-500/40 p-4 animate-pulse">
                          <div className="flex items-center gap-2 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <span className="text-red-400 font-bold text-xl">TRANSACTION BLOCKED</span>
                          </div>
                          <div className="text-sm text-red-300">
                            Reason: {phase.result.reason}
                          </div>
                          <div className="text-sm text-fd-muted-foreground mt-1">
                            Remaining allowance: ${phase.result.remaining} USDC
                          </div>
                        </div>
                        <GaugeBar
                          spent={spendingRef.current.spent}
                          limit={spendingRef.current.limit}
                          label="Period Spending (at block)"
                        />
                        <div className="rounded-lg bg-fd-primary/5 border border-fd-primary/20 p-4 text-sm">
                          <strong>The cage held.</strong> The agent could not exceed its containment bound —
                          even with Ledger co-signature. Smart contract limits are absolute.
                          That is the CCP thesis.
                        </div>
                      </div>
                    )}

                    {/* Phase 7: Timeline */}
                    {phase.id === 7 && phase.result.events && (
                      <div>
                        {(phase.result.events as any[]).length > 0 ? (
                          <div className="max-h-60 overflow-y-auto">
                            {(phase.result.events as any[]).map((evt: any, i: number) => (
                              <TimelineEvent
                                key={i}
                                type={evt.type}
                                timestamp={evt.timestamp}
                                details={evt.details}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-fd-muted-foreground">
                            {phase.result.error || "No events recorded yet"}
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
      {currentPhase > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => {
              setPhases(initialPhases);
              setCurrentPhase(0);
              spendingRef.current = { spent: "0", limit: "50000" };
            }}
            className="rounded-lg border border-fd-border px-4 py-2 text-sm text-fd-muted-foreground hover:text-fd-foreground hover:bg-fd-muted/50"
          >
            Reset Demo
          </button>
        </div>
      )}
    </div>
  );
}
