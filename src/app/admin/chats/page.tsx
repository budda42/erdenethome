import Link from "next/link";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import type { RowDataPacket } from "mysql2";

export default async function AdminChatsPage() {
  await requirePerm("requests.read");
  const rows = await query<RowDataPacket[]>(
    `SELECT c.id, c.updated_at, p.name AS property_name, u.full_name, u.phone,
            (SELECT m.kind FROM chat_messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_kind,
            (SELECT m.body FROM chat_messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_body
       FROM property_chats c
       JOIN properties p ON p.id = c.property_id
       JOIN users u ON u.id = c.user_id
      ORDER BY c.updated_at DESC LIMIT 300`);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Чат</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft/50 text-left text-black/60">
            <tr><th className="p-3">Сүүлд</th><th className="p-3">Хэрэглэгч</th><th className="p-3">Утас</th><th className="p-3">Байр</th><th className="p-3">Сүүлийн мессеж</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-black/5 align-top">
                <td className="p-3 whitespace-nowrap text-black/60">{new Date(r.updated_at).toLocaleString("mn-MN")}</td>
                <td className="p-3"><Link className="text-brand hover:underline" href={`/admin/chats/${r.id}`}>{r.full_name}</Link></td>
                <td className="p-3 font-mono">{r.phone ?? "—"}</td>
                <td className="p-3">{r.property_name}</td>
                <td className="p-3 max-w-xs truncate text-black/70">{r.last_kind === "contract" ? "📄 Гэрээ илгээсэн" : r.last_body}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-black/50">Чат алга.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
