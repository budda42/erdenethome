import Link from "next/link";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { fmtMnt } from "@/components/PropertyCard";
import type { RowDataPacket } from "mysql2";

const statusMn: Record<string, string> = {
  draft: "Ноорог", under_review: "Хянагдаж буй", active: "Идэвхтэй", reserved: "Захиалгатай", contracted: "Гэрээ хийгдсэн", closed: "Хаагдсан",
};

export default async function AdminProperties({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requirePerm("properties.read");
  const sp = await searchParams;
  const rows = await query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.address, p.district, p.rooms, a.ad_number, a.deal_type, a.price, a.status
       FROM properties p LEFT JOIN property_ads a ON a.property_id = p.id
      WHERE (? IS NULL OR a.status = ?) AND (? IS NULL OR p.name LIKE ? OR a.ad_number LIKE ?)
      ORDER BY p.id DESC LIMIT 300`,
    [sp.status || null, sp.status || null, sp.q || null, `%${sp.q ?? ""}%`, `%${sp.q ?? ""}%`]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Байрны зар</h1>
        <Link href="/admin/properties/new" className="btn-primary">+ Шинэ зар</Link>
      </div>
      <form className="card flex flex-wrap gap-3 p-4">
        <input name="q" defaultValue={sp.q} placeholder="Нэр, зарын дугаар" className="input max-w-xs" />
        <select name="status" defaultValue={sp.status ?? ""} className="input max-w-[200px]">
          <option value="">Бүх төлөв</option>
          {Object.entries(statusMn).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-ghost">Шүүх</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft/50 text-left text-black/60">
            <tr><th className="p-3">Зарын №</th><th className="p-3">Нэр</th><th className="p-3">Хаяг</th><th className="p-3">Төрөл</th><th className="p-3">Үнэ</th><th className="p-3">Төлөв</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-black/5 hover:bg-brand-soft/30">
                <td className="p-3 font-mono text-xs"><Link className="text-brand hover:underline" href={`/admin/properties/${r.id}`}>{r.ad_number ?? "—"}</Link></td>
                <td className="p-3">{r.name}</td>
                <td className="p-3 text-black/60">{r.address}</td>
                <td className="p-3">{r.deal_type === "rent" ? "Түрээс" : r.deal_type === "sale" ? "Худалдаа" : "—"}</td>
                <td className="p-3">{fmtMnt(r.price ? Number(r.price) : null)}</td>
                <td className="p-3">{statusMn[r.status] ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-black/50">Зар олдсонгүй.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
