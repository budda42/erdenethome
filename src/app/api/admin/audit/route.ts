import { query } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { getCurrentUser, can } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user, "audit.read")) return fail("Эрх хүрэхгүй.", 403);
  const rows = await query<RowDataPacket[]>(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.meta, a.ip, a.created_at, u.full_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 300`);
  return ok({ items: rows });
}
