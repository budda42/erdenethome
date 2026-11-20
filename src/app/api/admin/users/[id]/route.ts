import { z } from "zod";
import { exec, one } from "@/lib/db";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser, can, audit, type Role } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

const ROLES: Role[] = ["super_admin", "admin", "manager", "employee", "customer"];
const schema = z.object({
  role: z.enum(ROLES as [Role, ...Role[]]).optional(),
  status: z.enum(["active", "blocked"]).optional(),
});

// Only super_admin may grant or revoke the super_admin role. Users cannot change their own role.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!can(actor, "users.manage")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  if (id.data === actor!.id) return fail("Өөрийн эрхээ өөрөө өөрчлөх боломжгүй.", 409);

  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const target = await one<RowDataPacket & { code: Role }>(
    "SELECT r.code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?", [id.data]);
  if (!target) return fail("Олдсонгүй.", 404);

  if ((body.data.role === "super_admin" || target.code === "super_admin") && actor!.role !== "super_admin") {
    return fail("Super Admin эрхийг зөвхөн Super Admin өөрчилнө.", 403);
  }
  if (body.data.role) {
    await exec("UPDATE users SET role_id = (SELECT id FROM roles WHERE code = ?) WHERE id = ?", [body.data.role, id.data]);
  }
  if (body.data.status) {
    // Blocking or changing a role invalidates existing sessions via token_version.
    await exec("UPDATE users SET status = ?, token_version = token_version + 1 WHERE id = ?", [body.data.status, id.data]);
  }
  await audit(actor!.id, "user.update", "user", id.data, body.data);
  return ok();
}
