"use client";

import { useState } from "react";

export default function ForgotPage() {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-md card p-8">
      <h1 className="mb-6 text-2xl font-bold">Нууц үг сэргээх</h1>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/auth/forgot", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: fd.get("identifier") }),
          });
          const json = await res.json();
          setMsg(json.data?.message ?? json.error);
        }}
      >
        <input name="identifier" required placeholder="И-мэйл эсвэл утас" className="input" />
        <button className="btn-primary w-full">Илгээх</button>
      </form>
      {msg && <p className="mt-4 text-sm text-brand">{msg}</p>}
    </div>
  );
}
