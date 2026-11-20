import { query } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { getCurrentUser, can } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user, "requests.read")) return fail("Эрх хүрэхгүй.", 403);
  const rows = await query<RowDataPacket[]>(
    `SELECT r.id, r.name, r.phone, r.message, r.status, r.created_at,
            p.id AS property_id, p.name AS property_name
       FROM property_requests r JOIN properties p ON p.id = r.property_id
      ORDER BY FIELD(r.status,'new','contacted','closed'), r.created_at DESC LIMIT 300`);
  return ok({ items: rows });
}
