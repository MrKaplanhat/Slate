"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/services/authService";
import { Button, Card, Input, Label } from "@/components/ui/primitives";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password || !company) {
      setError("Fill in every field to create your workspace.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    const result = await authService.signUp(name, email, password, company);
    setSubmitting(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm p-6">
        <p className="font-mono-data text-xs uppercase tracking-widest text-[var(--rec)] mb-2">New workspace</p>
        <h1 className="text-xl font-semibold mb-6">Set up Production OS</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Your name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Woye Adeyemi" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <Label>Production Company Name</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Dixtro Inc." />
          </div>
          {error && <p className="text-xs text-[var(--rec)]">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating workspace…" : "Create workspace"}
          </Button>
        </form>
        <p className="text-xs text-[var(--slate-500)] mt-5 text-center">
          Already have a workspace? <a href="/login" className="underline">Log in</a>
        </p>
      </Card>
    </main>
  );
}
