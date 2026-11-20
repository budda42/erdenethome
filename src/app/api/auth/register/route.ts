import { pool, one } from "@/lib/db";
import { hashPassword, createSession, audit } from "@/lib/auth";
import { ok, fail, parseBody } from "@/lib/http";
import { registerSchema } from "@/lib/validators";
import type { ResultSetHeader } from "mysql2";

export async function POST(req: Request) {
  const body = await parseBody(req, registerSchema);
  if ("error" in body) return body.error;
  const { fullName, email, phone, password } = body.data;

  const dup = await one<{ id: number }>(
    "SELECT id FROM users WHERE (? IS NOT NULL AND email = ?) OR (? IS NOT NULL AND phone = ?) LIMIT 1",
    [email ?? null, email ?? null, phone ?? null, phone ?? null],
  );
  if (dup) return fail("Энэ и-мэйл эсвэл утас аль хэдийн бүртгэлтэй байна.", 409);

  const hash = await hashPassword(password);
  const [res] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users (email, phone, password_hash, full_name, role_id)
     VALUES (?, ?, ?, ?, (SELECT id FROM roles WHERE code = 'customer'))`,
    [email ?? null, phone ?? null, hash, fullName],
  );
  await createSession(res.insertId, 0);
  await audit(res.insertId, "user.register", "user", res.insertId);
  return ok({ id: res.insertId }, 201);
}
