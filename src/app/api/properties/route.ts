import { ok, fail } from "@/lib/http";
import { publicFilterSchema } from "@/lib/properties";
import { listPublic } from "@/lib/listings";

// Public listing API. Only ads visible to visitors (active or reserved) are returned.
// CORS is open so the static GitHub Pages site can show the same live listings; the
// response is public data and no cookies are read or sent.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Accept, Content-Type",
};

export async function GET(req: Request) {
  const parsed = publicFilterSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  let res;
  if (!parsed.success) {
    res = fail("Шүүлтүүрийн утга буруу байна.", 422);
  } else {
    const { total, items } = await listPublic(parsed.data);
    res = ok({ total, page: parsed.data.page, pageSize: parsed.data.pageSize, items });
  }
  Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
