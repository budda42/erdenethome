"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { fullName: string; email: string | null; phone: string | null };

/** Inline "edit profile" panel on /account. */
export function ProfileEditor(init: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ fullName: init.fullName, email: init.email ?? "", phone: init.phone ?? "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/auth/me", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v),
    });
    const json = await res.json();
    setBusy(false);
    if (!json.ok) {
      const details = json.details ? Object.values(json.details).flat().join(" ") : "";
      return setMsg({ ok: false, text: `${json.error} ${details}`.trim() });
    }
    setMsg({ ok: true, text: "Мэдээлэл шинэчлэгдлээ." });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>✏️ Профайл засах</button>
        {msg && <span className={`text-xs ${msg.ok ? "text-brand" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="w-full space-y-3 rounded-2xl bg-white p-4 shadow-sm sm:max-w-sm">
      <div><label className="label">Нэр</label>
        <input required minLength={2} className="input" value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} /></div>
      <div><label className="label">И-мэйл</label>
        <input type="email" className="input" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
      <div><label className="label">Утас</label>
        <input type="tel" className="input" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></div>
      {msg && !msg.ok && <p className="text-xs text-red-600">{msg.text}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={busy}>{busy ? "Хадгалж байна…" : "Хадгалах"}</button>
        <button type="button" className="btn-ghost" onClick={() => { setOpen(false); setMsg(null); }}>Болих</button>
      </div>
    </form>
  );
}
