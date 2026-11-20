import { query } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

/** Used until an admin sets "org.facebook" in /admin/settings. */
export const DEFAULT_FACEBOOK_URL = "https://www.facebook.com/otgon.bagana.2025";

/** Public organisation texts (system_settings keys starting with "org."), with safe defaults. */
export async function getOrgInfo(): Promise<Record<string, string>> {
  const rows = await query<RowDataPacket[]>(
    "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'org.%'");
  const info: Record<string, string> = Object.fromEntries(rows.map((r) => [r.setting_key, (r.setting_value as string) ?? ""]));
  info["org.facebook"] = safeUrl(info["org.facebook"]) ?? DEFAULT_FACEBOOK_URL;
  return info;
}

/** Only http(s) links are rendered, so a bad setting can't inject a javascript: URL. */
function safeUrl(v: string | undefined) {
  if (!v) return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
