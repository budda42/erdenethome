"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Dept = { id: number; name: string; parent_id: number | null; description: string | null; sort_order: number };
type Emp = { id: number; full_name: string; department_id: number | null; position: string | null; phone: string | null; email: string | null; duties: string | null; status: string };

async function send(url: string, method: string, body?: object) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json();
  if (!res.ok) alert(json.error ?? "Алдаа");
  return res.ok;
}

export function OrgEditor({ depts, emps }: { depts: Dept[]; emps: Emp[] }) {
  const router = useRouter();
  const [dForm, setDForm] = useState({ name: "", parentId: "", description: "" });
  const [eForm, setEForm] = useState({ fullName: "", departmentId: "", position: "", phone: "", email: "", duties: "" });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">Алба, хэлтэс</h2>
        <form className="grid gap-2" onSubmit={async (e) => {
          e.preventDefault();
          if (await send("/api/admin/departments", "POST", { name: dForm.name, parentId: dForm.parentId ? Number(dForm.parentId) : null, description: dForm.description || null })) {
            setDForm({ name: "", parentId: "", description: "" }); router.refresh();
          }
        }}>
          <input required placeholder="Нэр" className="input" value={dForm.name} onChange={(e) => setDForm({ ...dForm, name: e.target.value })} />
          <select className="input" value={dForm.parentId} onChange={(e) => setDForm({ ...dForm, parentId: e.target.value })}>
            <option value="">Дээд нэгж: байхгүй (үндсэн)</option>
            {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <textarea placeholder="Чиг үүрэг" rows={2} className="input" value={dForm.description} onChange={(e) => setDForm({ ...dForm, description: e.target.value })} />
          <button className="btn-primary">Нэмэх</button>
        </form>
        <ul className="divide-y divide-black/5 text-sm">
          {depts.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2">
              <span>{d.name}</span>
              <button className="text-red-600 hover:underline" onClick={async () => { if (confirm("Устгах уу?") && await send(`/api/admin/departments/${d.id}`, "DELETE")) router.refresh(); }}>Устгах</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">Ажилтан</h2>
        <form className="grid gap-2" onSubmit={async (e) => {
          e.preventDefault();
          const ok = await send("/api/admin/employees", "POST", {
            fullName: eForm.fullName, departmentId: eForm.departmentId ? Number(eForm.departmentId) : null,
            position: eForm.position || null, phone: eForm.phone || null, email: eForm.email || null, duties: eForm.duties || null, status: "active",
          });
          if (ok) { setEForm({ fullName: "", departmentId: "", position: "", phone: "", email: "", duties: "" }); router.refresh(); }
        }}>
          <input required placeholder="Овог нэр" className="input" value={eForm.fullName} onChange={(e) => setEForm({ ...eForm, fullName: e.target.value })} />
          <div className="grid gap-2 md:grid-cols-2">
            <select className="input" value={eForm.departmentId} onChange={(e) => setEForm({ ...eForm, departmentId: e.target.value })}>
              <option value="">Алба/хэлтэс</option>{depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input placeholder="Албан тушаал" className="input" value={eForm.position} onChange={(e) => setEForm({ ...eForm, position: e.target.value })} />
            <input placeholder="Утас" className="input" value={eForm.phone} onChange={(e) => setEForm({ ...eForm, phone: e.target.value })} />
            <input type="email" placeholder="И-мэйл" className="input" value={eForm.email} onChange={(e) => setEForm({ ...eForm, email: e.target.value })} />
          </div>
          <textarea placeholder="Чиг үүрэг" rows={2} className="input" value={eForm.duties} onChange={(e) => setEForm({ ...eForm, duties: e.target.value })} />
          <button className="btn-primary">Нэмэх</button>
        </form>
        <ul className="divide-y divide-black/5 text-sm">
          {emps.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2">
              <span>{e.full_name} <span className="text-black/50">· {e.position ?? "—"}</span></span>
              <button className="text-black/60 hover:underline" onClick={async () => {
                if (await send(`/api/admin/employees/${e.id}`, "PUT", { fullName: e.full_name, departmentId: e.department_id, position: e.position, phone: e.phone, email: e.email, duties: e.duties, status: e.status === "active" ? "inactive" : "active" })) router.refresh();
              }}>{e.status === "active" ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
