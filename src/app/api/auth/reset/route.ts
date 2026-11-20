import { createHash } from "node:crypto";
import { z } from "zod";
import { one, pool } from "@/lib/db";
import { hashPassword, audit } from "@/lib/auth";
import { ok, fail, parseBody } from "@/lib/http";
import { passwordSchema } from "@/lib/validators";
import type { RowDataPacket } from "mysql2";

const schema = z.object({ token: z.string().length(64), password: passwordSchema });

export async function POST(req: Request) {
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const hash = createHash("sha256").update(body.data.token).digest("hex");

  const row = await one<RowDataPacket & { id: number; user_id: number }>(
    "SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
    [hash],
  );
  if (!row) return fail("Токен буруу эсвэл хугацаа дууссан байна.", 400);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?", [
      await hashPassword(body.data.password),
      row.user_id,
    ]);
    await conn.execute("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [row.id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  await audit(row.user_id, "user.password_reset", "user", row.user_id);
  return ok({ message: "Нууц үг шинэчлэгдлээ." });
}
