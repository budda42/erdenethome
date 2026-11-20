import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import type { RowDataPacket } from "mysql2";

export default async function AuditPage() {
  await requirePerm("audit.read");
  const rows = await query<RowDataPacket[]>(
    `SELECT a.action, a.entity, a.entity_id, a.meta, a.ip, a.created_at, u.full_name
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 300`);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Үйлдлийн түүх</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-brand-soft/50 text-left text-black/60">
            <tr><th className="p-3">Огноо</th><th className="p-3">Хэрэглэгч</th><th className="p-3">Үйлдэл</th><th className="p-3">Объект</th><th className="p-3">Дэлгэрэнгүй</th><th className="p-3">IP</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/5">
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString("mn-MN")}</td>
                <td className="p-3">{r.full_name ?? "Зочин"}</td>
                <td className="p-3 font-mono">{r.action}</td>
                <td className="p-3">{r.entity} #{r.entity_id}</td>
                <td className="p-3 text-black/60">{r.meta ? JSON.stringify(typeof r.meta === "string" ? JSON.parse(r.meta) : r.meta) : ""}</td>
                <td className="p-3 text-black/50">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
