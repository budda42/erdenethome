import { destroySession, getCurrentUser, audit } from "@/lib/auth";
import { ok } from "@/lib/http";

export async function POST() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user.id, "user.logout", "user", user.id);
  return ok();
}
