import { databaseService } from "@/lib/services/databaseService";
import { computeReadiness } from "@/lib/readiness";
import {
  Project,
  ShootDay,
  ProductionItem,
  Person,
  CastingRecord,
  Location,
  BudgetLine,
  CallSheet,
  Acknowledgement,
  ProductionTask,
  ActivityEntry,
  ReadinessResult,
} from "@/lib/types";

export function getProjects(workspaceId: string): Project[] {
  return databaseService.list<Project>("projects", workspaceId).sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
}

export interface ProjectBundle {
  project: Project;
  shootDays: ShootDay[];
  items: ProductionItem[];
  people: Person[];
  casting: CastingRecord[];
  locations: Location[];
  budgetLines: BudgetLine[];
  callSheets: CallSheet[];
  acknowledgements: Acknowledgement[];
  tasks: ProductionTask[];
  activity: ActivityEntry[];
}

export function getProjectBundle(workspaceId: string, projectId: string): ProjectBundle {
  const project = databaseService.get<Project>("projects", workspaceId, projectId)!;
  const shootDays = databaseService.list<ShootDay>("shootDays", workspaceId).filter((d) => d.projectId === projectId);
  const items = databaseService.list<ProductionItem>("productionItems", workspaceId).filter((i) => i.projectId === projectId);
  const people = databaseService.list<Person>("people", workspaceId);
  const casting = databaseService.list<CastingRecord>("casting", workspaceId).filter((c) => c.projectId === projectId);
  const locations = databaseService.list<Location>("locations", workspaceId).filter((l) => l.projectId === projectId);
  const budgetLines = databaseService.list<BudgetLine>("budgetLines", workspaceId).filter((b) => b.projectId === projectId);
  const callSheets = databaseService.list<CallSheet>("callSheets", workspaceId).filter((c) => c.projectId === projectId);
  const acknowledgements = databaseService.list<Acknowledgement>("acknowledgements", workspaceId);
  const tasks = databaseService.list<ProductionTask>("tasks", workspaceId).filter((t) => t.projectId === projectId);
  const activity = databaseService
    .list<ActivityEntry>("activity", workspaceId)
    .filter((a) => a.projectId === projectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { project, shootDays, items, people, casting, locations, budgetLines, callSheets, acknowledgements, tasks, activity };
}

export function readinessForShootDay(bundle: ProjectBundle, shootDay: ShootDay): ReadinessResult {
  const items = bundle.items.filter((i) => i.shootDayId === shootDay.id);
  const requiredRecipientIds = Array.from(new Set(items.flatMap((i) => [...i.crewIds, ...i.castIds])));
  return computeReadiness({
    shootDay,
    items,
    casting: bundle.casting,
    locations: bundle.locations,
    budgetLines: bundle.budgetLines,
    callSheets: bundle.callSheets,
    acknowledgements: bundle.acknowledgements,
    requiredRecipientIds,
  });
}

export function nextShootDay(shootDays: ShootDay[]): ShootDay | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = shootDays.filter((d) => d.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

export interface AttentionItem {
  message: string;
  projectId: string;
  projectName: string;
  severity: "high" | "medium";
}

// Deterministic "Needs Attention" surfacing across the whole workspace.
// Prioritises the soonest shoot day's unresolved checks; caps the list so the
// producer is never shown more than a handful of issues at once.
export function getNeedsAttention(workspaceId: string, limit = 5): AttentionItem[] {
  const projects = getProjects(workspaceId).filter((p) => p.status !== "Archived" && p.status !== "Completed");
  const items: AttentionItem[] = [];

  for (const project of projects) {
    const bundle = getProjectBundle(workspaceId, project.id);
    const upcoming = nextShootDay(bundle.shootDays);
    if (!upcoming) continue;
    const daysUntil = Math.ceil((new Date(upcoming.date).getTime() - Date.now()) / 86400000);
    const readiness = readinessForShootDay(bundle, upcoming);

    readiness.checks
      .filter((c) => !c.ok)
      .forEach((c) => {
        items.push({
          message: `${c.detail ?? c.label} — ${project.name} (${upcoming.date})`,
          projectId: project.id,
          projectName: project.name,
          severity: daysUntil <= 3 ? "high" : "medium",
        });
      });
  }

  return items
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1))
    .slice(0, limit);
}

export function workspaceStats(workspaceId: string) {
  const projects = getProjects(workspaceId);
  return {
    total: projects.length,
    completed: projects.filter((p) => p.status === "Completed").length,
    inProduction: projects.filter((p) => p.status === "Production").length,
    planning: projects.filter((p) => p.status === "Development" || p.status === "Pre-Production").length,
  };
}
