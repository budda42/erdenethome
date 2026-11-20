import { after } from "next/server";
import { exec, query, one } from "@/lib/db";
import { forwardCustomerMessage } from "@/lib/forward";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";
import { startChatSchema } from "@/lib/chat";
import type { RowDataPacket } from "mysql2";

// GET /api/chats            → the signed-in customer's threads
// GET /api/chats?propertyId → their thread for one property (or null)
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);

  const propertyParam = new URL(req.url).searchParams.get("propertyId");
  if (propertyParam !== null) {
    const pid = idParam.safeParse(propertyParam);
    if (!pid.success) return fail("Буруу ID.", 400);
    const chat = await one<RowDataPacket>(
      "SELECT id FROM property_chats WHERE user_id = ? AND property_id = ?",
      [user.id, pid.data],
    );
    return ok({ chat: chat ? { id: chat.id } : null });
  }

  const items = await query<RowDataPacket[]>(
    `SELECT c.id, c.updated_at, p.name AS property_name,
            (SELECT m.kind FROM chat_messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_kind,
            (SELECT m.body FROM chat_messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_body
       FROM property_chats c JOIN properties p ON p.id = c.property_id
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC`,
    [user.id],
  );
  return ok({ items });
}

// POST /api/chats → start (or continue) the thread for a property with a first message
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const parsed = await parseBody(req, startChatSchema);
  if ("error" in parsed) return parsed.error;
  const { propertyId, body } = parsed.data;

  if (!(await one<RowDataPacket>("SELECT id FROM properties WHERE id = ?", [propertyId]))) {
    return fail("Байр олдсонгүй.", 404);
  }

  // One thread per (customer, property): reuse the existing id on duplicate.
  const res = await exec(
    `INSERT INTO property_chats (user_id, property_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [user.id, propertyId],
  );
  const chatId = res.insertId;

  await exec(
    "INSERT INTO chat_messages (chat_id, sender, sender_user_id, kind, body) VALUES (?, 'customer', ?, 'text', ?)",
    [chatId, user.id, body],
  );
  await exec("UPDATE property_chats SET updated_at = NOW() WHERE id = ?", [chatId]);
  after(() => forwardCustomerMessage(chatId, body));
  return ok({ chatId }, 201);
}
