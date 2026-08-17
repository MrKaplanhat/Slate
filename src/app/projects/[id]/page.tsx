"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { getProjectBundle, nextShootDay, readinessForShootDay } from "@/lib/data-hooks";
import { StatusTag, Select } from "@/components/ui/primitives";
import { databaseService } from "@/lib/services/databaseService";
import { ProjectStatus } from "@/lib/types";
import { OverviewTab } from "./tabs/OverviewTab";
import { ScheduleTab } from "./tabs/ScheduleTab";
import { PeopleTab } from "./tabs/PeopleTab";
import { ProductionTab } from "./tabs/ProductionTab";
import { DocumentsTab } from "./tabs/DocumentsTab";

const TABS = ["Overview", "Schedule", "People", "Production", "Documents"] as const;
type Tab = (typeof TABS)[number];
const STATUSES: ProjectStatus[] = ["Development", "Pre-Production", "Production", "Post-Production", "Completed", "Archived"];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { workspace } = useStore();
  const [tab, setTab] = useState<Tab>("Overview");
  const [tick, setTick] = useState(0);

  if (!workspace) return null;
  const bundle = getProjectBundle(workspace.id, id);
  if (!bundle.project) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-[var(--slate-500)]">Production not found.</div>
      </AppShell>
    );
  }

  const refresh = () => setTick((t) => t + 1);
  const next = nextShootDay(bundle.shootDays);
  const readiness = next ? readinessForShootDay(bundle, next) : null;

  function updateStatus(status: ProjectStatus) {
    databaseService.update<import("@/lib/types").Project>("projects", workspace!.id, bundle.project.id, { status });
    refresh();
  }

  return (
    <AppShell>
      <div key={tick} className="max-w-5xl mx-auto px-8 py-8 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-widest text-[var(--slate-500)]">{bundle.project.type}</p>
            <h1 className="text-2xl font-semibold mt-1">{bundle.project.name}</h1>
            {bundle.project.description && <p className="text-sm text-[var(--slate-500)] mt-1 max-w-xl">{bundle.project.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {readiness && <StatusTag tone={readiness.ready ? "good" : "warn"}>{readiness.ready ? "Ready" : "Needs Attention"}</StatusTag>}
            <Select value={bundle.project.status} onChange={(e) => updateStatus(e.target.value as ProjectStatus)} className="w-40">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-[var(--slate-100)]">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t ? "border-[var(--slate-950)] text-[var(--slate-950)]" : "border-transparent text-[var(--slate-500)] hover:text-[var(--slate-900)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <OverviewTab bundle={bundle} />}
        {tab === "Schedule" && <ScheduleTab bundle={bundle} refresh={refresh} />}
        {tab === "People" && <PeopleTab bundle={bundle} refresh={refresh} />}
        {tab === "Production" && <ProductionTab bundle={bundle} refresh={refresh} />}
        {tab === "Documents" && <DocumentsTab bundle={bundle} refresh={refresh} />}
      </div>
    </AppShell>
  );
}
