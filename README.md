# Production OS

The production assistant that fills the gaps around the calendar — for film, commercial,
YouTube, TV, and documentary teams.

## Status: MVP (mock/local data, real service abstractions)

This build runs entirely on **localStorage** behind service abstractions
(`databaseService`, `authService`, `aiService`, `emailService`, `pdfService`).
It is fully usable and deployable today, and every abstraction is shaped so it
can be swapped for a real backend without touching UI code.

| Layer | Today | Swap in later |
|---|---|---|
| Data + multi-tenancy | localStorage, workspace-scoped | Supabase (Postgres + RLS) |
| Auth | Mock, localStorage session | Supabase Auth |
| AI Assistant / Brief parsing | Deterministic keyword fallback | Anthropic API (`ANTHROPIC_API_KEY`) |
| Email | Logged server-side | Resend (`RESEND_API_KEY`) |
| Call sheet PDF | Browser print-to-PDF | Server-rendered PDF (optional later) |

## Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, sign up, and either **Create Production** or
**Try Demo** (loads the Dixtro Inc. / DATE WITH MYA demo dataset).

## Deploy (free tier)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. Framework preset: Next.js (auto-detected). No build config needed.
4. Deploy. That's it — the app works immediately in mock mode.

### Turning on AI + Email (optional, pay-as-you-go / free tier)

In Vercel → Project → Settings → Environment Variables, add:

- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com). Enables the AI Production Assistant and AI Production Brief parsing.
- `RESEND_API_KEY` — from [resend.com](https://resend.com) (free tier: 3,000 emails/mo). Enables real call sheet emails.
- `EMAIL_FROM` — sender address once you verify a domain in Resend.

Redeploy after adding variables.

## Multi-tenant architecture

Every record (`Project`, `ShootDay`, `ProductionItem`, `Person`, `CastingRecord`,
`Location`, `BudgetLine`, `CallSheet`, `Acknowledgement`, `ProductionTask`,
`ActivityEntry`) is tagged with `workspaceId` and every read/write goes through
`databaseService`, which filters by workspace. When you connect Supabase,
enable Row Level Security scoped to `workspace_id` so isolation is enforced by
the database itself, not just the frontend — replace the internals of
`src/lib/services/databaseService.ts` with `@supabase/supabase-js` calls; the
function signatures (`list/get/create/update/remove`, all workspace-scoped)
are already shaped for that swap.

## What's built (MVP priority order)

1. Workspace/auth architecture (mock, Supabase-ready)
2. Projects (Quick Create + AI Production Brief)
3. Schedule — shoot days, episodes/scenes, batch shooting, cast conflict flags
4. People, Casting, Locations, Budget
5. Deterministic Production Readiness engine
6. Call Sheet generation + PDF download (print-to-PDF)
7. Email architecture (Resend-ready) + Send to Team + Acknowledgement tracking
8. AI Production Assistant (per-project, Claude-ready)
9. Not yet built: automated reminder/follow-up scheduling job (architecture is in Settings; needs a cron — see below)
10. Not yet built: real Supabase persistence + auth
11. Not yet built: multi-user invitations UI (roles already exist in the data model)

## Next steps to go from MVP to production

- **Supabase**: create tables mirroring `src/lib/types.ts`, enable RLS on `workspace_id`, swap `databaseService`.
- **Scheduled jobs**: Vercel Cron (free on Hobby, limited to daily; Pro for hourly) hitting an API route that walks upcoming shoot days and triggers the reminder logic already described in `Settings`.
- **Google Calendar**: add a `calendarService` abstraction (not yet stubbed) once OAuth is needed.
