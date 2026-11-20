import { z } from "zod";
import { one } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, "Мессеж хоосон байна.")
  .max(2000, "Мессеж 2000 тэмдэгтээс хэтрэхгүй байна.");

export const startChatSchema = z.object({
  propertyId: z.coerce.number().int().positive(),
  body: messageBodySchema,
});

export const messageSchema = z.object({ body: messageBodySchema });
export const sendContractSchema = z.object({ contractId: z.coerce.number().int().positive() });
export const respondSchema = z.object({ accept: z.boolean() });

// Only contracts that are approved (or already valid) can be sent to a customer.
export const SENDABLE_CONTRACT_STATUSES = ["approved", "valid"];

export type ChatRow = RowDataPacket & { id: number; user_id: number; property_id: number };

export function loadChat(id: number) {
  return one<ChatRow>("SELECT id, user_id, property_id FROM property_chats WHERE id = ?", [id]);
}
