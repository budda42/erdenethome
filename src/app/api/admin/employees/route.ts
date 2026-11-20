import { z } from "zod";
import { exec, query } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import { phoneSchema } from "@/lib/validators";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  departmentId: z.coerce.number().int().positive().nullable().optional(),
  position: z.string().trim().max(120).nullable().optional(),
  phone: phoneSchema.nullable().optional(),
  email: z.email().max(190).nullable().optional(),
  duties: z.string().max(5000).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user, "org.manage")) return fail("Эрх хүрэхгүй.", 403);
  const rows = await query<RowDataPacket[]>(
    `SELECT e.*, d.name AS department_name FROM employees e
       LEFT JOIN departments d ON d.id = e.department_id ORDER BY e.id DESC`);
  return ok({ items: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!can(user, "org.manage")) return fail("Эрх хүрэхгүй.", 403);
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const d = body.data;
  const res = await exec(
    `INSERT INTO employees (full_name, department_id, position, phone, email, duties, status) VALUES (?,?,?,?,?,?,?)`,
    [d.fullName, d.departmentId ?? null, d.position ?? null, d.phone ?? null, d.email ?? null, d.duties ?? null, d.status],
  ) as ResultSetHeader;
  await audit(user!.id, "employee.create", "employee", res.insertId);
  return ok({ id: res.insertId }, 201);
}
