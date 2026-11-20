"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChatThread } from "@/components/ChatThread";

// Bottom sheet opened from a swipe card. Opens the property's thread, or starts one.
export function ChatSheet({ propertyId, propertyName, loggedIn, onClose }: {
  propertyId: number;
  propertyName: string;
  loggedIn: boolean;
  onClose: () => void;
}) {
  const [chatId, setChatId] = useState<number | null>(null);
  const [loading, setLoading] = useState(loggedIn);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    fetch(`/api/chats?propertyId=${propertyId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j.ok && j.data.chat) setChatId(j.data.chat.id); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [propertyId, loggedIn]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setError(null);
    const res = await fetch("/api/chats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, body }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.error);
    setChatId(json.data.chatId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <p className="truncate font-semibold">💬 {propertyName}</p>
          <button className="btn-ghost !py-1 px-3" onClick={onClose} aria-label="Хаах">✕</button>
        </div>

        {!loggedIn ? (
          <div className="space-y-3 p-6 text-center text-sm">
            <p>Чат бичихийн тулд нэвтэрнэ үү.</p>
            <Link href="/login?next=/swipe" className="btn-primary inline-flex">Нэвтрэх</Link>
          </div>
        ) : loading ? (
          <p className="p-6 text-center text-sm text-black/50">Ачаалж байна…</p>
        ) : chatId ? (
          <ChatThread chatId={chatId} />
        ) : (
          <form onSubmit={start} className="space-y-3 p-4">
            <p className="text-sm text-black/60">Энэ байрны талаар асуух зүйлээ бичнэ үү.</p>
            <textarea
              className="input min-h-24"
              placeholder="Сайн байна уу, энэ байрны талаар..."
              value={text}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={!text.trim()}>Илгээх</button>
          </form>
        )}
      </div>
    </div>
  );
}
