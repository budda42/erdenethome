import { query } from "@/lib/db";
import { ok } from "@/lib/http";
import type { RowDataPacket } from "mysql2";

// Public "about" texts are stored as system settings with keys starting with "org.".
export async function GET() {
  const rows = await query<RowDataPacket[]>(
    "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'org.%'");
  return ok(Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value])));
}
