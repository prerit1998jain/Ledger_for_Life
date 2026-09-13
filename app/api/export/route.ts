import { NextRequest, NextResponse } from "next/server";
import { requireUserId, UnauthorizedError } from "@/lib/session";
import { exportJson, exportMarkdown } from "@/lib/export-import";

export async function GET(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const format = new URL(req.url).searchParams.get("format") ?? "json";

    if (format === "md" || format === "markdown") {
      const md = await exportMarkdown(userId);
      return new NextResponse(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="ledger-export.md"`,
        },
      });
    }

    const json = await exportJson(userId);
    return new NextResponse(JSON.stringify(json, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="ledger-export.json"`,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
