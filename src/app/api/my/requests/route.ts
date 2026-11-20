import { query } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const rows = await query<RowDataPacket[]>(
    `SELECT r.id, r.status, r.created_at, p.name AS property_name
       FROM property_requests r JOIN properties p ON p.id = r.property_id
      WHERE r.user_id = ? ORDER BY r.created_at DESC`, [user.id]);
  return ok({ items: rows });
}
