import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";

export function ok(data: unknown = {}, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: fail("JSON формат буруу байна.", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: fail("Оруулсан мэдээлэл буруу байна.", 422, z.flattenError(parsed.error).fieldErrors) };
  }
  return { data: parsed.data };
}

export const idParam = z.coerce.number().int().positive();
