"use client";

import { Button } from "@/components/ui/primitives";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function LandingPage() {
  const router = useRouter();
  const { session, loading } = useStore();

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  return (
    <main className="flex-1 flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded tape" />
          <span className="font-semibold tracking-tight">Production OS</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Button href="/login" variant="ghost">Log in</Button>
          <Button href="/signup" variant="primary">Sign up</Button>
        </nav>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="font-mono-data text-xs uppercase tracking-widest text-[var(--rec)] mb-4">
          Call Sheet — Build — 001
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
          One place that knows what&rsquo;s happening with your production.
        </h1>
        <p className="mt-5 text-[var(--slate-500)] text-lg">
          Production OS moves your shoot from brief to wrap — and continuously tells you
          what&rsquo;s ready, what&rsquo;s missing, and who needs to respond.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button href="/signup" size="md">Create your workspace</Button>
          <Button href="/login" variant="secondary" size="md">I already have one</Button>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid sm:grid-cols-3 gap-4">
        {[
          { q: "What's ready?", a: "Deterministic readiness checks across schedule, crew, casting, location, budget and call sheet." },
          { q: "What's missing?", a: "Gaps are surfaced automatically — no digging through spreadsheets." },
          { q: "Who needs to respond?", a: "Call sheet acknowledgement tracking tells you exactly who to follow up with." },
        ].map((c) => (
          <div key={c.q} className="border border-[var(--slate-100)] rounded-xl p-5 bg-white">
            <p className="font-mono-data text-xs text-[var(--slate-500)] uppercase tracking-wide">{c.q}</p>
            <p className="mt-2 text-sm text-[var(--slate-700)]">{c.a}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
