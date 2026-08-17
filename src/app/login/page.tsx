"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/authService";
import { Button, Card, Input, Label } from "@/components/ui/primitives";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = authService.signIn(email);
    if (!result) {
      setError("No workspace found for that email. Sign up first.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-6">Log in</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" />
          </div>
          {error && <p className="text-xs text-[var(--rec)]">{error}</p>}
          <Button type="submit" className="w-full">Log in</Button>
        </form>
        <p className="text-xs text-[var(--slate-500)] mt-5 text-center">
          No workspace yet? <a href="/signup" className="underline">Create one</a>
        </p>
        <p className="text-[11px] text-[var(--slate-500)] mt-3 text-center">
          This is a mock auth flow for development. Real password auth arrives with Supabase Auth.
        </p>
      </Card>
    </main>
  );
}
