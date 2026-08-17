"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { authService, Session } from "@/lib/services/authService";
import { createClient } from "@/lib/supabase/client";
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
  const requestId = useRef(0);

  const refresh = useCallback(() => {
    const thisRequest = ++requestId.current;
    (async () => {
      const s = await authService.getSession();
      if (thisRequest !== requestId.current) return; // a newer refresh superseded this one

      setSession(s);
      if (s) {
        const [u, w, ws] = await Promise.all([
          authService.getUser(s.userId),
          authService.getWorkspace(s.activeWorkspaceId),
          authService.listWorkspacesForUser(s.userId),
        ]);
        if (thisRequest !== requestId.current) return;
        setUser(u ?? null);
        setWorkspace(w ?? null);
        setWorkspaces(ws);
      } else {
        setUser(null);
        setWorkspace(null);
        setWorkspaces([]);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    refresh();

    // Keep state in sync with Supabase auth events (sign-in/out from another
    // tab, token refresh, etc.) rather than only reacting to our own calls.
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const switchWorkspace = (id: string) => {
    if (!session) return;
    authService.switchWorkspace(session.userId, id);
    refresh();
  };

  const signOut = () => {
    authService.signOut().then(refresh);
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
