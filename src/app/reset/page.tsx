"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-md card p-8">
      <h1 className="mb-6 text-2xl font-bold">Шинэ нууц үг</h1>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/auth/reset", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password: fd.get("password") }),
          });
          const json = await res.json();
          if (res.ok) router.push("/login");
          else setMsg(json.error);
        }}
      >
        <input name="password" type="password" required minLength={8} placeholder="Шинэ нууц үг" className="input" />
        <button className="btn-primary w-full">Хадгалах</button>
      </form>
      {msg && <p className="mt-4 text-sm text-red-600">{msg}</p>}
    </div>
  );
}

export default function ResetPage() {
  return <Suspense><ResetForm /></Suspense>;
}
