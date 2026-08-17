// authService
//
// Real Supabase-backed implementation. Sign up/in/out and session state are
// handled by Supabase Auth; workspace + membership rows live in Postgres
// tables that mirror src/lib/types.ts (see supabase/schema.sql — run that
// once in your Supabase SQL Editor before using this).
//
// Every method is now async (network calls), unlike the old localStorage
// version. Callers (store.tsx, login/signup pages, settings page) await
// these.

import { createClient } from "@/lib/supabase/client";
import { User, Workspace } from "@/lib/types";

export interface Session {
  userId: string;
  activeWorkspaceId: string;
}

type Result<T> = T | { error: string };

// "Which workspace is active" is a local UI preference, not something
// Supabase needs to track — kept in localStorage so it survives refreshes
// without an extra round trip.
const ACTIVE_WORKSPACE_KEY = "production_os:activeWorkspaceId";

function getActiveWorkspaceId(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? fallback;
}
function setActiveWorkspaceId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
}

function mapWorkspace(row: any): Workspace {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo ?? undefined,
    timezone: row.timezone,
    ownerId: row.owner_id,
    isDemo: row.is_demo,
    callSheetHoursBefore: row.call_sheet_hours_before,
    reminderHoursBefore: row.reminder_hours_before,
    finalReminderHoursBefore: row.final_reminder_hours_before,
    callSheetEnabled: row.call_sheet_enabled,
    reminderEnabled: row.reminder_enabled,
    finalReminderEnabled: row.final_reminder_enabled,
    createdAt: row.created_at,
  };
}

function unmapWorkspacePatch(patch: Partial<Workspace>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.logo !== undefined) out.logo = patch.logo;
  if (patch.timezone !== undefined) out.timezone = patch.timezone;
  if (patch.callSheetHoursBefore !== undefined) out.call_sheet_hours_before = patch.callSheetHoursBefore;
  if (patch.reminderHoursBefore !== undefined) out.reminder_hours_before = patch.reminderHoursBefore;
  if (patch.finalReminderHoursBefore !== undefined) out.final_reminder_hours_before = patch.finalReminderHoursBefore;
  if (patch.callSheetEnabled !== undefined) out.call_sheet_enabled = patch.callSheetEnabled;
  if (patch.reminderEnabled !== undefined) out.reminder_enabled = patch.reminderEnabled;
  if (patch.finalReminderEnabled !== undefined) out.final_reminder_enabled = patch.finalReminderEnabled;
  return out;
}

export const authService = {
  async signUp(
    name: string,
    email: string,
    password: string,
    companyName: string
  ): Promise<Result<{ user: User; workspace: Workspace }>> {
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (authError) return { error: authError.message };
    if (!authData.user) return { error: "Sign up failed — please try again." };

    const userId = authData.user.id;

    // A DB trigger (see supabase/schema.sql) creates the profile row
    // automatically, but upsert defensively in case it hasn't fired yet.
    await supabase.from("profiles").upsert({ id: userId, name, email });

    const { data: workspaceRow, error: wsError } = await supabase
      .from("workspaces")
      .insert({
        name: companyName,
        timezone: "Africa/Lagos",
        owner_id: userId,
        is_demo: false,
        call_sheet_hours_before: 48,
        reminder_hours_before: 24,
        final_reminder_hours_before: 3,
        call_sheet_enabled: true,
        reminder_enabled: true,
        final_reminder_enabled: false,
      })
      .select()
      .single();
    if (wsError || !workspaceRow) {
      return { error: wsError?.message ?? "Could not create your workspace." };
    }

    const { error: memError } = await supabase.from("memberships").insert({
      workspace_id: workspaceRow.id,
      user_id: userId,
      role: "Owner",
    });
    if (memError) return { error: memError.message };

    setActiveWorkspaceId(workspaceRow.id);

    return { user: { id: userId, name, email }, workspace: mapWorkspace(workspaceRow) };
  },

  async signIn(email: string, password: string): Promise<Result<{ user: User; workspace: Workspace }>> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Sign in failed — please try again." };

    const workspaces = await authService.listWorkspacesForUser(data.user.id);
    if (workspaces.length === 0) {
      return { error: "No workspace found for this account yet." };
    }

    const activeId = getActiveWorkspaceId(workspaces[0].id);
    const workspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
    setActiveWorkspaceId(workspace.id);

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();

    return {
      user: { id: data.user.id, name: profile?.name ?? "", email: data.user.email ?? email },
      workspace,
    };
  },

  async signOut(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
    }
  },

  async getSession(): Promise<Session | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const workspaces = await authService.listWorkspacesForUser(user.id);
    if (workspaces.length === 0) return null;

    const activeWorkspaceId = getActiveWorkspaceId(workspaces[0].id);
    const resolved = workspaces.find((w) => w.id === activeWorkspaceId) ? activeWorkspaceId : workspaces[0].id;
    return { userId: user.id, activeWorkspaceId: resolved };
  },

  async getUser(userId: string): Promise<User | undefined> {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (!data) return undefined;
    return { id: data.id, name: data.name, email: data.email };
  },

  async getWorkspace(workspaceId: string): Promise<Workspace | undefined> {
    const supabase = createClient();
    const { data } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();
    return data ? mapWorkspace(data) : undefined;
  },

  async updateWorkspace(workspaceId: string, patch: Partial<Workspace>): Promise<Workspace | undefined> {
    const supabase = createClient();
    const { data } = await supabase
      .from("workspaces")
      .update(unmapWorkspacePatch(patch))
      .eq("id", workspaceId)
      .select()
      .single();
    return data ? mapWorkspace(data) : undefined;
  },

  async listWorkspacesForUser(userId: string): Promise<Workspace[]> {
    const supabase = createClient();
    const { data } = await supabase
      .from("memberships")
      .select("workspace:workspaces(*)")
      .eq("user_id", userId);
    if (!data) return [];
    return data
      .map((row: any) => (row.workspace ? mapWorkspace(row.workspace) : null))
      .filter((w): w is Workspace => w !== null);
  },

  switchWorkspace(_userId: string, workspaceId: string): void {
    setActiveWorkspaceId(workspaceId);
  },
};
