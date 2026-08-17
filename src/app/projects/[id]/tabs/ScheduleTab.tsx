"use client";

import { useState } from "react";
import { ProjectBundle } from "@/lib/data-hooks";
import { Button, Card, Input, Label, Select, StatusTag } from "@/components/ui/primitives";
import { databaseService, genId } from "@/lib/services/databaseService";
import { ItemStatus, ProductionItem, ShootDay } from "@/lib/types";

const STATUSES: ItemStatus[] = ["Planned", "Ready", "Shooting", "Completed"];

export function ScheduleTab({ bundle, refresh }: { bundle: ProjectBundle; refresh: () => void }) {
  const [addingDay, setAddingDay] = useState(false);
  const noun = bundle.project.isEpisodic ? "Episode" : "Scene";
  const days = [...bundle.shootDays].sort((a, b) => a.date.localeCompare(b.date));
  const unscheduled = bundle.items.filter((i) => !i.shootDayId);

  function addShootDay(date: string) {
    if (!date) return;
    const dayNumber = bundle.shootDays.length + 1;
    databaseService.create<ShootDay>("shootDays", {
      id: genId("day"),
      workspaceId: bundle.project.workspaceId,
      projectId: bundle.project.id,
      date,
      dayNumber,
    });
    refresh();
    setAddingDay(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        {addingDay ? (
          <AddDayInline onAdd={addShootDay} onCancel={() => setAddingDay(false)} />
        ) : (
          <Button size="sm" onClick={() => setAddingDay(true)}>+ Add Shoot Day</Button>
        )}
      </div>

      {days.length === 0 && <Card className="p-6 text-sm text-[var(--slate-500)] text-center">No shoot days yet. Add one to start scheduling {noun.toLowerCase()}s.</Card>}

      {days.map((day) => {
        const items = bundle.items.filter((i) => i.shootDayId === day.id).sort((a, b) => a.number - b.number);
        const conflicts = findCastConflicts(items);
        return (
          <Card key={day.id} className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-mono-data font-medium">{formatDate(day.date)}</p>
              <StatusTag tone="neutral">{items.length} {noun.toLowerCase()}{items.length === 1 ? "" : "s"}</StatusTag>
            </div>
            <p className="text-xs text-[var(--slate-500)] mb-3">
              {bundle.project.name} {day.callTime && `· Call ${day.callTime}`} {day.wrapTime && `· Wrap ${day.wrapTime}`}
            </p>
            {conflicts.length > 0 && (
              <div className="mb-3 space-y-1">
                {conflicts.map((c, i) => (
                  <p key={i} className="text-xs text-[var(--rec)] bg-[var(--rec-dim)] rounded px-2 py-1">
                    Potential issue: {c}
                  </p>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} bundle={bundle} refresh={refresh} noun={noun} />
              ))}
            </div>
            <AddItemInline shootDayId={day.id} bundle={bundle} refresh={refresh} noun={noun} />
          </Card>
        );
      })}

      {unscheduled.length > 0 && (
        <Card className="p-4">
          <p className="text-sm font-semibold text-[var(--slate-500)] uppercase tracking-wide mb-3">Unscheduled {noun}s</p>
          <div className="space-y-2">
            {unscheduled.map((item) => (
              <ItemRow key={item.id} item={item} bundle={bundle} refresh={refresh} noun={noun} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function AddDayInline({ onAdd, onCancel }: { onAdd: (date: string) => void; onCancel: () => void }) {
  const [date, setDate] = useState("");
  return (
    <div className="flex items-center gap-2">
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
      <Button size="sm" onClick={() => onAdd(date)}>Add</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

function AddItemInline({
  shootDayId,
  bundle,
  refresh,
  noun,
}: {
  shootDayId: string;
  bundle: ProjectBundle;
  refresh: () => void;
  noun: string;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  function add() {
    if (!title.trim()) return;
    const number = bundle.items.length + 1;
    databaseService.create<ProductionItem>("productionItems", {
      id: genId("item"),
      workspaceId: bundle.project.workspaceId,
      projectId: bundle.project.id,
      shootDayId,
      number,
      title,
      castIds: [],
      crewIds: [],
      status: "Planned",
    });
    setTitle("");
    setAdding(false);
    refresh();
  }

  if (!adding) return <button onClick={() => setAdding(true)} className="text-xs text-[var(--slate-500)] hover:text-[var(--slate-900)] mt-2">+ Add {noun.toLowerCase()}</button>;
  return (
    <div className="flex items-center gap-2 mt-2">
      <Input placeholder={`${noun} title`} value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1" />
      <Button size="sm" onClick={add}>Add</Button>
      <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
    </div>
  );
}

function ItemRow({ item, bundle, refresh, noun }: { item: ProductionItem; bundle: ProjectBundle; refresh: () => void; noun: string }) {
  const location = bundle.locations.find((l) => l.id === item.locationId);
  const crewNames = item.crewIds.map((id) => bundle.people.find((p) => p.id === id)?.name).filter(Boolean);

  function updateStatus(status: ItemStatus) {
    databaseService.update<ProductionItem>("productionItems", bundle.project.workspaceId, item.id, { status });
    refresh();
  }

  function toggleCrew(personId: string) {
    const has = item.crewIds.includes(personId);
    const crewIds = has ? item.crewIds.filter((id) => id !== personId) : [...item.crewIds, personId];
    databaseService.update<ProductionItem>("productionItems", bundle.project.workspaceId, item.id, { crewIds });
    refresh();
  }

  return (
    <div className="border border-[var(--slate-100)] rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{noun} {item.number} — {item.title}</p>
          <p className="text-xs text-[var(--slate-500)] mt-0.5">
            {location ? location.name : "No location"} · {crewNames.length ? crewNames.join(", ") : "No crew assigned"}
          </p>
        </div>
        <Select value={item.status} onChange={(e) => updateStatus(e.target.value as ItemStatus)} className="w-32">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {bundle.people.map((p) => (
          <button
            key={p.id}
            onClick={() => toggleCrew(p.id)}
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              item.crewIds.includes(p.id)
                ? "bg-[var(--slate-950)] text-white border-[var(--slate-950)]"
                : "border-[var(--slate-300)] text-[var(--slate-500)]"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function findCastConflicts(items: ProductionItem[]): string[] {
  const seen: Record<string, string[]> = {};
  items.forEach((item) => {
    item.castIds.forEach((castId) => {
      seen[castId] = seen[castId] ?? [];
      seen[castId].push(item.title);
    });
  });
  return Object.entries(seen)
    .filter(([, titles]) => titles.length > 1)
    .map(([, titles]) => `The same cast member is assigned to overlapping episodes: ${titles.join(", ")}`);
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}
