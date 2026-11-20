import { exec, one } from "@/lib/db";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import { loadChat, sendContractSchema, SENDABLE_CONTRACT_STATUSES } from "@/lib/chat";
import type { RowDataPacket } from "mysql2";

type Ctx = { params: Promise<{ id: string }> };

// Staff sends an approved contract into a chat; the customer then accepts or declines it.
export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "requests.write") || !can(user, "contracts.read")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);

  const chat = await loadChat(id.data);
  if (!chat) return fail("Чат олдсонгүй.", 404);

  const parsed = await parseBody(req, sendContractSchema);
  if ("error" in parsed) return parsed.error;

  const contract = await one<RowDataPacket>(
    "SELECT id, status, property_id FROM contracts WHERE id = ?",
    [parsed.data.contractId],
  );
  if (!contract || contract.property_id !== chat.property_id) {
    return fail("Энэ байрны гэрээ олдсонгүй.", 404);
  }
  if (!SENDABLE_CONTRACT_STATUSES.includes(contract.status)) {
    return fail("Зөвхөн баталгаажсан гэрээг илгээх боломжтой.", 400);
  }

  await exec(
    `INSERT INTO contract_parties (contract_id, user_id, status) VALUES (?, ?, 'pending')
     ON DUPLICATE KEY UPDATE status = 'pending', responded_at = NULL, sent_at = NOW()`,
    [contract.id, chat.user_id],
  );
  await exec(
    "INSERT INTO chat_messages (chat_id, sender, sender_user_id, kind, contract_id) VALUES (?, 'staff', ?, 'contract', ?)",
    [chat.id, user!.id, contract.id],
  );
  await exec("UPDATE property_chats SET updated_at = NOW() WHERE id = ?", [chat.id]);
  await audit(user!.id, "contract.send", "contract", contract.id, { chatId: chat.id });
  return ok({}, 201);
}
