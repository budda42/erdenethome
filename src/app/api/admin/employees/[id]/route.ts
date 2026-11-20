import { z } from "zod";
import { exec } from "@/lib/db";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import { phoneSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  departmentId: z.coerce.number().int().positive().nullable().optional(),
  position: z.string().trim().max(120).nullable().optional(),
  phone: phoneSchema.nullable().optional(),
  email: z.email().max(190).nullable().optional(),
  duties: z.string().max(5000).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export async function PUT(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "org.manage")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const d = body.data;
  await exec(
    "UPDATE employees SET full_name=?, department_id=?, position=?, phone=?, email=?, duties=?, status=? WHERE id=?",
    [d.fullName, d.departmentId ?? null, d.position ?? null, d.phone ?? null, d.email ?? null, d.duties ?? null, d.status, id.data],
  );
  await audit(user!.id, "employee.update", "employee", id.data);
  return ok();
}
