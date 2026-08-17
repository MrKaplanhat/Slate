"use client";

import { useState } from "react";
import { ProjectBundle } from "@/lib/data-hooks";
import { Button, Card, Input, Label, Select, StatusTag } from "@/components/ui/primitives";
import { databaseService, genId } from "@/lib/services/databaseService";
import { BudgetCategory, BudgetLine, CastingRecord, CastingStatus, Location, LocationStatus } from "@/lib/types";

const CASTING_STATUSES: CastingStatus[] = ["Needed", "Sourcing", "Shortlisted", "Awaiting Confirmation", "Confirmed", "Backup", "Declined"];
const LOCATION_STATUSES: LocationStatus[] = ["TBD", "Shortlisted", "Contacted", "Confirmed", "Secured"];
const BUDGET_CATEGORIES: BudgetCategory[] = ["Crew", "Cast", "Location", "Equipment", "Transport", "Catering", "Production Design", "Wardrobe", "Post Production", "Miscellaneous"];

function toneForCasting(s: CastingStatus) {
  if (s === "Confirmed" || s === "Backup") return "good" as const;
  if (s === "Declined") return "bad" as const;
  return "warn" as const;
}
function toneForLocation(s: LocationStatus) {
  if (s === "Confirmed" || s === "Secured") return "good" as const;
  if (s === "TBD") return "bad" as const;
  return "warn" as const;
}

export function ProductionTab({ bundle, refresh }: { bundle: ProjectBundle; refresh: () => void }) {
  const [section, setSection] = useState<"casting" | "locations" | "budget">("casting");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["casting", "locations", "budget"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${section === s ? "bg-[var(--slate-950)] text-white" : "bg-[var(--slate-100)] text-[var(--slate-700)]"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {section === "casting" && <CastingSection bundle={bundle} refresh={refresh} />}
      {section === "locations" && <LocationsSection bundle={bundle} refresh={refresh} />}
      {section === "budget" && <BudgetSection bundle={bundle} refresh={refresh} />}
    </div>
  );
}

function CastingSection({ bundle, refresh }: { bundle: ProjectBundle; refresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState("");

  function add() {
    if (!role.trim()) return;
    databaseService.create<CastingRecord>("casting", {
      id: genId("cast"),
      workspaceId: bundle.project.workspaceId,
      projectId: bundle.project.id,
      characterOrRole: role,
      status: "Needed",
    });
    setRole("");
    setAdding(false);
    refresh();
  }

  function updateStatus(id: string, status: CastingStatus) {
    databaseService.update<CastingRecord>("casting", bundle.project.workspaceId, id, { status });
    refresh();
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide">Casting</p>
        {adding ? (
          <div className="flex gap-2">
            <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role / character" className="w-48" />
            <Button size="sm" onClick={add}>Add</Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setAdding(true)}>+ Add Role</Button>
        )}
      </div>
      {bundle.casting.length === 0 ? (
        <p className="text-sm text-[var(--slate-500)]">No casting records yet.</p>
      ) : (
        <div className="space-y-2">
          {bundle.casting.map((c) => {
            const person = bundle.people.find((p) => p.id === c.personId);
            return (
              <div key={c.id} className="flex items-center justify-between border border-[var(--slate-100)] rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{c.characterOrRole}</p>
                  <p className="text-xs text-[var(--slate-500)]">{person?.name ?? "Unassigned"}</p>
                </div>
                <Select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value as CastingStatus)} className="w-44">
                  {CASTING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function LocationsSection({ bundle, refresh }: { bundle: ProjectBundle; refresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function add() {
    if (!name.trim()) return;
    databaseService.create<Location>("locations", {
      id: genId("loc"),
      workspaceId: bundle.project.workspaceId,
      projectId: bundle.project.id,
      name,
      status: "TBD",
    });
    setName("");
    setAdding(false);
    refresh();
  }

  function updateStatus(id: string, status: LocationStatus) {
    databaseService.update<Location>("locations", bundle.project.workspaceId, id, { status });
    refresh();
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide">Locations</p>
        {adding ? (
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Location name" className="w-48" />
            <Button size="sm" onClick={add}>Add</Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setAdding(true)}>+ Add Location</Button>
        )}
      </div>
      {bundle.locations.length === 0 ? (
        <p className="text-sm text-[var(--slate-500)]">No locations yet.</p>
      ) : (
        <div className="space-y-2">
          {bundle.locations.map((l) => (
            <div key={l.id} className="flex items-center justify-between border border-[var(--slate-100)] rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium">{l.name}</p>
                <p className="text-xs text-[var(--slate-500)]">{l.address || "Address TBD"}</p>
              </div>
              <Select value={l.status} onChange={(e) => updateStatus(l.id, e.target.value as LocationStatus)} className="w-36">
                {LOCATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function BudgetSection({ bundle, refresh }: { bundle: ProjectBundle; refresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<BudgetCategory>("Crew");
  const [estimated, setEstimated] = useState("");

  function add() {
    if (!label.trim()) return;
    databaseService.create<BudgetLine>("budgetLines", {
      id: genId("bud"),
      workspaceId: bundle.project.workspaceId,
      projectId: bundle.project.id,
      category,
      label,
      estimated: Number(estimated) || 0,
      actual: 0,
    });
    setLabel("");
    setEstimated("");
    setAdding(false);
    refresh();
  }

  const totalEst = bundle.budgetLines.reduce((s, b) => s + b.estimated, 0);
  const totalAct = bundle.budgetLines.reduce((s, b) => s + b.actual, 0);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide">Budget</p>
        <Button size="sm" onClick={() => setAdding(!adding)}>+ Add Line</Button>
      </div>
      {adding && (
        <div className="grid sm:grid-cols-4 gap-2 mb-4">
          <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Select value={category} onChange={(e) => setCategory(e.target.value as BudgetCategory)}>
            {BUDGET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input placeholder="Estimated (₦)" type="number" value={estimated} onChange={(e) => setEstimated(e.target.value)} />
          <Button size="sm" onClick={add}>Save</Button>
        </div>
      )}
      {bundle.budgetLines.length === 0 ? (
        <p className="text-sm text-[var(--slate-500)]">No budget entered yet.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--slate-500)] uppercase font-mono-data">
                <th className="py-1.5">Label</th><th>Category</th><th className="text-right">Estimated</th><th className="text-right">Actual</th>
              </tr>
            </thead>
            <tbody>
              {bundle.budgetLines.map((b) => (
                <tr key={b.id} className="border-t border-[var(--slate-100)]">
                  <td className="py-1.5">{b.label}</td>
                  <td><StatusTag tone="neutral">{b.category}</StatusTag></td>
                  <td className="text-right font-mono-data">₦{b.estimated.toLocaleString()}</td>
                  <td className="text-right font-mono-data">₦{b.actual.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-6 mt-3 text-sm font-medium">
            <p>Estimated: <span className="font-mono-data">₦{totalEst.toLocaleString()}</span></p>
            <p>Actual: <span className="font-mono-data">₦{totalAct.toLocaleString()}</span></p>
            <p>Remaining: <span className="font-mono-data">₦{(totalEst - totalAct).toLocaleString()}</span></p>
          </div>
        </>
      )}
    </Card>
  );
}
