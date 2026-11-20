import { query, withTx } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import { propertyInputSchema, AD_STATUSES, toNum } from "@/lib/properties";
import { randomBytes } from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";

const listSchema = z.object({ status: z.enum(AD_STATUSES).optional(), q: z.string().max(120).optional() });

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!can(user, "properties.read")) return fail("Эрх хүрэхгүй.", 403);
  const parsed = listSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return fail("Шүүлтүүр буруу байна.", 422);

  const where: string[] = ["1=1"];
  const params: unknown[] = [];
  if (parsed.data.status) { where.push("a.status = ?"); params.push(parsed.data.status); }
  if (parsed.data.q) { where.push("(p.name LIKE ? OR a.ad_number LIKE ? OR p.address LIKE ?)"); params.push(`%${parsed.data.q}%`, `%${parsed.data.q}%`, `%${parsed.data.q}%`); }

  const rows = await query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.address, p.district, p.rooms, p.area_m2,
            a.ad_number, a.deal_type, a.price, a.status, a.updated_at
       FROM properties p LEFT JOIN property_ads a ON a.property_id = p.id
      WHERE ${where.join(" AND ")} ORDER BY p.id DESC LIMIT 200`,
    params,
  );
  return ok({ items: rows.map((r) => ({ ...r, area_m2: toNum(r.area_m2), price: toNum(r.price) })) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!can(user, "properties.write")) return fail("Эрх хүрэхгүй.", 403);
  const body = await parseBody(req, propertyInputSchema);
  if ("error" in body) return body.error;
  const d = body.data;

  const id = await withTx(async (conn) => {
    const [p] = await conn.execute<ResultSetHeader>(
      `INSERT INTO properties (name, property_type, address, district, building_no, entrance, floor, rooms, area_m2,
                               description, created_by, assigned_employee_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.name, d.propertyType, d.address, d.district ?? null, d.buildingNo ?? null, d.entrance ?? null,
       d.floor ?? null, d.rooms ?? null, d.areaM2 ?? null, d.description ?? null, user!.id, d.assignedEmployeeId ?? null],
    );
    if (d.latitude != null && d.longitude != null) {
      await conn.execute("INSERT INTO property_locations (property_id, latitude, longitude) VALUES (?,?,?)", [p.insertId, d.latitude, d.longitude]);
    }
    await conn.execute(
      `INSERT INTO property_ads (ad_number, property_id, deal_type, price, service_fee, status, published_at, created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [`AD${randomBytes(4).toString("hex").toUpperCase()}`, p.insertId, d.ad.dealType, d.ad.price, d.ad.serviceFee ?? null,
       d.ad.status, d.ad.status === "active" ? new Date() : null, user!.id],
    );
    return p.insertId;
  });

  await audit(user!.id, "property.create", "property", id);
  return ok({ id }, 201);
}
