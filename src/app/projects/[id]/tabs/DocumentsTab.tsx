"use client";

import { useState } from "react";
import { ProjectBundle } from "@/lib/data-hooks";
import { Button, Card, StatusTag } from "@/components/ui/primitives";
import { databaseService, genId } from "@/lib/services/databaseService";
import { CallSheet, Acknowledgement } from "@/lib/types";
import { pdfService } from "@/lib/services/pdfService";
import { emailService } from "@/lib/services/emailService";

const TBD = '<span style="color:#999">TBD</span>';

export function DocumentsTab({ bundle, refresh }: { bundle: ProjectBundle; refresh: () => void }) {
  const days = [...bundle.shootDays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      {days.length === 0 ? (
        <Card className="p-6 text-sm text-[var(--slate-500)] text-center">Add a shoot day in Schedule to generate a call sheet.</Card>
      ) : (
        days.map((day) => <CallSheetCard key={day.id} day={day} bundle={bundle} refresh={refresh} />)
      )}
    </div>
  );
}

function CallSheetCard({ day, bundle, refresh }: { day: import("@/lib/types").ShootDay; bundle: ProjectBundle; refresh: () => void }) {
  const [sending, setSending] = useState(false);
  const items = bundle.items.filter((i) => i.shootDayId === day.id);
  const location = bundle.locations.find((l) => l.shootDayId === day.id) ?? bundle.locations.find((l) => items.some((i) => i.locationId === l.id));
  const crewIds = Array.from(new Set(items.flatMap((i) => i.crewIds)));
  const crew = crewIds.map((id) => bundle.people.find((p) => p.id === id)).filter(Boolean) as import("@/lib/types").Person[];
  const callSheet = bundle.callSheets.find((cs) => cs.shootDayId === day.id);
  const acks = bundle.acknowledgements.filter((a) => callSheet && a.callSheetId === callSheet.id);

  function buildHtml() {
    return `
      <h1>${bundle.project.workspaceId ? "" : ""}${bundle.project.name}</h1>
      <p class="label">Call Sheet — Day ${day.dayNumber}</p>
      <div class="section">
        <table>
          <tr><th>Date</th><td>${day.date}</td><th>Call Time</th><td>${day.callTime || TBD}</td></tr>
          <tr><th>Location</th><td>${location?.name || TBD}</td><th>Address</th><td>${location?.address || TBD}</td></tr>
          <tr><th>Location Contact</th><td>${location?.contact || TBD}</td><th>Wrap Time</th><td>${day.wrapTime || TBD}</td></tr>
        </table>
      </div>
      <div class="section">
        <h3>${bundle.project.isEpisodic ? "Episodes" : "Scenes"}</h3>
        <table>
          <tr><th>#</th><th>Title</th><th>Time</th><th>Status</th></tr>
          ${items.map((i) => `<tr><td>${i.number}</td><td>${i.title}</td><td>${i.time || TBD}</td><td>${i.status}</td></tr>`).join("")}
        </table>
      </div>
      <div class="section">
        <h3>Crew Call Times</h3>
        <table>
          <tr><th>Name</th><th>Role</th><th>Call Time</th></tr>
          ${crew.map((c) => `<tr><td>${c.name}</td><td>${c.role}</td><td>${day.callTime || TBD}</td></tr>`).join("") || `<tr><td colspan="3">${TBD}</td></tr>`}
        </table>
      </div>
      <div class="section">
        <h3>Notes</h3>
        <p>${day.notes || TBD}</p>
      </div>
      <div class="section">
        <p class="label">Emergency Information</p>
        <p>${TBD}</p>
      </div>
    `;
  }

  function generate() {
    databaseService.create<CallSheet>("callSheets", {
      id: genId("cs"),
      workspaceId: bundle.project.workspaceId,
      projectId: bundle.project.id,
      shootDayId: day.id,
      generatedAt: new Date().toISOString(),
      recipients: [],
    });
    databaseService.create("activity", {
      id: genId("act"),
      workspaceId: bundle.project.workspaceId,
      projectId: bundle.project.id,
      message: `Call sheet generated for ${day.date}`,
      createdAt: new Date().toISOString(),
    });
    refresh();
  }

  function download() {
    pdfService.printHtml(`Call Sheet - ${bundle.project.name} - ${day.date}`, buildHtml());
  }

  async function sendToTeam() {
    if (!callSheet) return;
    setSending(true);
    await emailService.send({
      to: crew.map((c) => ({ name: c.name, email: c.email || "" })).filter((c) => c.email),
      subject: `Call Sheet — ${bundle.project.name} — ${day.date}`,
      body: `Hi team, the call sheet for ${day.date} is ready. Call time: ${day.callTime || "TBD"}. Location: ${location?.name || "TBD"}.`,
    });
    databaseService.update<CallSheet>("callSheets", bundle.project.workspaceId, callSheet.id, { sentAt: new Date().toISOString(), recipients: crew.map((c) => c.id) });
    crew.forEach((c) => {
      databaseService.create<Acknowledgement>("acknowledgements", {
        id: genId("ack"),
        workspaceId: bundle.project.workspaceId,
        callSheetId: callSheet.id,
        personId: c.id,
        status: "Sent",
        updatedAt: new Date().toISOString(),
      });
    });
    databaseService.create("activity", {
      id: genId("act"),
      workspaceId: bundle.project.workspaceId,
      projectId: bundle.project.id,
      message: `Call sheet sent to ${crew.length} people for ${day.date}`,
      createdAt: new Date().toISOString(),
    });
    setSending(false);
    refresh();
  }

  function toggleAck(personId: string) {
    const ack = acks.find((a) => a.personId === personId);
    if (!ack) return;
    databaseService.update<Acknowledgement>("acknowledgements", bundle.project.workspaceId, ack.id, {
      status: ack.status === "Acknowledged" ? "Sent" : "Acknowledged",
      updatedAt: new Date().toISOString(),
    });
    refresh();
  }

  const needFollowUp = acks.filter((a) => a.status !== "Acknowledged");

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono-data font-medium">{day.date} — Day {day.dayNumber}</p>
          <p className="text-xs text-[var(--slate-500)]">{items.length} {bundle.project.isEpisodic ? "episodes" : "scenes"}</p>
        </div>
        <div className="flex gap-2">
          {!callSheet ? (
            <Button size="sm" onClick={generate}>Generate Call Sheet</Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={download}>Download PDF</Button>
              <Button size="sm" onClick={sendToTeam} disabled={sending || !!callSheet.sentAt}>
                {callSheet.sentAt ? "Sent" : sending ? "Sending…" : "Send to Team"}
              </Button>
            </>
          )}
        </div>
      </div>

      {callSheet && (
        <div className="border-t border-[var(--slate-100)] pt-3 mt-1">
          <p className="text-xs font-semibold text-[var(--slate-500)] uppercase tracking-wide mb-2">Acknowledgements</p>
          {acks.length === 0 ? (
            <p className="text-sm text-[var(--slate-500)]">Not sent yet.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-2">
                {acks.map((a) => {
                  const person = bundle.people.find((p) => p.id === a.personId);
                  return (
                    <button key={a.id} onClick={() => toggleAck(a.personId)}>
                      <StatusTag tone={a.status === "Acknowledged" ? "good" : "warn"}>
                        {person?.name ?? "?"} {a.status === "Acknowledged" ? "✓" : "⚠"}
                      </StatusTag>
                    </button>
                  );
                })}
              </div>
              {needFollowUp.length > 0 && (
                <p className="text-xs text-[var(--slate-500)]">{needFollowUp.length} people need follow-up. Click a name to simulate acknowledgement.</p>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}
