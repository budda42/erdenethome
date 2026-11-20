"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DISTRICTS } from "@/lib/constants";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), { ssr: false });

type Init = Partial<{
  name: string; propertyType: string; address: string; district: string; buildingNo: string; entrance: string;
  floor: number | null; rooms: number | null; areaM2: number | null; description: string;
  latitude: number | null; longitude: number | null; assignedEmployeeId: number | null;
  dealType: "rent" | "sale"; price: number | null; serviceFee: number | null; status: string;
}>;

type Employee = { id: number; full_name: string };
type Img = { id: number; file_url: string; media_type: string };

const statuses: [string, string][] = [
  ["draft", "Ноорог"], ["under_review", "Хянагдаж буй"], ["active", "Идэвхтэй"], ["reserved", "Захиалгатай"],
  ["contracted", "Гэрээ хийгдсэн"], ["closed", "Хаагдсан"],
];

export function PropertyForm({ id, init, employees, images }: { id?: number; init: Init; employees: Employee[]; images: Img[] }) {
  const router = useRouter();
  const [v, setV] = useState<Init>(init);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<Img[]>(images);
  void setFiles;
  const set = (k: keyof Init, val: unknown) => setV((p) => ({ ...p, [k]: val }));
  const num = (val: string) => (val === "" ? null : Number(val));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body = {
      name: v.name, propertyType: v.propertyType || "Орон сууц", address: v.address,
      district: v.district || null, buildingNo: v.buildingNo || null, entrance: v.entrance || null,
      floor: v.floor ?? null, rooms: v.rooms ?? null, areaM2: v.areaM2 ?? null, description: v.description || null,
      latitude: v.latitude ?? null, longitude: v.longitude ?? null, assignedEmployeeId: v.assignedEmployeeId ?? null,
      ad: { dealType: v.dealType ?? "rent", price: v.price ?? 0, serviceFee: v.serviceFee ?? null, status: v.status ?? "draft" },
    };
    const res = await fetch(id ? `/api/admin/properties/${id}` : "/api/admin/properties", {
      method: id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json.error ?? "Алдаа гарлаа." });
    if (!id) return router.push(`/admin/properties/${json.data.id}?created=1`);
    setMsg({ ok: true, text: "Хадгалагдлаа." });
    router.refresh();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!id || !e.target.files?.length) return;
    const fd = new FormData();
    Array.from(e.target.files).forEach((f) => fd.append("files", f));
    setBusy(true);
    const res = await fetch(`/api/admin/properties/${id}/images`, { method: "POST", body: fd });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: json.error });
    // Reload so the newly uploaded media get real IDs (needed for deletion).
    window.location.reload();
  }

  async function removeImage(imageId: number) {
    if (!id) return;
    await fetch(`/api/admin/properties/${id}/images/${imageId}`, { method: "DELETE" });
    setFiles((p) => p.filter((f) => f.id !== imageId));
  }

  async function remove() {
    if (!id || !confirm("Энэ байрыг устгах уу? Буцаах боломжгүй.")) return;
    const res = await fetch(`/api/admin/properties/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) return setMsg({ ok: false, text: json.error });
    router.push("/admin/properties");
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="card grid gap-4 p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">Үндсэн мэдээлэл</h2>
        <div><label className="label">Байрны нэр *</label><input required className="input" value={v.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
        <div><label className="label">Байрны төрөл</label><input className="input" value={v.propertyType ?? ""} onChange={(e) => set("propertyType", e.target.value)} /></div>
        <div className="md:col-span-2"><label className="label">Хаяг *</label><input required className="input" value={v.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
        <div><label className="label">Хороолол</label>
          <select className="input" value={v.district ?? ""} onChange={(e) => set("district", e.target.value)}>
            <option value="">—</option>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select></div>
        <div><label className="label">Байрны дугаар</label><input className="input" value={v.buildingNo ?? ""} onChange={(e) => set("buildingNo", e.target.value)} /></div>
        <div><label className="label">Орц</label><input className="input" value={v.entrance ?? ""} onChange={(e) => set("entrance", e.target.value)} /></div>
        <div><label className="label">Давхар</label><input type="number" className="input" value={v.floor ?? ""} onChange={(e) => set("floor", num(e.target.value))} /></div>
        <div><label className="label">Өрөөний тоо</label><input type="number" min={0} className="input" value={v.rooms ?? ""} onChange={(e) => set("rooms", num(e.target.value))} /></div>
        <div><label className="label">Талбай (м²)</label><input type="number" step="0.01" className="input" value={v.areaM2 ?? ""} onChange={(e) => set("areaM2", num(e.target.value))} /></div>
        <div><label className="label">Хариуцсан ажилтан</label>
          <select className="input" value={v.assignedEmployeeId ?? ""} onChange={(e) => set("assignedEmployeeId", num(e.target.value))}>
            <option value="">—</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select></div>
        <div className="md:col-span-2"><label className="label">Дэлгэрэнгүй тайлбар</label><textarea rows={4} className="input" value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
      </div>

      <div className="card grid gap-4 p-6 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">Зар</h2>
        <div><label className="label">Түрээс / Худалдаа</label>
          <select className="input" value={v.dealType ?? "rent"} onChange={(e) => set("dealType", e.target.value)}>
            <option value="rent">Түрээс</option><option value="sale">Худалдаа</option></select></div>
        <div><label className="label">Төлөв</label>
          <select className="input" value={v.status ?? "draft"} onChange={(e) => set("status", e.target.value)}>
            {statuses.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><label className="label">Үнэ (₮) *</label><input type="number" min={0} required className="input" value={v.price ?? ""} onChange={(e) => set("price", num(e.target.value))} /></div>
        <div><label className="label">Ашиглалтын төлбөр (₮)</label><input type="number" min={0} className="input" value={v.serviceFee ?? ""} onChange={(e) => set("serviceFee", num(e.target.value))} /></div>
      </div>

      <div className="card space-y-3 p-6">
        <h2 className="font-semibold">Байршил</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input type="number" step="0.000001" placeholder="Өргөрөг (lat)" className="input" value={v.latitude ?? ""} onChange={(e) => set("latitude", num(e.target.value))} />
          <input type="number" step="0.000001" placeholder="Уртраг (lng)" className="input" value={v.longitude ?? ""} onChange={(e) => set("longitude", num(e.target.value))} />
        </div>
        <MapPicker
          lat={v.latitude ?? null}
          lng={v.longitude ?? null}
          onChange={(la, ln) => { set("latitude", la); set("longitude", ln); }}
          onClear={() => { set("latitude", null); set("longitude", null); }}
        />
      </div>

      {id ? (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Зураг, видео</h2>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" onChange={upload} disabled={busy} className="text-sm" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {files.map((f) => (
              <div key={f.id} className="group relative">
                {f.media_type === "video"
                  ? <video src={f.file_url} className="aspect-square w-full rounded-lg object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={f.file_url} alt="" className="aspect-square w-full rounded-lg object-cover" />}
                {f.id > 0 && (
                  <button type="button" onClick={() => removeImage(f.id)} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-xs text-red-600 opacity-0 group-hover:opacity-100">✕</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="card p-4 text-sm text-black/60">Зургийг хадгалсны дараа нэмэх боломжтой.</p>
      )}

      {msg && <p className={`text-sm ${msg.ok ? "text-brand" : "text-red-600"}`}>{msg.text}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? "Хадгалж байна…" : "Зарыг хадгалах / нийтлэх"}</button>
        {id && <button type="button" onClick={remove} className="btn-ghost text-red-600">Устгах</button>}
      </div>
    </form>
  );
}
