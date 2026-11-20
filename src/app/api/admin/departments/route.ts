import { z } from "zod";
import { exec } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import type { ResultSetHeader } from "mysql2";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!can(user, "org.manage")) return fail("Эрх хүрэхгүй.", 403);
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const d = body.data;
  const res = await exec(
    "INSERT INTO departments (name, parent_id, description, sort_order) VALUES (?,?,?,?)",
    [d.name, d.parentId ?? null, d.description ?? null, d.sortOrder]) as ResultSetHeader;
  await audit(user!.id, "department.create", "department", res.insertId);
  return ok({ id: res.insertId }, 201);
}
