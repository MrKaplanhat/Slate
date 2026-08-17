import { NextRequest, NextResponse } from "next/server";

// Set RESEND_API_KEY (and optionally EMAIL_FROM) as Vercel environment
// variables to send real email. Until then this route just logs the send
// server-side and reports success so the product flow works end-to-end.

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[emailService] (no RESEND_API_KEY set) would send:", payload);
    return NextResponse.json({ success: true, mode: "mock" });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Production OS <onboarding@resend.dev>",
        to: payload.to.map((t: { email: string }) => t.email),
        subject: payload.subject,
        text: payload.body,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return NextResponse.json({ success: true, mode: "live" });
  } catch (err) {
    console.error("Resend error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
