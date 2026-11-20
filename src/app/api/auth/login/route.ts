import { one, exec } from "@/lib/db";
import { createSession, verifyPassword, audit } from "@/lib/auth";
import { ok, fail, parseBody } from "@/lib/http";
import { loginSchema } from "@/lib/validators";
import type { RowDataPacket } from "mysql2";

type Row = RowDataPacket & { id: number; password_hash: string; status: string; token_version: number };

export async function POST(req: Request) {
  const body = await parseBody(req, loginSchema);
  if ("error" in body) return body.error;
  const { identifier, password } = body.data;

  const user = await one<Row>(
    "SELECT id, password_hash, status, token_version FROM users WHERE email = ? OR phone = ? LIMIT 1",
    [identifier, identifier],
  );
  // Same message for unknown user / wrong password to avoid account enumeration.
  const valid = user ? await verifyPassword(password, user.password_hash) : false;
  if (!user || !valid) {
    await audit(null, "user.login_failed", "user", null, { identifier });
    return fail("Нэвтрэх мэдээлэл буруу байна.", 401);
  }
  if (user.status !== "active") return fail("Таны эрх хаагдсан байна.", 403);

  await exec("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
  await createSession(user.id, user.token_version);
  await audit(user.id, "user.login", "user", user.id);
  return ok({ id: user.id });
}
