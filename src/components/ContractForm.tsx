"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TRANSITIONS, type ContractStatus } from "@/lib/contracts";

const labels: Record<string, string> = {
  drafting: "Боловсруулж буй", reviewing: "Хянагдаж буй", approved: "Баталгаажсан", valid: "Хүчинтэй", finished: "Дууссан", cancelled: "Цуцлагдсан",
};

type Init = {
  contractNumber: string; contractType: "rent" | "sale"; propertyId: number | null; sellerParty: string; buyerParty: string;
  signedDate: string; startDate: string; endDate: string; amount: number | null; paymentTerms: string;
  responsibleEmployeeId: number | null; status: ContractStatus;
};
type Props = {
  id?: number; init: Init; properties: { id: number; name: string }[]; employees: { id: number; full_name: string }[];
  canWrite: boolean; canApprove: boolean; files: { id: number; file_url: string; original_name: string }[];
};

export function ContractForm({ id, init, properties, employees, canWrite, canApprove, files }: Props) {
  const router = useRouter();
  const [v, setV] = useState<Init>(init);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Init>(k: K, val: Init[K]) => setV((p) => ({ ...p, [k]: val }));

  const nextOptions = id ? TRANSITIONS[init.status].filter((s) => s !== "approved" || canApprove) : [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body = {
      contractNumber: v.contractNumber, contractType: v.contractType, propertyId: v.propertyId,
      sellerParty: v.sellerParty, buyerParty: v.buyerParty,
      signedDate: v.signedDate || null, startDate: v.startDate || null, endDate: v.endDate || null,
      amount: v.amount ?? 0, paymentTerms: v.paymentTerms || null, responsibleEmployeeId: v.responsibleEmployeeId ?? null,
      ...(id ? { status: v.status } : {}),
    };
    const res = await fetch(id ? `/api/admin/contracts/${id}` : "/api/admin/contracts", {
      method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json.error ?? "Алдаа." });
    if (!id) return router.push(`/admin/contracts/${json.data.id}`);
    setMsg({ ok: true, text: "Хадгалагдлаа." });
    router.refresh();
  }

  async function changeStatus(to: ContractStatus) {
    if (!id) return;
    setBusy(true);
    const res = await fetch(`/api/admin/contracts/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractNumber: init.contractNumber, contractType: init.contractType, propertyId: init.propertyId,
        sellerParty: init.sellerParty, buyerParty: init.buyerParty, signedDate: init.signedDate || null,
        startDate: init.startDate || null, endDate: init.endDate || null, amount: init.amount ?? 0,
        paymentTerms: init.paymentTerms || null, responsibleEmployeeId: init.responsibleEmployeeId, status: to,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json.error });
    router.refresh();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!id || !file) return;
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    const res = await fetch(`/api/admin/contracts/${id}/files`, { method: "POST", body: fd });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json.error });
    window.location.reload();
  }

  const field = (label: string, node: React.ReactNode) => <div><label className="label">{label}</label>{node}</div>;
  const disabled = !canWrite;

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card grid gap-4 p-6 md:grid-cols-2">
        {field("Гэрээний дугаар *", <input required disabled={disabled} className="input" value={v.contractNumber} onChange={(e) => set("contractNumber", e.target.value)} />)}
        {field("Төрөл", <select disabled={disabled} className="input" value={v.contractType} onChange={(e) => set("contractType", e.target.value as "rent" | "sale")}><option value="rent">Түрээс</option><option value="sale">Худалдаа</option></select>)}
        {field("Байр *", <select required disabled={disabled} className="input" value={v.propertyId ?? ""} onChange={(e) => set("propertyId", Number(e.target.value) || null)}><option value="">—</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>)}
        {field("Хариуцсан ажилтан", <select disabled={disabled} className="input" value={v.responsibleEmployeeId ?? ""} onChange={(e) => set("responsibleEmployeeId", Number(e.target.value) || null)}><option value="">—</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select>)}
        {field("Түрээслүүлэгч / Худалдагч *", <input required disabled={disabled} className="input" value={v.sellerParty} onChange={(e) => set("sellerParty", e.target.value)} />)}
        {field("Түрээслэгч / Худалдан авагч *", <input required disabled={disabled} className="input" value={v.buyerParty} onChange={(e) => set("buyerParty", e.target.value)} />)}
        {field("Гэрээ байгуулсан огноо", <input type="date" disabled={disabled} className="input" value={v.signedDate} onChange={(e) => set("signedDate", e.target.value)} />)}
        {field("Гэрээний дүн (₮)", <input type="number" min={0} disabled={disabled} className="input" value={v.amount ?? ""} onChange={(e) => set("amount", e.target.value === "" ? null : Number(e.target.value))} />)}
        {field("Эхлэх огноо", <input type="date" disabled={disabled} className="input" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />)}
        {field("Дуусах огноо", <input type="date" disabled={disabled} className="input" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} />)}
        <div className="md:col-span-2">{field("Төлбөрийн нөхцөл", <textarea rows={3} disabled={disabled} className="input" value={v.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} />)}</div>
        {canWrite && (
          <div className="md:col-span-2 flex items-center gap-3">
            <button className="btn-primary" disabled={busy}>{busy ? "Түр хүлээнэ үү…" : "Хадгалах"}</button>
            {msg && <span className={`text-sm ${msg.ok ? "text-brand" : "text-red-600"}`}>{msg.text}</span>}
          </div>
        )}
      </form>

      {id && (
        <div className="card space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-black/60">Одоогийн төлөв:</span>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand">{labels[init.status]}</span>
            {canWrite && nextOptions.map((s) => (
              <button key={s} disabled={busy} onClick={() => changeStatus(s)} className="btn-ghost text-sm">→ {labels[s]}</button>
            ))}
          </div>
          {!canApprove && init.status === "reviewing" && <p className="text-xs text-black/50">Баталгаажуулах эрх зөвхөн эрх бүхий ажилтанд байна.</p>}
        </div>
      )}

      {id && (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Гэрээний файл (PDF)</h2>
          {canWrite && <input type="file" accept="application/pdf" disabled={busy} onChange={upload} className="text-sm" />}
          {files.length === 0 ? <p className="text-sm text-black/60">Файл байхгүй.</p> : (
            <ul className="divide-y divide-black/5 text-sm">
              {files.map((f) => (
                <li key={f.id} className="flex justify-between py-2">
                  <span>{f.original_name}</span>
                  <a className="text-brand hover:underline" href={f.file_url} target="_blank" rel="noopener noreferrer">Татах</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
