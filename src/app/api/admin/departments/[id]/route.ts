import { z } from "zod";
import { exec } from "@/lib/db";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "org.manage")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  if (body.data.parentId === id.data) return fail("Алба өөрийгөө эцэг болгож болохгүй.", 422);
  const d = body.data;
  await exec("UPDATE departments SET name=?, parent_id=?, description=?, sort_order=? WHERE id=?",
    [d.name, d.parentId ?? null, d.description ?? null, d.sortOrder, id.data]);
  await audit(user!.id, "department.update", "department", id.data);
  return ok();
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "org.manage")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  await exec("DELETE FROM departments WHERE id = ?", [id.data]);
  await audit(user!.id, "department.delete", "department", id.data);
  return ok();
}
