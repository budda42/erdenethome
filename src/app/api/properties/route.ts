import { ok, fail } from "@/lib/http";
import { publicFilterSchema } from "@/lib/properties";
import { listPublic } from "@/lib/listings";

// Public listing API. Only ads visible to visitors (active or reserved) are returned.
export async function GET(req: Request) {
  const parsed = publicFilterSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return fail("Шүүлтүүрийн утга буруу байна.", 422);
  const { total, items } = await listPublic(parsed.data);
  return ok({ total, page: parsed.data.page, pageSize: parsed.data.pageSize, items });
}
