import { relations } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  date,
  integer,
  primaryKey,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { CATEGORY_KEYS } from "@/lib/categories";

// ---------------------------------------------------------------------------
// Identity (Auth.js Drizzle adapter tables). `users.id` is the `user_id`
// referenced by every owned table below — see PRD §5 "Multi-user rule".
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// ---------------------------------------------------------------------------
// Category enum — Appendix A (11 values incl. `passive`)
// ---------------------------------------------------------------------------

export const categoryEnum = pgEnum("category", CATEGORY_KEYS);

// ---------------------------------------------------------------------------
// Entries — PRD §5 `entries` / `entry_sections`
// ---------------------------------------------------------------------------

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryDate: date("entry_date", { mode: "string" }).notNull(),
    tenor: text("tenor"),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("entries_user_id_idx").on(table.userId),
    index("entries_user_date_idx").on(table.userId, table.entryDate),
  ],
);

export const entrySections = pgTable(
  "entry_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    // Denormalised for simpler RLS policies (PRD §5 "child tables ... optionally
    // denormalise user_id onto them").
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: categoryEnum("category").notNull(),
    body: text("body").notNull(),
  },
  (table) => [
    uniqueIndex("entry_sections_entry_category_unique").on(table.entryId, table.category),
    index("entry_sections_user_id_idx").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// Themes — PRD §5 `themes` / `entry_themes`
// ---------------------------------------------------------------------------

export const themes = pgTable(
  "themes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("themes_user_id_name_unique").on(table.userId, table.name),
  ],
);

export const entryThemes = pgTable(
  "entry_themes",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    themeId: uuid("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.themeId] }),
    index("entry_themes_user_id_idx").on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// Beliefs — PRD §5 `beliefs` / `belief_events` (Phase 3, schema laid now)
// ---------------------------------------------------------------------------

export const beliefStatusEnum = pgEnum("belief_status", [
  "active",
  "softened",
  "reversed",
  "resolved",
]);

export const beliefDirectionEnum = pgEnum("belief_direction", [
  "introduced",
  "reinforced",
  "weakened",
  "nuanced",
  "reversed",
]);

export const beliefs = pgTable(
  "beliefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    statement: text("statement").notNull(),
    category: categoryEnum("category"),
    status: beliefStatusEnum("status").notNull().default("active"),
    currentPosition: text("current_position"),
    firstSeen: date("first_seen", { mode: "string" }),
    lastReviewed: date("last_reviewed", { mode: "string" }),
  },
  (table) => [index("beliefs_user_id_idx").on(table.userId)],
);

export const beliefEvents = pgTable(
  "belief_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beliefId: uuid("belief_id")
      .notNull()
      .references(() => beliefs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id").references(() => entries.id, { onDelete: "set null" }),
    eventDate: date("event_date", { mode: "string" }).notNull(),
    direction: beliefDirectionEnum("direction").notNull(),
    note: text("note"),
    evidence: text("evidence"),
  },
  (table) => [index("belief_events_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Analyses — PRD §5 `analyses` (cached AI outputs, Phase 2+)
// ---------------------------------------------------------------------------

export const analysisTypeEnum = pgEnum("analysis_type", [
  "qa",
  "consistency",
  "drift",
  "synthesis",
]);

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: analysisTypeEnum("type").notNull(),
    params: jsonb("params"),
    question: text("question"),
    result: text("result"),
    model: text("model"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("analyses_user_id_idx").on(table.userId)],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  entries: many(entries),
  themes: many(themes),
  beliefs: many(beliefs),
}));

export const entriesRelations = relations(entries, ({ one, many }) => ({
  user: one(users, { fields: [entries.userId], references: [users.id] }),
  sections: many(entrySections),
  entryThemes: many(entryThemes),
}));

export const entrySectionsRelations = relations(entrySections, ({ one }) => ({
  entry: one(entries, { fields: [entrySections.entryId], references: [entries.id] }),
}));

export const themesRelations = relations(themes, ({ many }) => ({
  entryThemes: many(entryThemes),
}));

export const entryThemesRelations = relations(entryThemes, ({ one }) => ({
  entry: one(entries, { fields: [entryThemes.entryId], references: [entries.id] }),
  theme: one(themes, { fields: [entryThemes.themeId], references: [themes.id] }),
}));

export const beliefsRelations = relations(beliefs, ({ many }) => ({
  events: many(beliefEvents),
}));

export const beliefEventsRelations = relations(beliefEvents, ({ one }) => ({
  belief: one(beliefs, { fields: [beliefEvents.beliefId], references: [beliefs.id] }),
  entry: one(entries, { fields: [beliefEvents.entryId], references: [entries.id] }),
}));
