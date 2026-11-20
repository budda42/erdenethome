import Link from "next/link";
import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { fmtMnt } from "@/components/PropertyCard";
import type { RowDataPacket } from "mysql2";

const statusMn: Record<string, string> = {
  drafting: "Боловсруулж буй", reviewing: "Хянагдаж буй", approved: "Баталгаажсан", valid: "Хүчинтэй", finished: "Дууссан", cancelled: "Цуцлагдсан",
};

export default async function ContractsPage() {
  const user = await requirePerm("contracts.read");
  const canWrite = user.role === "super_admin" || user.permissions.includes("contracts.write");
  const rows = await query<RowDataPacket[]>(
    `SELECT c.id, c.contract_number, c.contract_type, c.status, c.amount, c.start_date, c.end_date,
            p.name AS property_name, e.full_name AS employee_name
       FROM contracts c JOIN properties p ON p.id = c.property_id
       LEFT JOIN employees e ON e.id = c.responsible_employee_id ORDER BY c.id DESC LIMIT 300`);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Гэрээний бүртгэл</h1>
        {canWrite && <Link href="/admin/contracts/new" className="btn-primary">+ Шинэ гэрээ</Link>}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft/50 text-left text-black/60">
            <tr><th className="p-3">Дугаар</th><th className="p-3">Байр</th><th className="p-3">Төрөл</th><th className="p-3">Дүн</th><th className="p-3">Хугацаа дуусах</th><th className="p-3">Хариуцсан</th><th className="p-3">Төлөв</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-black/5">
                <td className="p-3 font-mono"><Link className="text-brand hover:underline" href={`/admin/contracts/${c.id}`}>{c.contract_number}</Link></td>
                <td className="p-3">{c.property_name}</td>
                <td className="p-3">{c.contract_type === "rent" ? "Түрээс" : "Худалдаа"}</td>
                <td className="p-3">{fmtMnt(Number(c.amount))}</td>
                <td className="p-3">{c.end_date ? new Date(c.end_date).toLocaleDateString("mn-MN") : "—"}</td>
                <td className="p-3">{c.employee_name ?? "—"}</td>
                <td className="p-3">{statusMn[c.status]}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-black/50">Гэрээ алга.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
