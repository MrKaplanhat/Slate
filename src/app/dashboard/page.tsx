"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Button, Card, EmptyState, StatusTag } from "@/components/ui/primitives";
import { getProjects, getProjectBundle, nextShootDay, readinessForShootDay, getNeedsAttention, workspaceStats } from "@/lib/data-hooks";
import { loadDemoData } from "@/lib/demo-data";
import Link from "next/link";

export default function DashboardPage() {
  const { workspace } = useStore();
  const [tick, setTick] = useState(0); // forces re-read from localStorage after mutations

  if (!workspace) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-[var(--slate-500)]">Loading…</div>
      </AppShell>
    );
  }

  const projects = getProjects(workspace.id);
  const stats = workspaceStats(workspace.id);
  const attention = getNeedsAttention(workspace.id);

  function handleLoadDemo() {
    loadDemoData(workspace!.id);
    setTick((t) => t + 1);
  }

  return (
    <AppShell key={tick}>
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono-data text-xs uppercase tracking-widest text-[var(--slate-500)]">{workspace.name}</p>
            <h1 className="text-2xl font-semibold mt-1">Home</h1>
          </div>
          <Button href="/projects?create=1">+ Create Production</Button>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="Your workspace is ready."
            body="You haven't created any productions yet."
            action={
              <>
                <Button href="/projects?create=1">Create Production</Button>
                <Button variant="secondary" onClick={handleLoadDemo}>Try Demo</Button>
              </>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-4 gap-3">
              {[
                ["Projects", stats.total],
                ["Completed", stats.completed],
                ["In Production", stats.inProduction],
                ["Planning", stats.planning],
              ].map(([label, val]) => (
                <Card key={label as string} className="p-4">
                  <p className="text-2xl font-semibold">{val}</p>
                  <p className="text-xs text-[var(--slate-500)] mt-0.5">{label}</p>
                </Card>
              ))}
            </div>

            <section>
              <h2 className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide mb-3">Active Productions</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {projects.map((p) => {
                  const bundle = getProjectBundle(workspace.id, p.id);
                  const next = nextShootDay(bundle.shootDays);
                  const readiness = next ? readinessForShootDay(bundle, next) : null;
                  const total = bundle.items.length;
                  const done = bundle.items.filter((i) => i.status === "Completed").length;
                  return (
                    <Link href={`/projects/${p.id}`} key={p.id}>
                      <Card className="p-4 hover:shadow-md transition-shadow h-full">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-[var(--slate-500)]">{total > 0 ? `${total} Episodes` : p.type}</p>
                          </div>
                          <StatusTag tone="neutral">{p.status}</StatusTag>
                        </div>
                        <p className="text-xs text-[var(--slate-500)] mt-3">
                          {total > 0 ? `${done} / ${total} completed` : "No episodes yet"}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-[var(--slate-500)]">
                            Next shoot: <span className="font-mono-data">{next ? next.date : "—"}</span>
                          </p>
                          {readiness && (
                            <StatusTag tone={readiness.ready ? "good" : "warn"}>
                              {readiness.ready ? "Ready" : "Needs Attention"}
                            </StatusTag>
                          )}
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide mb-3">Needs Attention</h2>
              {attention.length === 0 ? (
                <Card className="p-4 text-sm text-[var(--slate-500)]">Nothing urgent right now.</Card>
              ) : (
                <Card className="divide-y divide-[var(--slate-100)]">
                  {attention.map((a, idx) => (
                    <Link
                      key={idx}
                      href={`/projects/${a.projectId}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-[var(--slate-50)]"
                    >
                      <span className="text-sm">{a.message}</span>
                      <StatusTag tone={a.severity === "high" ? "bad" : "warn"}>{a.severity === "high" ? "Urgent" : "Soon"}</StatusTag>
                    </Link>
                  ))}
                </Card>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
