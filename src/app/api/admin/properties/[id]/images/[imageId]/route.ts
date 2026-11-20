import { exec, one } from "@/lib/db";
import { ok, fail, idParam } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "properties.write")) return fail("Эрх хүрэхгүй.", 403);
  const p = await params;
  const id = idParam.safeParse(p.id);
  const imageId = idParam.safeParse(p.imageId);
  if (!id.success || !imageId.success) return fail("Буруу ID.", 400);

  const img = await one<RowDataPacket>(
    "SELECT id FROM property_images WHERE id = ? AND property_id = ?", [imageId.data, id.data]);
  if (!img) return fail("Олдсонгүй.", 404);
  await exec("DELETE FROM property_images WHERE id = ?", [imageId.data]);
  await audit(user!.id, "property.media_delete", "property", id.data, { imageId: imageId.data });
  return ok();
}
