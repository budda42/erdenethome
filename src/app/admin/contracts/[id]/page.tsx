import { notFound } from "next/navigation";
import { one, query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { can } from "@/lib/auth";
import { ContractForm } from "@/components/ContractForm";
import type { RowDataPacket } from "mysql2";

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePerm("contracts.read");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const c = await one<RowDataPacket>("SELECT * FROM contracts WHERE id = ?", [id]);
  if (!c) notFound();
  const properties = await query<RowDataPacket[]>("SELECT id, name FROM properties ORDER BY name");
  const employees = await query<RowDataPacket[]>("SELECT id, full_name FROM employees WHERE status='active' ORDER BY full_name");
  const files = await query<RowDataPacket[]>("SELECT id, file_url, original_name FROM contract_files WHERE contract_id = ? ORDER BY uploaded_at DESC", [id]);
  const history = await query<RowDataPacket[]>(
    `SELECT a.action, a.meta, a.created_at, u.full_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.entity = 'contract' AND a.entity_id = ? ORDER BY a.created_at DESC LIMIT 50`, [String(id)]);
  const fmt = (d: unknown) => (d ? new Date(d as string).toISOString().slice(0, 10) : "");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Гэрээ {c.contract_number}</h1>
      <ContractForm
        id={id}
        canWrite={can(user, "contracts.write")}
        canApprove={can(user, "contracts.approve")}
        files={files as never}
        properties={properties as never}
        employees={employees as never}
        init={{
          contractNumber: c.contract_number, contractType: c.contract_type, propertyId: c.property_id, sellerParty: c.seller_party,
          buyerParty: c.buyer_party, signedDate: fmt(c.signed_date), startDate: fmt(c.start_date), endDate: fmt(c.end_date),
          amount: Number(c.amount), paymentTerms: c.payment_terms ?? "", responsibleEmployeeId: c.responsible_employee_id, status: c.status,
        }}
      />
      <div className="card p-6">
        <h2 className="mb-3 font-semibold">Түүх</h2>
        <ul className="space-y-2 text-sm">
          {history.map((h, i) => (
            <li key={i} className="flex justify-between gap-4 border-b border-black/5 pb-2">
              <span>{h.action} {h.meta ? <span className="text-black/50">{JSON.stringify(h.meta)}</span> : null}</span>
              <span className="whitespace-nowrap text-black/50">{h.full_name ?? "—"} · {new Date(h.created_at).toLocaleString("mn-MN")}</span>
            </li>
          ))}
          {history.length === 0 && <li className="text-black/50">Түүх байхгүй.</li>}
        </ul>
      </div>
    </div>
  );
}
