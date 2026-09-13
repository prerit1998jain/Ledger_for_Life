# Mind-Space Ledger

A private, structured journal for tracking how your thinking moves over time — and, eventually,
for asking it questions. Full product spec: [`docs/PRD.md`](docs/PRD.md).

Built with Next.js (App Router) + Drizzle ORM + Postgres + Auth.js, deployed on Vercel.

## Status

Phase 1 (capture & log) is complete and usable with no AI involved: entry composer, draft
safety, browsing/search/filter, edit/delete, and JSON/Markdown export + JSON import. Phase 2+
(AI analysis, belief tracking, synthesis) are scoped in the PRD but not yet built — see
[`docs/PRD.md` → Build status](docs/PRD.md#build-status-this-repo) for exactly what's done.

## Local setup

Requires Node 20+, a Postgres database, and `npm`.

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and AUTH_SECRET at minimum
npm run db:migrate           # applies schema + row-level security policies
npm run dev
```

Generate `AUTH_SECRET` with `npx auth secret`. `AUTH_ALLOWLIST` should be your own email —
sign-in is rejected for anyone not on that list (PRD §9, D8).

Without `SMTP_HOST` configured, the magic sign-in link is logged to the server console instead
of emailed, so you can exercise the whole flow locally without a mail provider. Configure real
SMTP (Resend, Postmark, SES, Gmail, etc.) before deploying.

### Database migrations

Schema lives in `db/schema.ts`; migrations are plain SQL in `db/migrations/`, including
`0001_row_level_security.sql`, which turns on and forces RLS on every user-owned table and adds
the per-user isolation policies described in PRD §9/§10.

```bash
npm run db:generate   # after changing db/schema.ts, generate a new migration
npm run db:migrate     # apply pending migrations
npm run db:studio      # browse the DB with Drizzle Studio
```

## Deploying

1. Provision a serverless Postgres instance (Neon, Supabase, or Aurora Serverless v2 — see PRD
   §8/§12 D1). Any of these work as-is since RLS uses the session-variable pattern rather than
   Supabase-specific `auth.uid()`.
2. Push this repo to GitHub and import it into Vercel.
3. Set the env vars from `.env.example` in the Vercel project (Production + Preview).
4. Run `npm run db:migrate` once against the production database (locally, pointed at the prod
   `DATABASE_URL`, or via a one-off Vercel deployment step).
5. Deploy. `AUTH_ALLOWLIST` should contain only your own email for the MVP.

## Architecture notes

- **Row-level security from day one.** Every owned table (`entries`, `entry_sections`, `themes`,
  `entry_themes`, `beliefs`, `belief_events`, `analyses`) carries a `user_id` and has RLS
  enabled + forced. The data-access layer (`db/index.ts` → `withUserContext`) opens a
  transaction, sets `app.current_user_id`, and every query still filters by `user_id` explicitly
  — RLS is the backstop, not the only guard. This was verified directly against Postgres: two
  users each see only their own rows, and an attempted cross-user insert is rejected by the
  policy's `WITH CHECK` clause.
- **Single-user MVP, multi-user-shaped.** There's no signup flow or profile UX — sign-in is
  gated by `AUTH_ALLOWLIST` (`lib/allowlist.ts`) — but nothing in the schema, queries, or auth
  model assumes a single user. Removing the allowlist and adding onboarding screens is the whole
  multi-user flip (PRD §10); no migration.
- **Proxy, not Middleware.** Next.js 16 renamed `middleware.ts` to `proxy.ts` and defaults it to
  the Node.js runtime — this repo's `proxy.ts` relies on that, since session lookups need
  Postgres access that isn't available on the Edge runtime.
- **AI analysis is not wired up yet.** `/analysis` and `/beliefs` are placeholders. Building
  them needs an `ANTHROPIC_API_KEY`, a model choice (PRD §7/§12 D4), and a live database with
  real entries to sanity-check retrieval and prompts against.

## Next steps

- Provision the production Postgres instance + SMTP provider and deploy to Vercel.
- Phase 2 (F6–F7): Q&A over the ledger and consistency checking, per PRD §6/§7.
- Phase 3 (F8–F9): assisted belief extraction and drift analysis.
- Phase 4 (optional): periodic synthesis, PWA, reminders.
