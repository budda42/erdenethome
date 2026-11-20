import { NextResponse } from "next/server";
import path from "node:path";
import { readStoredFile } from "@/lib/storage";
import { getCurrentUser, can } from "@/lib/auth";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", pdf: "application/pdf",
};

// Property media is public; contract files require the contracts.read permission.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  if (segments.length !== 2) return NextResponse.json({ ok: false }, { status: 404 });
  const [folder, name] = segments;
  if (folder === "contracts") {
    const user = await getCurrentUser();
    if (!can(user, "contracts.read")) return NextResponse.json({ ok: false }, { status: 403 });
  }
  try {
    const data = await readStoredFile([folder, name]);
    const ext = path.extname(name).slice(1).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": folder === "properties" ? "public, max-age=86400" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
