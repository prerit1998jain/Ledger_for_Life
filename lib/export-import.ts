import "server-only";
import { z } from "zod";
import { CATEGORY_KEYS, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { createEntry, listEntries, type EntryRecord } from "@/lib/entries";

export const EXPORT_FORMAT_VERSION = 1;

export interface ExportPayload {
  formatVersion: number;
  exportedAt: string;
  entries: EntryRecord[];
}

/** F5: lossless JSON export — the round-trip / backup format. */
export async function exportJson(userId: string): Promise<ExportPayload> {
  const entries = await listEntries(userId);
  return {
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

/** F5: human-readable chronological Markdown export. */
export async function exportMarkdown(userId: string): Promise<string> {
  const entries = await listEntries(userId);
  const chronological = [...entries].reverse();

  const lines: string[] = ["# Mind-Space Ledger", ""];

  for (const entry of chronological) {
    lines.push(`## ${entry.entryDate}${entry.tenor ? ` — ${entry.tenor}` : ""}`);
    if (entry.summary) lines.push("", entry.summary);
    if (entry.themes.length > 0) lines.push("", `*Themes: ${entry.themes.join(", ")}*`);
    for (const key of CATEGORY_ORDER) {
      const body = entry.sections[key];
      if (!body) continue;
      lines.push("", `### ${CATEGORY_LABELS[key]}`, "", body);
    }
    lines.push("", "---", "");
  }

  return lines.join("\n");
}

const importEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tenor: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  themes: z.array(z.string()).default([]),
  sections: z.partialRecord(z.enum(CATEGORY_KEYS), z.string()).default({}),
});

const importPayloadSchema = z.object({
  formatVersion: z.number(),
  entries: z.array(importEntrySchema),
});

/** F5: import writes every entry under the current session user (never a global load path). */
export async function importJson(userId: string, raw: unknown): Promise<{ imported: number }> {
  const payload = importPayloadSchema.parse(raw);

  let imported = 0;
  for (const entry of payload.entries) {
    await createEntry(userId, {
      entryDate: entry.entryDate,
      tenor: entry.tenor,
      summary: entry.summary,
      themeNames: entry.themes,
      sections: entry.sections,
    });
    imported += 1;
  }

  return { imported };
}
