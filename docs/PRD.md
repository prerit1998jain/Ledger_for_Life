# PRD — Mind-Space Ledger

**Version:** 0.3 (draft) · **Owner:** Prerit · **Status:** For build via Claude Code → GitHub → Vercel

> **v0.3 change:** Deployment confirmed as **Vercel**. Database set to **serverless Postgres** (operational/OLTP store) — see §5.1 for why Redshift is *not* the app DB, and §10 for where a warehouse like Redshift could sit later as an optional downstream analytics sink.
> **v0.2 change:** MVP ships single-user but is architected **multi-user-ready** (§3 principle 7, §5, §10); the later flip needs no data migration.

---

## 1. Summary

A private web app for structured life journaling and longitudinal self-analysis. The user logs dated reflections across a fixed set of life categories; the app then lets them interrogate that record over time — *what has stayed consistent, what has shifted, and what evidence moved it.*

The differentiator is not capture (a notes app does that) — it is **analysis over the accumulated record**: drift detection, consistency checks against past entries, and free-form questioning of one's own history, powered by Claude called server-side. This analysis is **LLM-over-text**, not SQL aggregation — which is why the app needs a transactional database, not a warehouse.

The MVP serves one user. The architecture is shaped so that becoming multi-user is an **additive** change, not a rewrite.

**One-line goal:** Turn scattered daily thinking into a queryable, category-structured record that answers "is my mind-space consistent with before, and if not, why?"

**Infrastructure:** Deploy on **Vercel**; store on **serverless Postgres**.

---

## 2. Users & jobs-to-be-done

MVP: single user (the owner). No signup UX, no sharing. Multi-user is a future phase, not an MVP feature.

| # | Job | Trigger |
|---|-----|---------|
| J1 | Log today's thinking in a structured way | End of day / whenever a thought lands |
| J2 | Check whether today's stance is consistent with the past | While or after writing an entry |
| J3 | See how a view on a theme has drifted over months, and what caused it | Periodic reflection |
| J4 | Ask an open question of the whole record | "What did I think about money in Q2 vs now?" |
| J5 | Track recurring beliefs/stances and their evolution | When a belief hardens, softens, or reverses |
| J6 | Own and export the data | Anytime |

---

## 3. Product principles

1. **Private-first.** This is the user's inner life. Access is locked to the authenticated identity; content is never exposed publicly or used for anything but that user's own analysis.
2. **Reflect, don't diagnose.** AI output mirrors the user's own record and cites dates. It surfaces patterns, contradictions, and questions — it does not psychoanalyse or assign clinical labels.
3. **Structured, not free-form-only.** The 10-category taxonomy is the backbone that makes comparison possible.
4. **Menu, not checklist.** Each entry fills only the categories that were live that day.
5. **The record is the source of truth.** Every AI claim traces back to a specific entry.
6. **Own your data.** Full export/import in open formats; no lock-in.
7. **Built single-user, shaped for multi-user.** Every owned row carries a `user_id`, every query is scoped to the session user, and isolation is enforced by row-level security — from day one, with one user. Multi-user is then additive: open signup, add profile UX. No schema rework, no data migration.

---

## 4. Scope

| In scope (v1 across phases) | Out of scope (MVP) |
|---|---|
| Structured entry capture across 10 categories | Multi-user **UX**: signup, onboarding, profiles, sharing |
| Persistent Postgres with per-user scoping + RLS | Teams / collaboration |
| Single-user auth (allowlist), per-user sessions | Public feeds, social features |
| Log browsing: search, theme filter, edit, delete | Native mobile apps (responsive web + optional PWA only) |
| Export / import (Markdown + JSON) | Rich media attachments |
| AI: ask, consistency check, drift analysis | Billing / plans / usage limits |
| Belief/stance tracker with evidence history | Analytics **warehouse** (Redshift/BigQuery/etc.) — future, optional |
| Periodic (weekly/monthly) synthesis | Reminders/notifications — Phase 4 optional |

