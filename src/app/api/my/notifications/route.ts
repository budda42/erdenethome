import { exec, query } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const items = await query<RowDataPacket[]>(
    "SELECT id, title, body, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50",
    [user.id],
  );
  return ok({ items, unread: items.filter((n) => !n.is_read).length });
}

// Marks all of the user's notifications as read.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  await exec("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [user.id]);
  return ok();
}
