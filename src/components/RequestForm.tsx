"use client";

import { useState } from "react";

export function RequestForm({ propertyId, defaultName }: { propertyId: number; defaultName?: string }) {
  const [state, setState] = useState<{ kind: "idle" | "sending" | "done" | "error"; msg?: string }>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Read the form before the await: React clears currentTarget once the event handler yields.
    const form = e.currentTarget;
    const fd = new FormData(form);
    setState({ kind: "sending" });
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId,
        name: fd.get("name"),
        phone: fd.get("phone"),
        message: fd.get("message") || undefined,
        website: fd.get("website") || undefined,
      }),
    });
    const json = await res.json();
    if (res.ok) {
      setState({ kind: "done", msg: "Таны хүсэлт хүлээн авлаа. Манай ажилтан удахгүй холбогдоно." });
      form.reset();
    } else {
      setState({ kind: "error", msg: json.error ?? "Алдаа гарлаа." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input name="name" required minLength={2} defaultValue={defaultName} placeholder="Таны нэр" className="input" />
      <input name="phone" required placeholder="Утасны дугаар" className="input" />
      <textarea name="message" rows={3} placeholder="Мессеж (заавал биш)" className="input" />
      {/* Honeypot field: hidden from people, filled by bots. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button className="btn-primary w-full" disabled={state.kind === "sending"}>
        {state.kind === "sending" ? "Илгээж байна…" : "Холбогдох хүсэлт илгээх"}
      </button>
      {state.msg && (
        <p className={`text-sm ${state.kind === "error" ? "text-red-600" : "text-brand"}`}>{state.msg}</p>
      )}
    </form>
  );
}
