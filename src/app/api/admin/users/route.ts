import { query } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { getCurrentUser, can } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user, "users.manage")) return fail("Эрх хүрэхгүй.", 403);
  const rows = await query<RowDataPacket[]>(
    `SELECT u.id, u.full_name, u.email, u.phone, u.status, u.last_login_at, u.created_at, r.code AS role
       FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id DESC LIMIT 500`);
  return ok({ items: rows });
}
