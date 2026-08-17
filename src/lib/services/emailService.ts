// emailService
//
// Mock implementation: logs the send to the browser console and returns
// success. Swap the body of `send` for a call to /api/email (Resend) once
// RESEND_API_KEY is configured — the route is already scaffolded and will
// be used automatically when the key is present.

export interface EmailPayload {
  to: { name: string; email: string }[];
  subject: string;
  body: string;
}

export const emailService = {
  async send(payload: EmailPayload): Promise<{ success: boolean }> {
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { success: !!data.success };
    } catch {
      // Fully offline fallback so the UI flow never breaks during local dev.
      console.log("[emailService] (offline) would send:", payload);
      return { success: true };
    }
  },
};
