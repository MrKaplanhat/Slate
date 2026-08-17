"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Button, Card, Input, Label } from "@/components/ui/primitives";
import { authService } from "@/lib/services/authService";
import { loadDemoData, resetWorkspace } from "@/lib/demo-data";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { workspace, user, refresh: refreshStore } = useStore();
  const router = useRouter();
  const [name, setName] = useState(workspace?.name ?? "");
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (!workspace || !user) return null;

  async function saveWorkspace() {
    await authService.updateWorkspace(workspace!.id, { name });
    refreshStore();
  }

  async function toggle(field: "callSheetEnabled" | "reminderEnabled" | "finalReminderEnabled") {
    await authService.updateWorkspace(workspace!.id, { [field]: !workspace![field] });
    refreshStore();
  }

  function handleReset() {
    resetWorkspace(workspace!.id);
    setConfirmingReset(false);
    refreshStore();
    router.push("/dashboard");
  }

  function handleLoadDemo() {
    loadDemoData(workspace!.id);
    router.push("/dashboard");
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide mb-4">Workspace</h2>
          <Label>Production Company Name</Label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={saveWorkspace}>Save</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide mb-4">Communication Defaults</h2>
          <div className="space-y-3">
            <ToggleRow label={`Call sheet ${workspace.callSheetHoursBefore}h before shoot`} on={workspace.callSheetEnabled} onClick={() => toggle("callSheetEnabled")} />
            <ToggleRow label={`Reminder ${workspace.reminderHoursBefore}h before shoot`} on={workspace.reminderEnabled} onClick={() => toggle("reminderEnabled")} />
            <ToggleRow label={`Final reminder ${workspace.finalReminderHoursBefore}h before shoot`} on={workspace.finalReminderEnabled} onClick={() => toggle("finalReminderEnabled")} />
          </div>
          <p className="text-xs text-[var(--slate-500)] mt-3">These are workspace defaults. Automated sending activates once the scheduling engine is connected — see Documents tab for manual send today.</p>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide mb-4">Account</h2>
          <p className="text-sm">{user.name}</p>
          <p className="text-xs text-[var(--slate-500)]">{user.email}</p>
        </Card>

        <Card className="p-5 border-[var(--rec-dim)]">
          <h2 className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide mb-4">Data</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Load Demo</p>
              <p className="text-xs text-[var(--slate-500)]">Loads the Dixtro Inc. demo dataset into this workspace.</p>
            </div>
            <Button variant="secondary" onClick={handleLoadDemo}>Load Demo</Button>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--slate-100)]">
            <div>
              <p className="text-sm font-medium">Reset & Start Fresh</p>
              <p className="text-xs text-[var(--slate-500)]">Removes all production data from this workspace only.</p>
            </div>
            {confirmingReset ? (
              <div className="flex gap-2">
                <Button variant="danger" onClick={handleReset}>Confirm Reset</Button>
                <Button variant="ghost" onClick={() => setConfirmingReset(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirmingReset(true)}>Reset Workspace</Button>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        onClick={onClick}
        className={`w-10 h-5 rounded-full transition-colors relative ${on ? "bg-[var(--slate-950)]" : "bg-[var(--slate-300)]"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
