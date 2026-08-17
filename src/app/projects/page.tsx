"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useStore } from "@/lib/store";
import { Button, Card, EmptyState, Input, Label, Select, StatusTag, Textarea } from "@/components/ui/primitives";
import { getProjects } from "@/lib/data-hooks";
import { databaseService, genId } from "@/lib/services/databaseService";
import { Project, ProductionType } from "@/lib/types";
import { aiService, ParsedBrief } from "@/lib/services/aiService";
import Link from "next/link";

const TYPES: ProductionType[] = ["Film", "Commercial", "YouTube", "TV", "Documentary", "Music Video", "Social Content", "Other"];

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageInner />
    </Suspense>
  );
}

function ProjectsPageInner() {
  const { workspace } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<"quick" | "ai">("quick");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (params.get("create")) setShowCreate(true);
  }, [params]);

  if (!workspace) return null;
  const projects = getProjects(workspace.id);

  return (
    <AppShell key={tick}>
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <Button onClick={() => setShowCreate(true)}>+ Create Production</Button>
        </div>

        {showCreate && (
          <Card className="p-5">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode("quick")}
                className={`text-xs px-3 py-1.5 rounded-full font-medium ${mode === "quick" ? "bg-[var(--slate-950)] text-white" : "bg-[var(--slate-100)] text-[var(--slate-700)]"}`}
              >
                Quick Create
              </button>
              <button
                onClick={() => setMode("ai")}
                className={`text-xs px-3 py-1.5 rounded-full font-medium ${mode === "ai" ? "bg-[var(--slate-950)] text-white" : "bg-[var(--slate-100)] text-[var(--slate-700)]"}`}
              >
                AI Production Brief
              </button>
            </div>
            {mode === "quick" ? (
              <QuickCreateForm
                workspaceId={workspace.id}
                onDone={() => {
                  setShowCreate(false);
                  setTick((t) => t + 1);
                  router.replace("/projects");
                }}
              />
            ) : (
              <AiBriefForm
                workspaceId={workspace.id}
                onDone={() => {
                  setShowCreate(false);
                  setTick((t) => t + 1);
                  router.replace("/projects");
                }}
              />
            )}
          </Card>
        )}

        {projects.length === 0 ? (
          <EmptyState title="No productions yet" body="Create your first production to get started." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {projects.map((p) => (
              <Link href={`/projects/${p.id}`} key={p.id}>
                <Card className="p-4 hover:shadow-md transition-shadow h-full">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-[var(--slate-500)]">{p.type}</p>
                    </div>
                    <StatusTag tone="neutral">{p.status}</StatusTag>
                  </div>
                  {p.description && <p className="text-xs text-[var(--slate-500)] mt-3 line-clamp-2">{p.description}</p>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function QuickCreateForm({ workspaceId, onDone }: { workspaceId: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProductionType>("TV");
  const [description, setDescription] = useState("");
  const [producer, setProducer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleCreate() {
    if (!name) return;
    const project: Project = {
      id: genId("proj"),
      workspaceId,
      name,
      type,
      description,
      producer,
      startDate,
      endDate,
      status: "Development",
      isEpisodic: type === "TV" || type === "YouTube" || type === "Documentary",
      createdAt: new Date().toISOString(),
    };
    databaseService.create("projects", project);
    onDone();
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Project name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="DATE WITH MYA" />
        </div>
        <div>
          <Label>Production type</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as ProductionType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label>Producer</Label>
          <Input value={producer} onChange={(e) => setProducer(e.target.value)} />
        </div>
        <div>
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label>End date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleCreate}>Create Production</Button>
      </div>
    </div>
  );
}

function AiBriefForm({ workspaceId, onDone }: { workspaceId: string; onDone: () => void }) {
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedBrief | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
    if (!brief.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await aiService.parseProductionBrief(brief);
      setParsed(result);
    } catch {
      setError("AI service is unavailable right now — you can still Quick Create instead.");
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    if (!parsed) return;
    const isEpisodic = (parsed.episodeCount ?? 0) > 0;
    const project: Project = {
      id: genId("proj"),
      workspaceId,
      name: parsed.projectName === "TBD" ? "Untitled Production" : parsed.projectName,
      type: (TYPES.includes(parsed.productionType as ProductionType) ? parsed.productionType : "Other") as ProductionType,
      description: brief,
      startDate: parsed.firstShootDate !== "TBD" ? parsed.firstShootDate : undefined,
      status: "Development",
      isEpisodic,
      createdAt: new Date().toISOString(),
    };
    databaseService.create("projects", project);

    // Create people + assignments for any crew the AI extracted, marked as Proposed via notes.
    parsed.crew.forEach((c) => {
      const person = databaseService.create("people", {
        id: genId("p"),
        workspaceId,
        name: c.name,
        role: "Other" as const,
        notes: `Proposed role: ${c.role}`,
      });
    });

    onDone();
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Describe your production…</Label>
        <Textarea
          rows={4}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="We're shooting an 8 episode dating show starting August 29. We want to shoot 4 episodes per day. Mya is the host..."
        />
      </div>
      {error && <p className="text-xs text-[var(--rec)]">{error}</p>}
      {!parsed ? (
        <div className="flex justify-end">
          <Button onClick={handleAnalyze} disabled={loading}>{loading ? "Analyzing…" : "Analyze Brief"}</Button>
        </div>
      ) : (
        <Card className="p-4 bg-[var(--slate-50)] border-none space-y-3">
          <p className="text-xs font-mono-data uppercase tracking-wide text-[var(--slate-500)]">Here&rsquo;s what I understood</p>
          <Row label="Project" value={parsed.projectName} />
          <Row label="Episodes" value={parsed.episodeCount ? String(parsed.episodeCount) : "TBD"} />
          <Row label="First shoot" value={parsed.firstShootDate} />
          <div>
            <p className="text-xs text-[var(--slate-500)] mb-1">Crew</p>
            {parsed.crew.length === 0 ? (
              <p className="text-sm text-[var(--slate-400)]">None detected</p>
            ) : (
              <ul className="text-sm space-y-0.5">
                {parsed.crew.map((c, i) => (
                  <li key={i}>{c.name} — {c.role} <StatusTag tone="neutral">Proposed</StatusTag></li>
                ))}
              </ul>
            )}
          </div>
          {parsed.missing.length > 0 && (
            <div>
              <p className="text-xs text-[var(--slate-500)] mb-1">Missing</p>
              <div className="flex gap-2 flex-wrap">
                {parsed.missing.map((m, i) => (
                  <StatusTag key={i} tone="warn">{m}</StatusTag>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setParsed(null)}>Edit</Button>
            <Button onClick={handleCreate}>Create Production</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--slate-500)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
