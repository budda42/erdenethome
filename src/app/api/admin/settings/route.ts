import { z } from "zod";
import { exec, query } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user, "settings.manage")) return fail("Эрх хүрэхгүй.", 403);
  const rows = await query<RowDataPacket[]>("SELECT setting_key, setting_value FROM system_settings ORDER BY setting_key");
  return ok({ items: rows });
}

const schema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_.]{1,98}$/),
  value: z.string().max(20000),
});

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!can(user, "settings.manage")) return fail("Эрх хүрэхгүй.", 403);
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  await exec(
    `INSERT INTO system_settings (setting_key, setting_value, updated_by) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [body.data.key, body.data.value, user!.id],
  );
  await audit(user!.id, "settings.update", "setting", body.data.key);
  return ok();
}
