import { one } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// Sends a copy of a customer's chat message to an outbound webhook (e.g. Make/Zapier,
// which can post it to a Facebook Page or Messenger). Off unless CHAT_FORWARD_WEBHOOK_URL
// is set. Never throws: a failed forward must not break the customer's message.
export async function forwardCustomerMessage(chatId: number, body: string) {
  const url = process.env.CHAT_FORWARD_WEBHOOK_URL;
  if (!url) return;

  try {
    const row = await one<RowDataPacket>(
      `SELECT c.id, p.name AS property_name, u.full_name
         FROM property_chats c
         JOIN properties p ON p.id = c.property_id
         JOIN users u ON u.id = c.user_id
        WHERE c.id = ?`,
      [chatId],
    );
    if (!row) return;

    const payload = {
      source: "erdenet-home",
      event: "chat.customer_message",
      chatId: row.id,
      property: row.property_name,
      // Phone numbers are deliberately not forwarded; staff see them in /admin/chats.
      customer: { name: row.full_name },
      message: body,
      sentAt: new Date().toISOString(),
    };

    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error("chat forward failed", err);
  }
}
