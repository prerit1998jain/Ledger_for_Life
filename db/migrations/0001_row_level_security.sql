-- Row-Level Security, from day one (PRD §9, §10).
--
-- The app is not connecting as distinct Postgres roles per user (Auth.js
-- sessions live at the application layer), so isolation is enforced via the
-- session-variable pattern PRD §9 describes for Neon/Aurora: every request
-- that touches user-owned data runs inside a transaction that first sets
-- `app.current_user_id` (see db/index.ts `withUserContext`), and every
-- policy below checks the owning row's `user_id` against that setting.
--
-- This is defense-in-depth: the data-access layer already filters every
-- query by `user_id` explicitly. RLS is the backstop that holds even if an
-- app-layer filter is ever missed.
--> statement-breakpoint

alter table "entries" enable row level security;
alter table "entry_sections" enable row level security;
alter table "themes" enable row level security;
alter table "entry_themes" enable row level security;
alter table "beliefs" enable row level security;
alter table "belief_events" enable row level security;
alter table "analyses" enable row level security;
--> statement-breakpoint

alter table "entries" force row level security;
alter table "entry_sections" force row level security;
alter table "themes" force row level security;
alter table "entry_themes" force row level security;
alter table "beliefs" force row level security;
alter table "belief_events" force row level security;
alter table "analyses" force row level security;
--> statement-breakpoint

create policy "entries_owner_all" on "entries"
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
--> statement-breakpoint

create policy "entry_sections_owner_all" on "entry_sections"
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
--> statement-breakpoint

create policy "themes_owner_all" on "themes"
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
--> statement-breakpoint

create policy "entry_themes_owner_all" on "entry_themes"
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
--> statement-breakpoint

create policy "beliefs_owner_all" on "beliefs"
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
--> statement-breakpoint

create policy "belief_events_owner_all" on "belief_events"
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
--> statement-breakpoint

create policy "analyses_owner_all" on "analyses"
  using (user_id = current_setting('app.current_user_id', true)::uuid)
  with check (user_id = current_setting('app.current_user_id', true)::uuid);
