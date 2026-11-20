import Link from "next/link";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { RequestStatus } from "@/components/RequestStatus";
import type { RowDataPacket } from "mysql2";

export default async function RequestsPage() {
  const user = await requirePerm("requests.read");
  const canWrite = user.role === "super_admin" || user.permissions.includes("requests.write");
  const rows = await query<RowDataPacket[]>(
    `SELECT r.id, r.name, r.phone, r.message, r.status, r.created_at, p.id AS property_id, p.name AS property_name
       FROM property_requests r JOIN properties p ON p.id = r.property_id
      ORDER BY FIELD(r.status,'new','contacted','closed'), r.created_at DESC LIMIT 300`);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Ирсэн хүсэлтүүд</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft/50 text-left text-black/60">
            <tr><th className="p-3">Огноо</th><th className="p-3">Нэр</th><th className="p-3">Утас</th><th className="p-3">Байр</th><th className="p-3">Мессеж</th><th className="p-3">Төлөв</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-black/5 align-top">
                <td className="p-3 whitespace-nowrap text-black/60">{new Date(r.created_at).toLocaleString("mn-MN")}</td>
                <td className="p-3">{r.name}</td>
                <td className="p-3 font-mono">{r.phone}</td>
                <td className="p-3"><Link className="text-brand hover:underline" href={`/properties/${r.property_id}`}>{r.property_name}</Link></td>
                <td className="p-3 max-w-xs text-black/70">{r.message}</td>
                <td className="p-3">{canWrite ? <RequestStatus id={r.id} status={r.status} /> : r.status}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-black/50">Хүсэлт алга.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
