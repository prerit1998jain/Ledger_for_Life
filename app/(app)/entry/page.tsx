import { requireUserId } from "@/lib/session";
import { getEntry, listThemeNames } from "@/lib/entries";
import { EntryForm } from "./EntryForm";

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const userId = await requireUserId();

  const [existing, themeNames] = await Promise.all([
    id ? getEntry(userId, id) : Promise.resolve(null),
    listThemeNames(userId),
  ]);

  return (
    <div>
      <h1 className="font-serif-reflect text-2xl mb-1">
        {existing ? "Edit entry" : "Today's entry"}
      </h1>
      <p className="text-sm text-muted mb-6">
        Fill in whatever is live today. Empty categories are skipped — this isn&apos;t a checklist.
      </p>
      <EntryForm
        existing={
          existing && {
            ...existing,
            createdAt: existing.createdAt.toISOString(),
            updatedAt: existing.updatedAt.toISOString(),
          }
        }
        knownThemes={themeNames}
      />
    </div>
  );
}
