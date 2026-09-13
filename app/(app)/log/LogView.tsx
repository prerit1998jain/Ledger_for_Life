"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SerializedEntry } from "../entry/EntryForm";
import { EntryCard } from "./EntryCard";

export function LogView({
  entries,
  themeNames,
  initialQuery,
  initialTheme,
}: {
  entries: SerializedEntry[];
  themeNames: string[];
  initialQuery: string;
  initialTheme: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function pushFilters(next: { q?: string; theme?: string }) {
    const params = new URLSearchParams();
    const q = next.q ?? query;
    const theme = next.theme ?? initialTheme;
    if (q) params.set("q", q);
    if (theme) params.set("theme", theme);
    startTransition(() => router.push(`/log?${params.toString()}`));
  }

  async function handleImportFile(file: File) {
    setImportMsg(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Import failed");
      setImportMsg(`Imported ${body.imported} ${body.imported === 1 ? "entry" : "entries"}.`);
      router.refresh();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <form
          className="flex-1 min-w-[200px]"
          onSubmit={(e) => {
            e.preventDefault();
            pushFilters({ q: query });
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search summaries, tenor, themes, and entries…"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </form>

        <div className="flex items-center gap-2 text-sm">
          <a href="/api/export?format=json" className="text-muted hover:text-foreground">
            Export JSON
          </a>
          <span className="text-border">·</span>
          <a href="/api/export?format=md" className="text-muted hover:text-foreground">
            Export Markdown
          </a>
          <span className="text-border">·</span>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="text-muted hover:text-foreground"
          >
            Import JSON
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {importMsg && <p className="text-sm text-muted">{importMsg}</p>}

      {themeNames.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => pushFilters({ theme: "" })}
            className={`rounded-full border px-3 py-1 ${!initialTheme ? "border-accent text-accent" : "border-border text-muted"}`}
          >
            All
          </button>
          {themeNames.map((name) => (
            <button
              key={name}
              onClick={() => pushFilters({ theme: name === initialTheme ? "" : name })}
              className={`rounded-full border px-3 py-1 ${name === initialTheme ? "border-accent text-accent" : "border-border text-muted"}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
        {entries.length === 0 && (query || initialTheme) && (
          <p className="text-sm text-muted">No entries match that filter yet.</p>
        )}
      </div>
    </div>
  );
}
