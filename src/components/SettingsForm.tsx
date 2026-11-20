"use client";

import { useState } from "react";

const FIELDS: [string, string, "text" | "area"][] = [
  ["org.about", "Танилцуулга", "area"],
  ["org.mission", "Эрхэм зорилго", "area"],
  ["org.activities", "Үйл ажиллагааны чиглэл", "area"],
  ["org.address", "Байгууллагын хаяг", "text"],
  ["org.phone", "Утас", "text"],
  ["org.email", "И-мэйл", "text"],
  ["org.hours", "Ажлын цаг", "text"],
  ["org.facebook", "Facebook хуудасны холбоос (https://…)", "text"],
];

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveAll(e: React.FormEvent) {
    e.preventDefault();
    for (const [key] of FIELDS) {
      await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, value: vals[key] ?? "" }) });
    }
    setMsg("Хадгалагдлаа.");
  }

  return (
    <form onSubmit={saveAll} className="card grid gap-4 p-6">
      {FIELDS.map(([key, label, kind]) => (
        <div key={key}>
          <label className="label">{label}</label>
          {kind === "area"
            ? <textarea rows={3} className="input" value={vals[key] ?? ""} onChange={(e) => setVals({ ...vals, [key]: e.target.value })} />
            : <input className="input" value={vals[key] ?? ""} onChange={(e) => setVals({ ...vals, [key]: e.target.value })} />}
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button className="btn-primary">Хадгалах</button>
        {msg && <span className="text-sm text-brand">{msg}</span>}
      </div>
    </form>
  );
}
