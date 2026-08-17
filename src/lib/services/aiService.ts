// aiService
//
// Client-side helper. All real model calls happen server-side in
// src/app/api/ai/route.ts (so the ANTHROPIC_API_KEY is never exposed to the
// browser). If no key is configured yet, the API route returns a clearly
// labeled canned response so the UI still works end-to-end during development.

export interface ParsedBrief {
  projectName: string | "TBD";
  productionType: string | "TBD";
  episodeCount: number | null;
  firstShootDate: string | "TBD";
  crew: { name: string; role: string }[];
  missing: string[];
}

export const aiService = {
  async parseProductionBrief(brief: string): Promise<ParsedBrief> {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "parse-brief", brief }),
    });
    if (!res.ok) throw new Error("AI service unavailable");
    return res.json();
  },

  async ask(projectContext: string, question: string): Promise<string> {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "assistant", projectContext, question }),
    });
    if (!res.ok) throw new Error("AI service unavailable");
    const data = await res.json();
    return data.answer as string;
  },
};
