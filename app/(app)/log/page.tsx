import { requireUserId } from "@/lib/session";
import { listEntries, listThemeNames } from "@/lib/entries";
import { LogView } from "./LogView";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; theme?: string }>;
}) {
  const { q, theme } = await searchParams;
  const userId = await requireUserId();

  const [entries, themeNames] = await Promise.all([
    listEntries(userId, { query: q, theme }),
    listThemeNames(userId),
  ]);

  const serialized = entries.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="font-serif-reflect text-2xl mb-1">The log</h1>
      <p className="text-sm text-muted mb-6">
        {entries.length === 0 && !q && !theme
          ? "Nothing here yet — your first entry will show up as soon as you save one."
          : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}${q || theme ? " matching your filter" : ""}.`}
      </p>
      <LogView entries={serialized} themeNames={themeNames} initialQuery={q ?? ""} initialTheme={theme ?? ""} />
    </div>
  );
}
