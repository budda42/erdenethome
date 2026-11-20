import { randomBytes } from "node:crypto";
import { z } from "zod";
import { query, withTx } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getCurrentUser, audit } from "@/lib/auth";
import { propertyInputSchema } from "@/lib/properties";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

// Customers post their own listings. By default they start as "under_review": the owner sees
// the ad on /map at once, and an admin approves it in /admin/properties before others see it.
// Set LISTINGS_AUTO_PUBLISH=true to publish customer ads immediately instead.
const AUTO_PUBLISH = process.env.LISTINGS_AUTO_PUBLISH === "true";

const myListingSchema = propertyInputSchema
  .omit({ assignedEmployeeId: true, ad: true })
  .extend({
    dealType: z.enum(["rent", "sale"]),
    price: z.coerce.number().int().min(1).max(10_000_000_000_000),
  })
  // Every customer ad must be placed on the map.
  .refine((v) => v.latitude != null && v.longitude != null, {
    message: "Газрын зураг дээр байршлаа сонгоно уу.",
    path: ["latitude"],
  });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const items = await query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.address, p.district, a.deal_type, a.price, a.status, p.created_at,
            (l.property_id IS NOT NULL) AS has_location
       FROM properties p JOIN property_ads a ON a.property_id = p.id
       LEFT JOIN property_locations l ON l.property_id = p.id
      WHERE p.created_by = ? ORDER BY p.id DESC LIMIT 100`,
    [user.id],
  );
  return ok({ items: items.map((r) => ({ ...r, price: Number(r.price), has_location: !!r.has_location })) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const parsed = await parseBody(req, myListingSchema);
  if ("error" in parsed) return parsed.error;
  const d = parsed.data;

  const id = await withTx(async (conn) => {
    const [p] = await conn.execute<ResultSetHeader>(
      `INSERT INTO properties (name, property_type, address, district, floor, rooms, area_m2,
                               description, created_by)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [d.name, d.propertyType, d.address, d.district ?? null, d.floor ?? null, d.rooms ?? null,
       d.areaM2 ?? null, d.description ?? null, user.id],
    );
    await conn.execute("INSERT INTO property_locations (property_id, latitude, longitude) VALUES (?,?,?)",
      [p.insertId, d.latitude!, d.longitude!]);
    await conn.execute(
      `INSERT INTO property_ads (ad_number, property_id, deal_type, price, status, published_at, created_by)
       VALUES (?,?,?,?,?,?,?)`,
      [`AD${randomBytes(4).toString("hex").toUpperCase()}`, p.insertId, d.dealType, d.price,
       AUTO_PUBLISH ? "active" : "under_review", AUTO_PUBLISH ? new Date() : null, user.id],
    );
    return p.insertId;
  });

  await audit(user.id, "listing.submit", "property", id);
  return ok({ id, status: AUTO_PUBLISH ? "active" : "under_review" }, 201);
}
