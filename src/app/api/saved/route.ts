import { query, exec } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

// Saved properties belong to the account, so the list follows the user across devices.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const rows = await query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.district, a.price, a.deal_type, a.status
       FROM saved_properties s JOIN properties p ON p.id = s.property_id
       LEFT JOIN property_ads a ON a.property_id = p.id
      WHERE s.user_id = ? ORDER BY s.created_at DESC`,
    [user.id],
  );
  return ok({ items: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const body = await parseBody(req, z.object({ propertyId: z.coerce.number().int().positive() }));
  if ("error" in body) return body.error;
  await exec("INSERT IGNORE INTO saved_properties (user_id, property_id) VALUES (?, ?)", [user.id, body.data.propertyId]);
  return ok({ saved: true }, 201);
}
