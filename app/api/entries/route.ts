import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { createEntry, isEntryEmpty, listEntries } from "@/lib/entries";
import { CATEGORY_KEYS } from "@/lib/categories";

const entryInputSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  tenor: z.string().max(200).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
  themeNames: z.array(z.string().max(80)).max(50).default([]),
  sections: z.partialRecord(z.enum(CATEGORY_KEYS), z.string().max(20000)).default({}),
});

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const entries = await listEntries(userId, {
      query: searchParams.get("q") ?? undefined,
      theme: searchParams.get("theme") ?? undefined,
    });
    return NextResponse.json({ entries });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = entryInputSchema.parse(await req.json());

    if (isEntryEmpty(body)) {
      return NextResponse.json({ error: "Entry is empty" }, { status: 400 });
    }

    const id = await createEntry(userId, body);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
