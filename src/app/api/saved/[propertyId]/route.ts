import { exec } from "@/lib/db";
import { ok, fail, idParam } from "@/lib/http";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const id = idParam.safeParse((await params).propertyId);
  if (!id.success) return fail("Буруу ID.", 400);
  await exec("DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?", [user.id, id.data]);
  return ok();
}
