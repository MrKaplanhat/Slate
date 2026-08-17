"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRequireSession } from "@/lib/store";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const store = useRequireSession();
  const pathname = usePathname();
  const router = useRouter();

  if (store.loading || !store.session) {
    return <div className="flex-1 flex items-center justify-center text-sm text-[var(--slate-500)]">Loading…</div>;
  }

  return (
    <div className="flex-1 flex min-h-screen">
      <aside className="w-56 shrink-0 bg-[var(--slate-950)] text-white flex flex-col">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
          <span className="w-4 h-4 rounded-sm tape shrink-0" />
          <span className="font-semibold text-sm">Production OS</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  active ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10 space-y-2">
          {store.workspaces.length > 1 && (
            <select
              value={store.workspace?.id}
              onChange={(e) => store.switchWorkspace(e.target.value)}
              className="w-full bg-white/5 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10"
            >
              {store.workspaces.map((w) => (
                <option key={w.id} value={w.id} className="text-black">
                  {w.name}
                </option>
              ))}
            </select>
          )}
          <div className="px-1">
            <p className="text-xs font-medium truncate">{store.workspace?.name}</p>
            <p className="text-[11px] text-white/40 truncate">{store.user?.email}</p>
          </div>
          <button
            onClick={() => {
              store.signOut();
              router.push("/login");
            }}
            className="text-[11px] text-white/40 hover:text-white px-1"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 bg-[var(--paper)] overflow-y-auto">{children}</div>
    </div>
  );
}
