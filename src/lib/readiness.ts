// Deterministic readiness logic. NOT AI-driven, per product spec.
import {
  ShootDay,
  ProductionItem,
  CastingRecord,
  Location,
  BudgetLine,
  CallSheet,
  Acknowledgement,
  ReadinessResult,
} from "@/lib/types";

export function computeReadiness(params: {
  shootDay: ShootDay;
  items: ProductionItem[]; // items for this shoot day
  casting: CastingRecord[]; // casting records for this project
  locations: Location[]; // locations for this project
  budgetLines: BudgetLine[]; // budget for this project
  callSheets: CallSheet[]; // call sheets for this project
  acknowledgements: Acknowledgement[];
  requiredRecipientIds: string[]; // crew/cast assigned to this day
}): ReadinessResult {
  const { shootDay, items, casting, locations, budgetLines, callSheets, acknowledgements, requiredRecipientIds } =
    params;

  const scheduleOk = items.length > 0;

  const crewOk = items.every((i) => i.crewIds.length > 0);

  const relevantCasting = casting.filter((c) => items.some((i) => i.id === c.itemId));
  const castingOk =
    relevantCasting.length === 0 || relevantCasting.every((c) => c.status === "Confirmed" || c.status === "Backup");

  const relevantLocations = locations.filter((l) => l.shootDayId === shootDay.id || items.some((i) => i.locationId === l.id));
  const locationOk =
    relevantLocations.length > 0 && relevantLocations.every((l) => l.status === "Confirmed" || l.status === "Secured");

  const budgetOk = budgetLines.length > 0;

  const callSheet = callSheets.find((cs) => cs.shootDayId === shootDay.id);
  const callSheetOk = !!callSheet;

  const communicationOk = !!callSheet?.sentAt;

  const relevantAcks = acknowledgements.filter(
    (a) => callSheet && a.callSheetId === callSheet.id && requiredRecipientIds.includes(a.personId)
  );
  const acknowledgementOk =
    !callSheetOk || (relevantAcks.length > 0 && relevantAcks.every((a) => a.status === "Acknowledged"));

  const checks: ReadinessResult["checks"] = [
    { key: "schedule", label: "Schedule", ok: scheduleOk, detail: scheduleOk ? undefined : "No episodes/scenes scheduled" },
    { key: "crew", label: "Crew", ok: crewOk, detail: crewOk ? undefined : "Crew assignment missing" },
    { key: "casting", label: "Casting", ok: castingOk, detail: castingOk ? undefined : "Casting incomplete" },
    { key: "location", label: "Location", ok: locationOk, detail: locationOk ? undefined : "Location not secured" },
    { key: "budget", label: "Budget", ok: budgetOk, detail: budgetOk ? undefined : "Budget not set" },
    { key: "callSheet", label: "Call Sheet", ok: callSheetOk, detail: callSheetOk ? undefined : "Call sheet not generated" },
    { key: "communication", label: "Communication", ok: communicationOk, detail: communicationOk ? undefined : "Call sheet not sent" },
    { key: "acknowledgement", label: "Acknowledgement", ok: acknowledgementOk, detail: acknowledgementOk ? undefined : "Follow-up required" },
  ];

  const issueCount = checks.filter((c) => !c.ok).length;

  return { ready: issueCount === 0, checks, issueCount };
}
