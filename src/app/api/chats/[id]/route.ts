import { after } from "next/server";
import { exec, query } from "@/lib/db";
import { forwardCustomerMessage } from "@/lib/forward";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser, can } from "@/lib/auth";
import { loadChat, messageSchema } from "@/lib/chat";
import type { RowDataPacket } from "mysql2";

type Ctx = { params: Promise<{ id: string }> };

// Customers read their own thread; staff with requests.read can read any thread.
export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);

  const chat = await loadChat(id.data);
  if (!chat) return fail("Чат олдсонгүй.", 404);
  const isOwner = chat.user_id === user.id;
  const isStaff = can(user, "requests.read");
  if (!isOwner && !isStaff) return fail("Эрх хүрэхгүй.", 403);

  const items = await query<RowDataPacket[]>(
    `SELECT m.id, m.sender, m.kind, m.body, m.created_at, m.contract_id,
            c.contract_number, c.contract_type, c.amount, c.start_date, c.end_date, c.status AS contract_status,
            cp.status AS party_status
       FROM chat_messages m
       LEFT JOIN contracts c ON c.id = m.contract_id
       LEFT JOIN contract_parties cp ON cp.contract_id = m.contract_id AND cp.user_id = ?
      WHERE m.chat_id = ?
      ORDER BY m.id ASC LIMIT 500`,
    [chat.user_id, id.data],
  );

  // Staff can attach an approved contract for this property to the chat.
  const sendableContracts =
    isStaff && can(user, "contracts.read")
      ? await query<RowDataPacket[]>(
          `SELECT id, contract_number, contract_type, amount, status FROM contracts
            WHERE property_id = ? AND status IN ('approved','valid') ORDER BY id DESC LIMIT 50`,
          [chat.property_id],
        )
      : [];

  return ok({
    viewer: isOwner ? "customer" : "staff",
    canReply: isOwner || can(user, "requests.write"),
    items,
    sendableContracts,
  });
}

// Customer → text message. Staff with requests.write → reply as staff.
export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);

  const chat = await loadChat(id.data);
  if (!chat) return fail("Чат олдсонгүй.", 404);

  const parsed = await parseBody(req, messageSchema);
  if ("error" in parsed) return parsed.error;

  let sender: "customer" | "staff";
  if (chat.user_id === user.id) sender = "customer";
  else if (can(user, "requests.write")) sender = "staff";
  else return fail("Эрх хүрэхгүй.", 403);

  await exec(
    "INSERT INTO chat_messages (chat_id, sender, sender_user_id, kind, body) VALUES (?, ?, ?, 'text', ?)",
    [chat.id, sender, user.id, parsed.data.body],
  );
  await exec("UPDATE property_chats SET updated_at = NOW() WHERE id = ?", [chat.id]);
  // Only customer messages are forwarded; staff replies stay in the app.
  if (sender === "customer") after(() => forwardCustomerMessage(chat.id, parsed.data.body));
  return ok({}, 201);
}
