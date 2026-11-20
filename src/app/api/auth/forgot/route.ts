import { createHash, randomBytes } from "node:crypto";
import { one, exec } from "@/lib/db";
import { ok, parseBody } from "@/lib/http";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

const schema = z.object({ identifier: z.string().trim().min(3).max(190) });

// Always answers the same way so the endpoint cannot be used to discover accounts.
export async function POST(req: Request) {
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;

  const user = await one<RowDataPacket & { id: number }>(
    "SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1",
    [body.data.identifier, body.data.identifier],
  );
  if (user) {
    const token = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    await exec(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))",
      [user.id, hash],
    );
    // TODO: connect an email/SMS provider. Until then the token is only logged in development.
    if (process.env.NODE_ENV !== "production") console.log("[dev] password reset token:", token);
  }
  return ok({ message: "Хэрэв бүртгэлтэй бол нууц үг сэргээх заавар илгээгдэнэ." });
}
