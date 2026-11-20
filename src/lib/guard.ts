import { redirect } from "next/navigation";
import { getCurrentUser, can, type CurrentUser } from "@/lib/auth";

/** Page-level guard: redirects to login, or shows a 403 page when permission is missing. */
export async function requirePerm(perm: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/admin`);
  if (!can(user, perm)) redirect("/admin?denied=1");
  return user;
}

export const STAFF_PERMS = ["properties.read", "requests.read", "contracts.read", "org.manage", "users.manage", "settings.manage", "audit.read", "reports.read"];
