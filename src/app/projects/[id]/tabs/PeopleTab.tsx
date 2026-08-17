"use client";

import { useState } from "react";
import { ProjectBundle } from "@/lib/data-hooks";
import { Button, Card, Input, Label, Select } from "@/components/ui/primitives";
import { databaseService, genId } from "@/lib/services/databaseService";
import { Person, PersonRole } from "@/lib/types";

const ROLES: PersonRole[] = [
  "Producer", "Executive Producer", "Director", "DOP", "Camera Operator", "Camera Assistant",
  "Sound", "Gaffer", "Production Designer", "Casting Director", "Editor", "Production Assistant", "Cast", "Other",
];

export function PeopleTab({ bundle, refresh }: { bundle: ProjectBundle; refresh: () => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PersonRole>("Producer");

  function add() {
    if (!name.trim()) return;
    databaseService.create<Person>("people", {
      id: genId("p"),
      workspaceId: bundle.project.workspaceId,
      name,
      email,
      role,
    });
    setName("");
    setEmail("");
    setAdding(false);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[var(--slate-500)]">Reusable across every production in this workspace.</p>
        <Button size="sm" onClick={() => setAdding(true)}>+ Add Person</Button>
      </div>

      {adding && (
        <Card className="p-4 grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="For call sheets" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value as PersonRole)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={add}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      <Card className="divide-y divide-[var(--slate-100)]">
        {bundle.people.length === 0 && <p className="p-4 text-sm text-[var(--slate-500)]">No people yet.</p>}
        {bundle.people.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-[var(--slate-500)]">{p.role}{p.notes ? ` · ${p.notes}` : ""}</p>
            </div>
            <p className="text-xs text-[var(--slate-500)]">{p.email || <span className="text-[var(--rec)]">No email — contact info missing</span>}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
