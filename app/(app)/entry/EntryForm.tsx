"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORY_HINTS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CategoryKey,
} from "@/lib/categories";
import type { EntryRecord } from "@/lib/entries";
import { AutoGrowTextarea } from "./AutoGrowTextarea";

type Sections = Partial<Record<CategoryKey, string>>;

export type SerializedEntry = Omit<EntryRecord, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

interface FormState {
  entryDate: string;
  tenor: string;
  summary: string;
  themes: string;
  sections: Sections;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyState(): FormState {
  return { entryDate: today(), tenor: "", summary: "", themes: "", sections: {} };
}

function fromExisting(entry: SerializedEntry): FormState {
  return {
    entryDate: entry.entryDate,
    tenor: entry.tenor ?? "",
    summary: entry.summary ?? "",
    themes: entry.themes.join(", "),
    sections: entry.sections,
  };
}

function isEmpty(state: FormState): boolean {
  const hasSection = CATEGORY_ORDER.some((key) => (state.sections[key] ?? "").trim().length > 0);
  return !hasSection && !state.tenor.trim() && !state.summary.trim();
}

export function EntryForm({
  existing,
  knownThemes,
}: {
  existing: SerializedEntry | null;
  knownThemes: string[];
}) {
  const router = useRouter();
  const draftKey = existing ? `ledger-draft-edit-${existing.id}` : "ledger-draft-new";
  const [state, setState] = useState<FormState>(() => (existing ? fromExisting(existing) : emptyState()));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);

  // F2: restore an in-progress draft across reloads. Deliberately a one-time
  // sync from an external store (localStorage) on mount, guarded so it never
  // repeats — not a derived-state loop.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = window.localStorage.getItem(draftKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState(JSON.parse(raw));
    } catch {
      // ignore malformed/unavailable localStorage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(draftKey, JSON.stringify(state));
    } catch {
      // ignore storage failures (private mode, quota)
    }
  }, [state, draftKey]);

  const themeSuggestions = useMemo(() => knownThemes, [knownThemes]);

  function updateSection(key: CategoryKey, value: string) {
    setState((s) => ({ ...s, sections: { ...s.sections, [key]: value } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isEmpty(state)) {
      setError("Add at least a summary, tenor, or one category before saving.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        entryDate: state.entryDate,
        tenor: state.tenor || null,
        summary: state.summary || null,
        themeNames: state.themes
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        sections: Object.fromEntries(
          Object.entries(state.sections).filter(([, v]) => (v ?? "").trim().length > 0),
        ),
      };

      const res = await fetch(existing ? `/api/entries/${existing.id}` : "/api/entries", {
        method: existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not save entry");
      }

      window.localStorage.removeItem(draftKey);
      router.push("/log");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Date</span>
          <input
            type="date"
            value={state.entryDate}
            onChange={(e) => setState((s) => ({ ...s, entryDate: e.target.value }))}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-1 min-w-[180px] flex-col gap-1 text-sm">
          <span className="text-muted">Tenor (2–3 words)</span>
          <input
            type="text"
            value={state.tenor}
            onChange={(e) => setState((s) => ({ ...s, tenor: e.target.value }))}
            placeholder="e.g. quietly restless"
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Summary</span>
        <AutoGrowTextarea
          value={state.summary}
          onChange={(v) => setState((s) => ({ ...s, summary: v }))}
          placeholder="One line on where your head's at today"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Themes (comma-separated)</span>
        <input
          type="text"
          list="theme-suggestions"
          value={state.themes}
          onChange={(e) => setState((s) => ({ ...s, themes: e.target.value }))}
          placeholder="e.g. job search, marathon training"
          className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <datalist id="theme-suggestions">
          {themeSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </label>

      <div className="flex flex-col gap-5 border-t border-border pt-6">
        {CATEGORY_ORDER.map((key) => (
          <label
            key={key}
            className={`flex flex-col gap-1 text-sm ${key === "passive" ? "ml-4 border-l border-border pl-4" : ""}`}
          >
            <span>
              {CATEGORY_LABELS[key]}
              {key === "passive" && (
                <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-xs text-accent">
                  priority
                </span>
              )}
            </span>
            <span className="text-xs text-muted">{CATEGORY_HINTS[key]}</span>
            <AutoGrowTextarea
              value={state.sections[key] ?? ""}
              onChange={(v) => updateSection(key, v)}
            />
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Save entry"}
        </button>
        {existing && (
          <span className="text-xs text-muted">
            Editing {existing.entryDate} — created {existing.createdAt.toString().slice(0, 10)}
          </span>
        )}
      </div>
    </form>
  );
}
