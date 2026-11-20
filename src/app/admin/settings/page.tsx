import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { SettingsForm } from "@/components/SettingsForm";
import type { RowDataPacket } from "mysql2";

export default async function SettingsPage() {
  await requirePerm("settings.manage");
  const rows = await query<RowDataPacket[]>("SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'org.%'");
  const initial = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value ?? ""]));
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Системийн тохиргоо</h1>
      <SettingsForm initial={initial} />
    </div>
  );
}