**Multi-user readiness is in scope** (schema, auth, RLS, scoped queries). **Multi-user features are not.**

---

## 5. Data model

The app database is **serverless Postgres** (row-store / OLTP). Normalised category sections are preferred over a JSON blob so "pull every *Work* section across time" is a trivial query — that access pattern *is* the product.

**Multi-user rule:** every top-level owned table carries `user_id`. Child tables (`entry_sections`, `entry_themes`, `belief_events`) scope through their parent FK; optionally denormalise `user_id` onto them for simpler RLS policies. In MVP there is exactly one `user_id`, but it is present and enforced everywhere from the start.

### 5.1 Database choice: OLTP store, not a warehouse

| Requirement of this app | Fit |
|---|---|
| Frequent small writes (save/edit/delete an entry) | Postgres — fast single-row DML. Redshift is built for bulk S3 loads; single-row inserts are an anti-pattern. |
| Low-latency point reads (this user's entries) | Postgres — indexed lookups in ms. Redshift has high per-query overhead. |
| Serverless (Vercel) connections | Neon / Supabase / RDS Proxy handle short-lived serverless connections. Redshift has low connection limits and is awkward from serverless. |
| Per-user row-level security | Native in Postgres — the entire isolation design in §9/§10. Not the Redshift model. |
| Future vector search for RAG | `pgvector` in Postgres. Not available in Redshift. |
| Personal-scale cost | Postgres free tier. Redshift is warehouse-priced for kilobytes of text. |

**Decision:** Postgres is the operational store. **Redshift is not the app database.** A warehouse only earns its place downstream, at multi-user BI scale, fed from Postgres by ETL/CDC — see §10.

### `users` / identity
Identity is provided by the auth provider. If using Supabase, users live in `auth.users`. If using Neon/Aurora + Auth.js/Clerk, the provider issues the user id. A lightweight `profiles` table is optional for MVP.

| Field | Type | Notes |
|---|---|---|
| id | uuid, pk | matches auth provider user id; referenced as `user_id` elsewhere |
| email | text, unique | |
| created_at | timestamptz | |

### `entries`
| Field | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| user_id | uuid, fk → users | **scopes ownership; indexed** |
| entry_date | date | the day being journaled (not necessarily creation day) |
| tenor | text | 2–3 word headspace |
| summary | text | one-line summary |
| created_at / updated_at | timestamptz | |

### `entry_sections`
| Field | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| entry_id | uuid, fk → entries | cascade delete; scopes user via parent |
| category | enum | see Appendix A (11 values incl. `passive`) |
| body | text | the reflection for that category |

One row per filled category. Unique on (`entry_id`, `category`).

### `themes` + `entry_themes`
| `themes` | Type | | `entry_themes` | Type |
|---|---|---|---|---|
| id | uuid, pk | | entry_id | uuid, fk |
| user_id | uuid, fk → users | | theme_id | uuid, fk |
| name | text | | | |

`themes` unique on **(`user_id`, `name`)** — so different users can each have a "work" theme. Enables the **themes index** (each theme → dates it appears) and fast filtering.

### `beliefs` — the stance tracker
| Field | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| user_id | uuid, fk → users | **scopes ownership** |
| statement | text | the stance, e.g. "I want to exit my job within 2 years" |
| category | enum, nullable | which life area |
| status | enum | `active` \| `softened` \| `reversed` \| `resolved` |
| current_position | text | latest summary of where the user stands |
| first_seen / last_reviewed | date | |

### `belief_events` — movement history
| Field | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| belief_id | uuid, fk → beliefs | scopes user via parent |
| entry_id | uuid, fk → entries, nullable | source entry |
| event_date | date | |
| direction | enum | `introduced` \| `reinforced` \| `weakened` \| `nuanced` \| `reversed` |
| note | text | what changed |
| evidence | text | what moved it (event, conversation, data point) |

### `analyses` — cached AI outputs (optional but recommended)
| Field | Type | Notes |
|---|---|---|
| id | uuid, pk | |
| user_id | uuid, fk → users | **scopes ownership** |
| type | enum | `qa` \| `consistency` \| `drift` \| `synthesis` |
| params | jsonb | theme / date range / entry_id / belief_id |
| question | text | user's question if applicable |
| result | text | markdown |
| model | text | model id used |
| created_at | timestamptz | |

---

## 6. Features & requirements

Grouped by build phase. Each has acceptance criteria (AC). **All data access is scoped to the session user** — this is a cross-cutting AC on every feature below.

### Phase 1 — Capture & log (port the prototype onto real infra)

**F1. Entry composer**
- Fields: date (default today), tenor, summary, themes (comma-separated), 10 category bodies, passive-income sub-field flagged as priority under Money.
- AC: only non-empty categories are saved; auto-grow inputs; empty entry cannot be saved; save persists to DB (with the session `user_id`) and returns to a clean form.

**F2. Draft safety**
- AC: in-progress unsaved text is preserved across reload (local draft, cleared on save).

**F3. Log browsing**
- Reverse-chronological list; expand to full text; edit; delete (with confirm).
- AC: edit preserves id/created_at and updates updated_at; delete cascades sections/theme links; queries return only the session user's entries.

**F4. Search & filter**
- Full-text search across summary/tenor/themes/bodies; click a theme to filter.
- AC: results update live; empty-state copy is directional, not blank.

**F5. Export / import**
- Export whole log as Markdown (chronological) and JSON (lossless). Import JSON to restore.
- AC: export is one action; JSON round-trips without data loss; import writes under the session user.

**Phase 1 done = a deployed, authenticated, daily-usable journal with no AI yet.**

### Phase 2 — Core analysis

**F6. Ask the ledger (Q&A)**
- Free-form question answered from the user's entries, citing entry dates.
- AC: response cites specific dates; distinguishes user statements from AI inference; states plainly when the record doesn't cover the question rather than inventing; retrieval is scoped to the session user only.

**F7. Consistency check**
- For a selected/just-saved entry, compare against prior entries in the same categories; surface agreements and contradictions.
- AC: each flagged agreement/contradiction links to the source entry.

### Phase 3 — Belief tracking & drift

**F8. Belief extraction (assisted)**
- AI reads an entry and proposes candidate beliefs/stances + evidence; user confirms/edits before anything is written to `beliefs`/`belief_events`.
- AC: nothing enters the tracker without explicit user confirmation.

**F9. Drift analysis**
- Pick a theme or belief → timeline of how the position moved, with evidence at each step.
- AC: output is a dated sequence tracing to entries/belief_events; names the evidence that moved each shift.

### Phase 4 — Synthesis & polish (optional)

**F10. Periodic synthesis** — weekly/monthly rollup per category + tenor trend over the period.
**F11. Mobile/PWA** — installable, offline-tolerant capture.
**F12. Reminders** — optional nudge to log (email/push).

---

## 7. AI analysis design

| Aspect | Decision |
|---|---|
| Where it runs | Server-side only, in Next.js Route Handlers. Anthropic API key never reaches the client. |
| Scoping | Every retrieval query filters by the session `user_id`. The data-access layer always takes a user context; there is no global "load all entries" path. |
| Model | Configurable via `ANTHROPIC_MODEL` env var. Default to a Sonnet-class model for interactive analysis (latency/cost); allow an Opus-class model for deep synthesis. Confirm current model IDs from Anthropic docs at build time. |
| Retrieval | **Start simple.** For a personal log, the corpus stays well within context for a long time — load relevant entries (filtered by user + category/theme/date range) directly into the prompt. No vector DB initially. |
| When to add RAG | Only when a single user's filtered entries exceed a sane token budget. Then add `pgvector` embeddings + top-k retrieval, still scoped per user. Do not build this prematurely. |
| Prompt stance | System prompt positions Claude as reflecting the user's own record: cite dates, separate stated facts from inference, avoid clinical/diagnostic framing, ask sharp questions back. Mirrors Principle 2. |
| Caching | Persist non-trivial analyses in `analyses` (with `user_id`) to avoid re-spending on repeat questions. |
| Cost control | On-demand only (no background AI on every save unless the user triggers it). |

**Data-flow note:** AI features send entry text to the Anthropic API. This is a deliberate, disclosed trade-off — analysis requires the model to read the reflections. Use the commercial API (content not used for training by default); keep AI opt-in per action.

---

## 8. Recommended tech stack

| Layer | Recommended | Alternatives | Rationale |
|---|---|---|---|
| Deployment | **Vercel** | — | Confirmed target; zero-config Next deploys |
| Framework | Next.js (App Router) | Remix | First-class Vercel support; API routes co-located |
| App DB | **Serverless Postgres** — Vercel Postgres (Neon) *or* Supabase | Aurora Serverless v2 Postgres (if AWS-native required) | OLTP fit; serverless-friendly connections; native RLS + `pgvector`. **Not Redshift** (see §5.1) |
| Auth | Supabase Auth (magic link) **if** Supabase; else Auth.js or Clerk | — | Issues per-user sessions from day one; MVP restricts *who* may sign in via allowlist |
| ORM | Drizzle | Prisma | Lightweight, typed, migration-friendly for Claude Code |
| AI | Anthropic API (`@anthropic-ai/sdk`) | — | Powers all analysis |
| Styling | Tailwind + a small component set | plain CSS | Fast, consistent; carry the prototype's calm, editorial look |

**Picking the Postgres provider:**
- **Vercel Postgres (Neon)** — tightest Vercel DX; pair with Auth.js/Clerk for auth.
- **Supabase** — bundles Postgres + Auth + RLS in one; least glue code. *Recommended default* given the auth + RLS design.
- **Aurora Serverless v2 (Postgres)** — only if staying AWS-native is a hard requirement; add **RDS Proxy** for serverless connection pooling and Auth.js/Clerk for auth. More moving parts.

**Auth note:** do **not** hardcode a single identity into queries. Use standard per-user sessions; in MVP, gate *sign-in* by an email allowlist. Every query already reads `session.user.id`, so removing the allowlist later is the whole change.

Keep the visual language from the prototype: structured, quiet, legible; serif for the reflective text, clean sans for chrome; single restrained accent. Not a moody-journal cliché — a precise instrument for thinking.

---

## 9. Non-functional requirements

**Privacy & security (highest priority)**
- Auth required on all routes (pages + API); MVP sign-in restricted by email allowlist.
- **Row-Level Security from day one:** Postgres RLS policies restricting every owned table to its `user_id`. Set the user context per request — via the provider's JWT claim (Supabase `auth.uid()`) or a per-transaction session variable (`SET LOCAL app.current_user_id = …`) on Neon/Aurora. With one user this is invisible; with many it is the isolation guarantee, requiring no later retrofit. Enforce scoping in the data-access layer **and** in RLS (defence in depth).
- Secrets in Vercel env vars; Anthropic key and DB service-role/admin credentials server-only; never client-exposed.
- TLS in transit; provider encryption at rest.
- No third-party analytics that capture content. Never log entry bodies (log ids/timestamps only).
- **Optional hardening (decision needed):** app-layer encryption of `body` fields for zero-trust from the DB provider. Trade-off: server-side AI analysis needs plaintext, so bodies would be decrypted in the Route Handler at analysis time — this protects the DB at rest but not the compute path. Document the boundary rather than implying more than it gives.

**Other**
- Responsive down to mobile (daily capture happens on a phone).
- Accessible: labelled inputs, visible keyboard focus, reduced-motion respected.
- Reliability: DB backups (provider automated) + user-owned JSON export as the ultimate backstop.
- Cost: dominated by AI calls; low personal volume; cache analyses; AI strictly on-demand. Postgres at this scale is free-tier.

---

## 10. Path to multi-user (and where a warehouse fits)

The MVP is single-user, but nothing about it blocks multi-user. Readiness is built in now; features are added later.

| Concern | MVP (now) | Multi-user (later) |
|---|---|---|
| Identity | One allowlisted user; auth provider already issues per-user sessions | Open or invite-based signup; remove the allowlist |
| Data ownership | `user_id` on every owned row; all queries scoped to `session.user.id` | **No schema change** — same scoping already in force |
| Isolation | RLS restricting each row to its `user_id`, enforced with one user | Already enforced; nothing to retrofit |
| Themes | Unique per (`user_id`, `name`) | Unchanged |
| AI / retrieval | Data-access layer always takes a user context; no global reads | Unchanged |
| UX | No profile / onboarding / settings screens | Add signup, profile, settings, (optional) sharing |
| Billing | None | Add plans / limits if needed |

**The flip to multi-user =** turn off the signup allowlist + add onboarding/profile UX. **No data migration**, because `user_id` and RLS exist from the start.

**Where Redshift (or any warehouse) fits — later, optional.** The app DB stays Postgres regardless. If, at multi-user scale, you want cross-user BI (cohorts, aggregate trends, product analytics), stand up a warehouse **downstream** and feed it from Postgres by ETL/CDC. It is an analytics **sink**, never the operational store, and it is unnecessary for the app's own per-user analysis (which is LLM-over-text). Do not build it until there is a real reporting need.

**Guardrails to hold during MVP build (cheap now, expensive to retrofit):**
- Never write a query without a `user_id` filter (rely on RLS *and* explicit filters).
- Never assume "the one user" anywhere in code — always read the session.
- Keep all owned tables carrying `user_id`; keep RLS policies on from the first migration.

---

## 11. Build plan (milestones)

| Milestone | Delivers | Definition of done |
|---|---|---|
| M0 — Setup | Repo, Next.js, Vercel, Postgres provider, auth + allowlist, schema/migrations **with user_id + RLS**, env | App deploys on Vercel; login works; RLS active on empty DB |
| M1 — Capture & log | F1–F5 | Daily journal fully usable, deployed, authenticated, user-scoped |
| M2 — Core analysis | F6–F7 | Ask + consistency check, citing entries |
| M3 — Beliefs & drift | F8–F9 | Confirmed belief tracker + drift timeline |
| M4 — Synthesis & polish | F10–F12 (optional) | Periodic synthesis; PWA; reminders |
| M5 — Multi-user (future) | Signup, profiles, settings | Allowlist removed; onboarding live; no data migration needed |

Each milestone should end deployable — the app is genuinely usable after M1 even before any AI exists.

---

## 12. Open decisions (before / early in build)

| # | Decision | Default if undecided |
|---|---|---|
| D1 | Postgres provider | Supabase (Postgres + Auth + RLS in one) |
| D1a | App DB type | Postgres (OLTP). **Redshift ruled out as app DB — §5.1**; warehouse only downstream, future |
| D2 | Sections normalised vs JSONB | Normalised `entry_sections` |
| D3 | Belief tracker in MVP or Phase 3 | Phase 3 (keep M1 lean) |
| D4 | Default analysis model | Sonnet-class, env-configurable |
| D5 | App-layer body encryption | Skip for v1; provider-at-rest + RLS only; revisit |
| D6 | PWA/mobile install | Phase 4 |
| D7 | Reminders channel (if built) | Email |
| D8 | MVP sign-in gate | Email allowlist (single entry now) |
| D9 | `profiles` table vs auth-provider user only | Auth-provider user only for MVP |

---

## Appendix A — Category enum

| # | key | Category | Notes |
|---|---|---|---|
| 1 | `physical` | Physical Health | Training, nutrition, sleep, recovery, medical |
| 2 | `mental` | Mental & Emotional Health | Mood, stress, motivation, self-talk, coping |
| 3 | `work` | Work & Career | Performance, ambition, key relationships, wins & friction |
| 4 | `growth` | Growth & Learning | Skills, ideas, what you're getting better at |
| 5 | `money` | Money & Wealth | Income, spending, savings, investments, security |
| 5a | `passive` | Passive Income | Sub-track of Money, flagged **priority** |
| 6 | `sports` | Sports | Performance, team & captaincy, drive, enjoyment |
| 7 | `relationships` | Relationships | Partner, family, friends, network |
| 8 | `ventures` | Personal Ventures & Community | Side projects, creative work, leadership |
| 9 | `travel` | Travel & Experiences | Upcoming plans, recent trips, aspirations |
| 10 | `identity` | Identity, Values & Direction | Values, vision, what success means now |

## Appendix B — Env vars

```
DATABASE_URL=              # Postgres connection string (Neon / Supabase / Aurora)
# --- if Supabase ---
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= # server-only
# --- if Neon/Aurora + Auth.js/Clerk ---
AUTH_SECRET=               # session signing (Auth.js)
# (Clerk uses its own CLERK_* keys)
# --- common ---
AUTH_ALLOWLIST=            # comma-separated emails permitted to sign in (MVP: just yours)
ANTHROPIC_API_KEY=         # server-only
ANTHROPIC_MODEL=           # e.g. a current Sonnet-class model id
```

## Appendix C — Suggested repo structure

```
/app
  /(auth)/login
  /(app)/entry          # composer
  /(app)/log            # browse/search
  /(app)/analysis       # ask / drift / consistency
  /(app)/beliefs        # tracker
  /api
    /entries            # CRUD (user-scoped)
    /analysis           # ask | consistency | drift | synthesis
    /export | /import
/db                     # schema + migrations (Drizzle), incl. RLS policies
/lib                    # anthropic client, prompts, auth/session, user-scoped data access
/docs/PRD.md
```

---

## Build status (this repo)

This tracks what has actually been implemented against the plan above — see `README.md` for setup instructions.

- **M0 — Setup: done.** Next.js (App Router, TS, Tailwind) on Next.js 16; Drizzle schema for every table in §5 (incl. `beliefs`/`belief_events`/`analyses`, ready but unused before Phase 3); RLS enabled + forced on every owned table with policies keyed off a `SET LOCAL app.current_user_id` session variable (the Neon/Aurora pattern from §9), verified directly against Postgres (isolated reads, and a cross-user insert rejected by the `WITH CHECK` clause); email allowlist gate. Auth is Auth.js v5 Credentials (email + password, JWT sessions) rather than §8's magic-link default — one of the table's own listed alternatives ("else Auth.js or Clerk") — switched after magic links proved impractical for daily single-user use; password set/reset is one emailed-single-use-token flow (`/forgot-password` → `/reset-password`), verified end-to-end including token replay rejection. Deployable to Vercel (Node.js proxy/runtime, no Edge-incompatible code paths).
- **M1 — Capture & log: done.** F1 (composer, all 11 categories incl. priority-flagged Passive Income, empty-entry rejection), F2 (localStorage draft safety, separate keys for new vs. edit), F3 (browse/expand/edit/delete with cascading deletes), F4 (search across summary/tenor/themes/section bodies + theme filter chips), F5 (JSON export/import round-trip, chronological Markdown export) are implemented and build-verified.
- **M2/M3/M4 (AI analysis, beliefs, synthesis): not built.** `/analysis` and `/beliefs` are placeholder pages. These need `ANTHROPIC_API_KEY`, a model decision, and a live Postgres instance with real data to build against sensibly — see README "Next steps."
- **M5 (multi-user UX): not built, by design** — the schema/RLS/session-scoping underneath it already assumes multi-user (per §3 principle 7), so this is additive whenever it's wanted.
