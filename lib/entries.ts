import "server-only";
import { and, desc, eq, exists, ilike, inArray, or } from "drizzle-orm";
import { withUserContext, type Tx } from "@/db";
import { entries, entrySections, entryThemes, themes } from "@/db/schema";
import { CATEGORY_KEYS, type CategoryKey, isCategoryKey } from "@/lib/categories";

export type EntrySectionInput = Partial<Record<CategoryKey, string>>;

export interface EntryInput {
  entryDate: string;
  tenor?: string | null;
  summary?: string | null;
  themeNames: string[];
  sections: EntrySectionInput;
}

export interface EntryRecord {
  id: string;
  entryDate: string;
  tenor: string | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
  themes: string[];
  sections: EntrySectionInput;
}

function nonEmptySections(sections: EntrySectionInput): Array<[CategoryKey, string]> {
  return Object.entries(sections).filter(
    (pair): pair is [CategoryKey, string] =>
      isCategoryKey(pair[0]) && typeof pair[1] === "string" && pair[1].trim().length > 0,
  );
}

/** F1 AC: an entry with no filled category and no summary/tenor cannot be saved. */
export function isEntryEmpty(input: Pick<EntryInput, "tenor" | "summary" | "sections">): boolean {
  const hasSections = nonEmptySections(input.sections).length > 0;
  const hasTenor = Boolean(input.tenor?.trim());
  const hasSummary = Boolean(input.summary?.trim());
  return !hasSections && !hasTenor && !hasSummary;
}

async function upsertThemesAndLink(tx: Tx, userId: string, entryId: string, themeNames: string[]) {
  await tx.delete(entryThemes).where(eq(entryThemes.entryId, entryId));

  const cleanNames = [...new Set(themeNames.map((n) => n.trim()).filter(Boolean))];
  if (cleanNames.length === 0) return;

  for (const name of cleanNames) {
    const [theme] = await tx
      .insert(themes)
      .values({ userId, name })
      .onConflictDoUpdate({
        target: [themes.userId, themes.name],
        set: { name },
      })
      .returning({ id: themes.id });

    await tx.insert(entryThemes).values({ entryId, themeId: theme.id, userId });
  }
}

export async function createEntry(userId: string, input: EntryInput): Promise<string> {
  return withUserContext(userId, async (tx) => {
    const [entry] = await tx
      .insert(entries)
      .values({
        userId,
        entryDate: input.entryDate,
        tenor: input.tenor?.trim() || null,
        summary: input.summary?.trim() || null,
      })
      .returning({ id: entries.id });

    const sections = nonEmptySections(input.sections);
    if (sections.length > 0) {
      await tx.insert(entrySections).values(
        sections.map(([category, body]) => ({
          entryId: entry.id,
          userId,
          category,
          body: body.trim(),
        })),
      );
    }

    await upsertThemesAndLink(tx, userId, entry.id, input.themeNames);

    return entry.id;
  });
}

export async function updateEntry(userId: string, entryId: string, input: EntryInput): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx
      .update(entries)
      .set({
        entryDate: input.entryDate,
        tenor: input.tenor?.trim() || null,
        summary: input.summary?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(eq(entries.id, entryId), eq(entries.userId, userId)));

    await tx
      .delete(entrySections)
      .where(and(eq(entrySections.entryId, entryId), eq(entrySections.userId, userId)));

    const sections = nonEmptySections(input.sections);
    if (sections.length > 0) {
      await tx.insert(entrySections).values(
        sections.map(([category, body]) => ({
          entryId,
          userId,
          category,
          body: body.trim(),
        })),
      );
    }

    await upsertThemesAndLink(tx, userId, entryId, input.themeNames);
  });
}

export async function deleteEntry(userId: string, entryId: string): Promise<void> {
  await withUserContext(userId, async (tx) => {
    await tx.delete(entries).where(and(eq(entries.id, entryId), eq(entries.userId, userId)));
  });
}

async function hydrateEntries(tx: Tx, userId: string, entryRows: (typeof entries.$inferSelect)[]): Promise<EntryRecord[]> {
  if (entryRows.length === 0) return [];
  const ids = entryRows.map((e) => e.id);

  const sectionRows = await tx
    .select()
    .from(entrySections)
    .where(and(eq(entrySections.userId, userId), inArray(entrySections.entryId, ids)));

  const themeRows = await tx
    .select({ entryId: entryThemes.entryId, name: themes.name })
    .from(entryThemes)
    .innerJoin(themes, eq(themes.id, entryThemes.themeId))
    .where(and(eq(entryThemes.userId, userId), inArray(entryThemes.entryId, ids)));

  return entryRows.map((entry) => ({
    id: entry.id,
    entryDate: entry.entryDate,
    tenor: entry.tenor,
    summary: entry.summary,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    themes: themeRows.filter((t) => t.entryId === entry.id).map((t) => t.name),
    sections: Object.fromEntries(
      sectionRows.filter((s) => s.entryId === entry.id).map((s) => [s.category, s.body]),
    ) as EntrySectionInput,
  }));
}

export interface ListEntriesParams {
  query?: string;
  theme?: string;
}

/** F3/F4: reverse-chronological log, with optional full-text search and theme filter. */
export async function listEntries(userId: string, params: ListEntriesParams = {}): Promise<EntryRecord[]> {
  return withUserContext(userId, async (tx) => {
    const conditions = [eq(entries.userId, userId)];

    if (params.query?.trim()) {
      const term = `%${params.query.trim()}%`;
      conditions.push(
        or(
          ilike(entries.summary, term),
          ilike(entries.tenor, term),
          exists(
            tx
              .select()
              .from(entrySections)
              .where(and(eq(entrySections.entryId, entries.id), ilike(entrySections.body, term))),
          ),
          exists(
            tx
              .select()
              .from(entryThemes)
              .innerJoin(themes, eq(themes.id, entryThemes.themeId))
              .where(and(eq(entryThemes.entryId, entries.id), ilike(themes.name, term))),
          ),
        )!,
      );
    }

    if (params.theme?.trim()) {
      conditions.push(
        exists(
          tx
            .select()
            .from(entryThemes)
            .innerJoin(themes, eq(themes.id, entryThemes.themeId))
            .where(
              and(
                eq(entryThemes.entryId, entries.id),
                eq(themes.name, params.theme!.trim()),
              ),
            ),
        ),
      );
    }

    const rows = await tx
      .select()
      .from(entries)
      .where(and(...conditions))
      .orderBy(desc(entries.entryDate), desc(entries.createdAt));

    return hydrateEntries(tx, userId, rows);
  });
}

export async function getEntry(userId: string, entryId: string): Promise<EntryRecord | null> {
  return withUserContext(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(entries)
      .where(and(eq(entries.id, entryId), eq(entries.userId, userId)));
    const hydrated = await hydrateEntries(tx, userId, rows);
    return hydrated[0] ?? null;
  });
}

export async function listThemeNames(userId: string): Promise<string[]> {
  return withUserContext(userId, async (tx) => {
    const rows = await tx
      .select({ name: themes.name })
      .from(themes)
      .where(eq(themes.userId, userId))
      .orderBy(themes.name);
    return rows.map((r) => r.name);
  });
}

export { CATEGORY_KEYS };
