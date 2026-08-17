// authService
//
// Mock/local implementation. Swap the internals for supabase.auth.* later —
// the function signatures (signUp/signIn/signOut/getSession) are chosen to
// match Supabase Auth's shape so calling code never has to change.

import { User, Workspace, Membership } from "@/lib/types";
import { genId } from "@/lib/services/databaseService";

const SESSION_KEY = "production_os:session"; // { userId, activeWorkspaceId }
const USERS_KEY = "production_os:users";
const WORKSPACES_KEY = "production_os:workspaces";
const MEMBERSHIPS_KEY = "production_os:memberships";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}
function write<T>(key: string, val: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(val));
}

export interface Session {
  userId: string;
  activeWorkspaceId: string;
}

export const authService = {
  signUp(name: string, email: string, companyName: string): { user: User; workspace: Workspace } {
    const users = read<User>(USERS_KEY);
    const user: User = { id: genId("user"), name, email };
    users.push(user);
    write(USERS_KEY, users);

    const workspaces = read<Workspace>(WORKSPACES_KEY);
    const workspace: Workspace = {
      id: genId("ws"),
      name: companyName,
      timezone: "Africa/Lagos",
      ownerId: user.id,
      isDemo: false,
      callSheetHoursBefore: 48,
      reminderHoursBefore: 24,
      finalReminderHoursBefore: 3,
      callSheetEnabled: true,
      reminderEnabled: true,
      finalReminderEnabled: false,
      createdAt: new Date().toISOString(),
    };
    workspaces.push(workspace);
    write(WORKSPACES_KEY, workspaces);

    const memberships = read<Membership>(MEMBERSHIPS_KEY);
    memberships.push({ id: genId("mem"), workspaceId: workspace.id, userId: user.id, role: "Owner" });
    write(MEMBERSHIPS_KEY, memberships);

    const session: Session = { userId: user.id, activeWorkspaceId: workspace.id };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { user, workspace };
  },

  signIn(email: string): { user: User; workspace: Workspace } | null {
    const users = read<User>(USERS_KEY);
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return null;
    const memberships = read<Membership>(MEMBERSHIPS_KEY).filter((m) => m.userId === user.id);
    const workspaces = read<Workspace>(WORKSPACES_KEY);
    const workspace = workspaces.find((w) => w.id === memberships[0]?.workspaceId);
    if (!workspace) return null;
    const session: Session = { userId: user.id, activeWorkspaceId: workspace.id };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { user, workspace };
  },

  signOut() {
    window.localStorage.removeItem(SESSION_KEY);
  },

  getSession(): Session | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  getUser(userId: string): User | undefined {
    return read<User>(USERS_KEY).find((u) => u.id === userId);
  },

  getWorkspace(workspaceId: string): Workspace | undefined {
    return read<Workspace>(WORKSPACES_KEY).find((w) => w.id === workspaceId);
  },

  updateWorkspace(workspaceId: string, patch: Partial<Workspace>): Workspace | undefined {
    const workspaces = read<Workspace>(WORKSPACES_KEY);
    const idx = workspaces.findIndex((w) => w.id === workspaceId);
    if (idx === -1) return undefined;
    workspaces[idx] = { ...workspaces[idx], ...patch };
    write(WORKSPACES_KEY, workspaces);
    return workspaces[idx];
  },

  listWorkspacesForUser(userId: string): Workspace[] {
    const memberships = read<Membership>(MEMBERSHIPS_KEY).filter((m) => m.userId === userId);
    const workspaces = read<Workspace>(WORKSPACES_KEY);
    return workspaces.filter((w) => memberships.some((m) => m.workspaceId === w.id));
  },

  switchWorkspace(userId: string, workspaceId: string) {
    const session: Session = { userId, activeWorkspaceId: workspaceId };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  },
};
