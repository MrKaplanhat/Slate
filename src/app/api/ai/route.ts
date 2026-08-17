import { NextRequest, NextResponse } from "next/server";

// This route is intentionally the only place that touches ANTHROPIC_API_KEY.
// Set it as a Vercel environment variable (never NEXT_PUBLIC_*) to go live.
// Until then, `mockParseBrief` gives the UI a working, clearly-labelled
// stand-in so the whole product can be demoed end-to-end for free.

const SYSTEM_PROMPT = `You are the Production OS assistant. You extract structured production
information from a producer's freeform brief. You NEVER invent people, dates, locations, or
numbers that are not stated or clearly implied in the text. Anything not stated must be "TBD".
Always respond with strict JSON matching the requested schema and nothing else.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (body.mode === "parse-brief") {
    if (!apiKey) {
      return NextResponse.json(mockParseBrief(body.brief));
    }
    try {
      const result = await callClaude(apiKey, [
        {
          role: "user",
          content: `${SYSTEM_PROMPT}\n\nBrief:\n"""${body.brief}"""\n\nRespond with JSON only, matching this shape:\n{"projectName": string, "productionType": string, "episodeCount": number|null, "firstShootDate": string, "crew": [{"name": string, "role": string}], "missing": string[]}`,
        },
      ]);
      return NextResponse.json(JSON.parse(extractJson(result)));
    } catch {
      return NextResponse.json(mockParseBrief(body.brief));
    }
  }

  if (body.mode === "assistant") {
    if (!apiKey) {
      return NextResponse.json({
        answer:
          "The AI Production Assistant isn't connected yet — add ANTHROPIC_API_KEY in your Vercel project settings to enable live answers. For now: " +
          mockAssistantAnswer(body.question),
      });
    }
    try {
      const result = await callClaude(apiKey, [
        {
          role: "user",
          content: `You are the Production OS assistant for this project. Only use the information given below — never invent people, dates, or numbers.\n\nProject context:\n${body.projectContext}\n\nProducer question: ${body.question}`,
        },
      ]);
      return NextResponse.json({ answer: result });
    } catch {
      return NextResponse.json({ answer: mockAssistantAnswer(body.question) });
    }
  }

  return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
}

async function callClaude(apiKey: string, messages: { role: string; content: string }[]) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages,
    }),
  });
  const data = await res.json();
  const text = (data.content ?? []).map((c: { text?: string }) => c.text ?? "").join("\n");
  return text;
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}

// Deterministic, zero-cost fallback: light keyword extraction so the demo
// flow works before an API key is configured.
function mockParseBrief(brief: string) {
  const episodeMatch = brief.match(/(\d+)\s*episode/i);
  const dateMatch = brief.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i);
  const nameGuess = brief.match(/["“]([^"”]+)["”]/)?.[1];

  const crew: { name: string; role: string }[] = [];
  const crewPatterns: [RegExp, string][] = [
    [/(\w+)\s+is\s+(?:the\s+)?host/i, "Host"],
    [/(\w+)\s+is\s+A-?cam/i, "Camera A"],
    [/(\w+)\s+is\s+B-?cam/i, "Camera B"],
    [/(\w+)\s+is\s+(?:producer|the producer)/i, "Producer"],
  ];
  crewPatterns.forEach(([re, role]) => {
    const m = brief.match(re);
    if (m) crew.push({ name: m[1], role });
  });

  const missing: string[] = [];
  if (!/sound/i.test(brief)) missing.push("Sound");
  if (!/cast(ing)? director/i.test(brief)) missing.push("Casting Director");

  return {
    projectName: nameGuess ?? "TBD",
    productionType: /show|episode/i.test(brief) ? "TV" : "Other",
    episodeCount: episodeMatch ? Number(episodeMatch[1]) : null,
    firstShootDate: dateMatch ? dateMatch[0] : "TBD",
    crew,
    missing,
  };
}

function mockAssistantAnswer(question: string) {
  return `I heard: "${question}". Once ANTHROPIC_API_KEY is set, I'll answer using this project's real schedule, crew, casting, and readiness data.`;
}
