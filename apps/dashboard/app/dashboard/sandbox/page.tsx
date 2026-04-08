"use client";

import { SandboxAction } from "@/components/playground/SandboxAction";
import {
  sandboxPublishCert,
  sandboxRevokeCert,
  sandboxVerifyAgent,
  sandboxExecutePayment,
  sandboxExecuteWithCosign,
  sandboxStake,
  sandboxChallenge,
  sandboxDeposit,
  sandboxCheckCert,
} from "@/lib/actions/sandbox";

const CertIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>;
const PayIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const ShieldIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>;
const AlertIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>;
const VaultIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>;
const SearchIcon = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;

export default function SandboxPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img src="/bound-seal.png" alt="Bound" width={48} height={48} />
        <div>
          <h1 className="text-3xl font-bold">Protocol Sandbox</h1>
          <p className="text-fd-muted-foreground mt-1">
            Trigger any Bound flow interactively. Each action executes a real transaction on Hedera Testnet.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <SandboxAction
          title="Publish Certificate"
          description="Operator publishes a new containment certificate"
          icon={CertIcon}
          color="bg-green-500/5"
          inputs={[
            { name: "bound", label: "Containment Bound (USDC)", placeholder: "50000" },
            { name: "class", label: "Certificate Class (1-3)", placeholder: "2" },
            { name: "days", label: "Expiry (days)", placeholder: "90" },
          ]}
          action={sandboxPublishCert}
        />

        <SandboxAction
          title="Verify Agent"
          description="Check if an agent meets trust requirements (read-only)"
          icon={SearchIcon}
          color="bg-blue-500/5"
          inputs={[
            { name: "agent", label: "Agent Address", placeholder: "0x..." },
            { name: "minClass", label: "Min Class (1-3)", placeholder: "2" },
            { name: "maxLoss", label: "Max Acceptable Loss (USDC)", placeholder: "50000" },
          ]}
          action={sandboxVerifyAgent}
        />

        <SandboxAction
          title="Check Certificate"
          description="Look up certificate details by hash (read-only)"
          icon={CertIcon}
          color="bg-blue-500/5"
          inputs={[
            { name: "certHash", label: "Certificate Hash", placeholder: "0x..." },
          ]}
          action={sandboxCheckCert}
        />

        <SandboxAction
          title="Execute Payment"
          description="Agent executes a payment (agent-only signature)"
          icon={PayIcon}
          color="bg-blue-500/5"
          inputs={[
            { name: "to", label: "Recipient Address", placeholder: "0x..." },
            { name: "amount", label: "Amount (USDC)", placeholder: "500" },
          ]}
          action={sandboxExecutePayment}
        />

        <SandboxAction
          title="Pay with Ledger Co-sign"
          description="Payment requiring Ledger hardware co-signature"
          icon={PayIcon}
          color="bg-violet-500/5"
          inputs={[
            { name: "to", label: "Recipient Address", placeholder: "0x..." },
            { name: "amount", label: "Amount (USDC)", placeholder: "7000" },
          ]}
          action={sandboxExecuteWithCosign}
        />

        <SandboxAction
          title="Stake as Auditor"
          description="Auditor stakes capital against a certificate"
          icon={ShieldIcon}
          color="bg-emerald-500/5"
          inputs={[
            { name: "certHash", label: "Certificate Hash", placeholder: "0x..." },
            { name: "amount", label: "Stake Amount (USDC)", placeholder: "1500" },
          ]}
          action={sandboxStake}
        />

        <SandboxAction
          title="Submit Challenge"
          description="Challenge a certificate (200 USDC bond)"
          icon={AlertIcon}
          color="bg-yellow-500/5"
          inputs={[
            { name: "certHash", label: "Certificate Hash", placeholder: "0x..." },
            { name: "type", label: "Type (0-4)", placeholder: "0" },
            { name: "evidence", label: "Evidence Hash", placeholder: "0x..." },
          ]}
          action={sandboxChallenge}
        />

        <SandboxAction
          title="Deposit Reserve"
          description="Operator deposits USDC into the reserve vault"
          icon={VaultIcon}
          color="bg-violet-500/5"
          inputs={[
            { name: "amount", label: "Amount (USDC)", placeholder: "10000" },
          ]}
          action={sandboxDeposit}
        />

        <SandboxAction
          title="Revoke Certificate"
          description="Operator revokes an active certificate"
          icon={CertIcon}
          color="bg-red-500/5"
          inputs={[
            { name: "certHash", label: "Certificate Hash", placeholder: "0x..." },
          ]}
          action={sandboxRevokeCert}
        />
      </div>

      <div className="rounded-lg border border-fd-border bg-fd-card p-5">
        <h3 className="text-sm font-bold mb-2">How the Sandbox Works</h3>
        <div className="text-sm text-fd-muted-foreground space-y-1">
          <p>Each action card triggers a real smart contract transaction on Hedera Testnet using the demo keys configured in the environment.</p>
          <ul className="list-disc list-inside ml-2 space-y-0.5">
            <li><strong>Publish / Revoke / Deposit</strong> — signed by the demo operator</li>
            <li><strong>Execute Payment</strong> — signed by the demo agent</li>
            <li><strong>Cosigned Payment</strong> — agent + simulated Ledger co-sign</li>
            <li><strong>Stake</strong> — signed by the demo auditor</li>
            <li><strong>Challenge</strong> — signed by the demo operator (as challenger)</li>
            <li><strong>Verify / Check</strong> — read-only, no transaction</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
