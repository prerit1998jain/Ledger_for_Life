"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import type { SerializedEntry } from "../entry/EntryForm";

export function EntryCard({ entry }: { entry: SerializedEntry }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filledCategories = CATEGORY_ORDER.filter((key) => entry.sections[key]);

  async function handleDelete() {
    if (!confirm(`Delete the entry from ${entry.entryDate}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{entry.entryDate}</span>
            {entry.tenor && <span className="text-muted">— {entry.tenor}</span>}
          </div>
          {entry.summary && (
            <p className="font-serif-reflect mt-1 text-sm text-foreground">{entry.summary}</p>
          )}
          {entry.themes.length > 0 && (
            <p className="mt-1 text-xs text-muted">{entry.themes.join(", ")}</p>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted">{expanded ? "Collapse" : "Expand"}</span>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4">
          {filledCategories.length === 0 && (
            <p className="text-sm text-muted">No categories filled for this entry.</p>
          )}
          {filledCategories.map((key) => (
            <div key={key}>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">
                {CATEGORY_LABELS[key]}
              </h3>
              <p className="font-serif-reflect mt-1 whitespace-pre-wrap text-sm">
                {entry.sections[key]}
              </p>
            </div>
          ))}

          <div className="flex items-center gap-4 text-sm">
            <Link href={`/entry?id=${entry.id}`} className="text-accent hover:underline">
              Edit
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-danger hover:underline disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
