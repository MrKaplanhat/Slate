"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService, Session } from "@/lib/services/authService";
import { User, Workspace } from "@/lib/types";

interface StoreContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  workspace: Workspace | null;
  workspaces: Workspace[];
  refresh: () => void;
  switchWorkspace: (id: string) => void;
  signOut: () => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const refresh = useCallback(() => {
    const s = authService.getSession();
    setSession(s);
    if (s) {
      setUser(authService.getUser(s.userId) ?? null);
      setWorkspace(authService.getWorkspace(s.activeWorkspaceId) ?? null);
      setWorkspaces(authService.listWorkspacesForUser(s.userId));
    } else {
      setUser(null);
      setWorkspace(null);
      setWorkspaces([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const switchWorkspace = (id: string) => {
    if (!session) return;
    authService.switchWorkspace(session.userId, id);
    refresh();
  };

  const signOut = () => {
    authService.signOut();
    refresh();
  };

  return (
    <StoreContext.Provider value={{ loading, session, user, workspace, workspaces, refresh, switchWorkspace, signOut }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// Convenience hook: redirects to /login if there is no active session.
export function useRequireSession() {
  const store = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!store.loading && !store.session) {
      router.replace("/login");
    }
  }, [store.loading, store.session, router]);
  return store;
}
