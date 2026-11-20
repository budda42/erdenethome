import { exec, one } from "@/lib/db";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser, audit } from "@/lib/auth";
import { respondSchema } from "@/lib/chat";
import type { RowDataPacket } from "mysql2";

type Ctx = { params: Promise<{ id: string }> };

// Customer accepts ("гэрээлэх") or declines a contract that was sent to them.
export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);

  const parsed = await parseBody(req, respondSchema);
  if ("error" in parsed) return parsed.error;

  const party = await one<RowDataPacket>(
    "SELECT status FROM contract_parties WHERE contract_id = ? AND user_id = ?",
    [id.data, user.id],
  );
  if (!party) return fail("Энэ гэрээ танд илгээгдээгүй байна.", 404);

  const status = parsed.data.accept ? "accepted" : "declined";
  await exec(
    "UPDATE contract_parties SET status = ?, responded_at = NOW() WHERE contract_id = ? AND user_id = ?",
    [status, id.data, user.id],
  );
  await audit(user.id, `contract.${status}`, "contract", id.data);
  return ok({ status });
}
