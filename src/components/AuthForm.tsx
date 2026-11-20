"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/account";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const body = mode === "login"
      ? { identifier: fd.get("identifier"), password: fd.get("password") }
      : {
          fullName: fd.get("fullName"),
          email: fd.get("email") || undefined,
          phone: fd.get("phone") || undefined,
          password: fd.get("password"),
        };
    const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(json.error ?? "Алдаа гарлаа.");
      return;
    }
    router.push(next.startsWith("/") ? next : "/account");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="card p-8">
        <h1 className="mb-6 text-2xl font-bold">{mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" ? (
            <>
              <div><label className="label">Нэр</label><input name="fullName" required minLength={2} className="input" /></div>
              <div><label className="label">И-мэйл</label><input name="email" type="email" className="input" /></div>
              <div><label className="label">Утасны дугаар</label><input name="phone" className="input" /></div>
              <p className="text-xs text-black/50">И-мэйл эсвэл утасны дугаарын аль нэгийг заавал оруулна.</p>
            </>
          ) : (
            <div><label className="label">И-мэйл эсвэл утас</label><input name="identifier" required className="input" /></div>
          )}
          <div><label className="label">Нууц үг</label><input name="password" type="password" required minLength={8} className="input" /></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Түр хүлээнэ үү…" : mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}</button>
        </form>
        <div className="mt-6 flex justify-between text-sm">
          {mode === "login" ? (
            <>
              <Link href="/forgot" className="text-brand hover:underline">Нууц үг мартсан</Link>
              <Link href="/register" className="text-brand hover:underline">Бүртгүүлэх</Link>
            </>
          ) : (
            <Link href="/login" className="text-brand hover:underline">Аль хэдийн бүртгэлтэй юу? Нэвтрэх</Link>
          )}
        </div>
      </div>
    </div>
  );
}
