"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DISTRICTS } from "@/lib/constants";
import { fmtMnt } from "@/components/PropertyCard";

const MapPicker = dynamic(() => import("@/components/MapPicker").then((m) => m.MapPicker), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center rounded-xl border border-black/10 text-sm text-black/50">Газрын зураг ачаалж байна…</div>,
});

type Listing = { id: number; name: string; address: string; district: string | null; deal_type: string; price: number; status: string; has_location: boolean };
type Notif = { id: number; title: string; body: string | null; is_read: number; created_at: string };

const STATUS_MN: Record<string, string> = {
  under_review: "Хянагдаж байна",
  active: "Нийтэлсэн",
  reserved: "Захиалгатай",
  contracted: "Гэрээлсэн",
  closed: "Хаагдсан",
  draft: "Ноорог",
};

const EMPTY = {
  name: "", dealType: "sale", price: "", district: "", address: "",
  rooms: "", areaM2: "", floor: "", description: "",
  latitude: null as number | null, longitude: null as number | null,
};

export function MyListings() {
  const [items, setItems] = useState<Listing[]>([]);
  const [notes, setNotes] = useState<{ items: Notif[]; unread: number }>({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState<string | null>(null);
  const [posted, setPosted] = useState<number | null>(null);

  // Initial load; the effect owns its fetches so a late response after unmount is ignored.
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/my/listings", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/my/notifications", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([a, b]) => {
      if (!alive) return;
      if (a.ok) setItems(a.data.items);
      if (b.ok) setNotes(b.data);
    });
    return () => { alive = false; };
  }, []);

  async function refresh() {
    const [a, b] = await Promise.all([
      fetch("/api/my/listings", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/my/notifications", { cache: "no-store" }).then((r) => r.json()),
    ]);
    if (a.ok) setItems(a.data.items);
    if (b.ok) setNotes(b.data);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setPosted(null);
    if (form.latitude == null || form.longitude == null) {
      setMsg("Газрын зураг дээр байрны байршлыг сонгоно уу.");
      return;
    }
    const num = (v: string) => (v.trim() === "" ? null : Number(v));
    const res = await fetch("/api/my/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        propertyType: "Орон сууц",
        dealType: form.dealType,
        price: num(form.price) ?? 0,
        address: form.address,
        district: form.district || null,
        rooms: num(form.rooms),
        areaM2: num(form.areaM2),
        floor: num(form.floor),
        description: form.description || null,
        latitude: form.latitude,
        longitude: form.longitude,
      }),
    });
    const json = await res.json();
    if (!json.ok) {
      const details = json.details ? Object.values(json.details).flat().join(" ") : "";
      setMsg(`${json.error} ${details}`.trim());
      return;
    }
    setPosted(json.data.id);
    setMsg(json.data.status === "active"
      ? "Зар нийтлэгдлээ — газрын зураг дээр харагдаж байна."
      : "Зар илгээгдлээ. Газрын зураг дээр танд шууд харагдана; админ баталгаажуулмагц бусдад харагдана.");
    setOpen(false);
    setForm(EMPTY);
    refresh();
  }

  async function markAllRead() {
    await fetch("/api/my/notifications", { method: "POST" });
    refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Миний зар</h2>
          <button className="btn-primary" onClick={() => setOpen((v) => !v)}>{open ? "Хаах" : "+ Шинэ зар оруулах"}</button>
        </div>

        {msg && (
          <p className="text-sm text-brand">
            {msg}{" "}
            {posted && <Link href={`/map?focus=${posted}`} className="font-medium underline">Газрын зураг дээр харах →</Link>}
          </p>
        )}

        {open && (
          <form onSubmit={submit} className="card space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <input required minLength={2} className="input" placeholder="Зарын нэр (жишээ: 3 өрөө, 3-р хороолол)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select className="input" value={form.dealType} onChange={(e) => setForm({ ...form, dealType: e.target.value })}>
                <option value="sale">Худалдах</option>
                <option value="rent">Түрээслэх</option>
              </select>
              <input required type="number" min={1} className="input" placeholder="Үнэ (₮)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <select className="input" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                <option value="">Хороолол сонгох</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <input required minLength={3} className="input sm:col-span-2" placeholder="Хаяг" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input type="number" min={0} className="input" placeholder="Өрөө" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} />
              <input type="number" min={0} step="0.01" className="input" placeholder="Талбай (м²)" value={form.areaM2} onChange={(e) => setForm({ ...form, areaM2: e.target.value })} />
              <input type="number" className="input" placeholder="Давхар" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
              <textarea rows={3} className="input sm:col-span-2" placeholder="Тайлбар" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Байршил <span className="text-red-600">*</span></p>
              <MapPicker
                lat={form.latitude}
                lng={form.longitude}
                onChange={(la, ln) => setForm((f) => ({ ...f, latitude: la, longitude: ln }))}
                onClear={() => setForm((f) => ({ ...f, latitude: null, longitude: null }))}
              />
            </div>
            <button className="btn-primary w-full">Илгээх</button>
          </form>
        )}

        {items.length === 0 ? (
          <p className="card p-6 text-center text-sm text-black/60">Та одоогоор зар оруулаагүй байна.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((l) => (
              <li key={l.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{l.name}</p>
                  <p className="truncate text-sm text-black/60">{l.address}{l.district ? ` · ${l.district}` : ""}</p>
                  <p className="text-sm font-bold text-brand">{fmtMnt(l.price)} {l.deal_type === "rent" ? "/ сар" : ""}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="whitespace-nowrap rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
                    {STATUS_MN[l.status] ?? l.status}
                  </span>
                  {l.has_location && ["under_review", "draft", "active", "reserved"].includes(l.status) && (
                    <Link href={`/map?focus=${l.id}`} className="whitespace-nowrap text-xs text-brand hover:underline">Газрын зураг дээр</Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Мэдэгдэл {notes.unread > 0 && <span className="ml-1 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">{notes.unread}</span>}</h2>
          {notes.unread > 0 && <button className="btn-ghost !py-1.5 text-sm" onClick={markAllRead}>Бүгдийг уншсан</button>}
        </div>
        {notes.items.length === 0 ? (
          <p className="text-sm text-black/60">Мэдэгдэл алга.</p>
        ) : (
          <ul className="space-y-2">
            {notes.items.map((n) => (
              <li key={n.id} className={`card space-y-1 p-4 text-sm ${n.is_read ? "" : "border-l-4 border-brand"}`}>
                <p className="font-semibold">{n.title}</p>
                {n.body && <p className="whitespace-pre-wrap text-black/70">{n.body}</p>}
                <p className="text-xs text-black/40">{new Date(n.created_at).toLocaleString("mn-MN")}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
