"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fmtMnt } from "@/components/PropertyCard";

type Msg = {
  id: number;
  sender: "customer" | "staff";
  kind: "text" | "contract";
  body: string | null;
  created_at: string;
  contract_id: number | null;
  contract_number: string | null;
  contract_type: "rent" | "sale" | null;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  contract_status: string | null;
  party_status: "pending" | "accepted" | "declined" | null;
};

type Sendable = { id: number; contract_number: string; contract_type: string; amount: number; status: string };

type ThreadData = {
  viewer: "customer" | "staff";
  canReply: boolean;
  items: Msg[];
  sendableContracts: Sendable[];
};

const POLL_MS = 5000;

export function ChatThread({ chatId }: { chatId: number }) {
  const [data, setData] = useState<ThreadData | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickedContract, setPickedContract] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Poll the thread; the effect owns the fetch so it can be cancelled on unmount.
  useEffect(() => {
    let alive = true;
    const fetchThread = () =>
      fetch(`/api/chats/${chatId}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((json) => {
          if (!alive) return;
          if (json.ok) setData(json.data);
          else setError(json.error);
        })
        .catch(() => { if (alive) setError("Холболт тасарлаа."); });
    fetchThread();
    const t = setInterval(fetchThread, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [chatId]);

  // Refresh right after the user acts (send, accept, etc.).
  const refresh = useCallback(() => {
    fetch(`/api/chats/${chatId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => { if (json.ok) setData(json.data); });
  }, [chatId]);

  // Keep the newest message in view without scrolling the whole page.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [data?.items.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/chats/${chatId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    setSending(false);
    if (!json.ok) return setError(json.error);
    setText("");
    refresh();
  }

  async function sendContract() {
    if (!pickedContract) return;
    setError(null);
    const res = await fetch(`/api/chats/${chatId}/contract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractId: Number(pickedContract) }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.error);
    setPickedContract("");
    refresh();
  }

  async function respond(contractId: number, accept: boolean) {
    setError(null);
    const res = await fetch(`/api/my/contracts/${contractId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    const json = await res.json();
    if (!json.ok) return setError(json.error);
    refresh();
  }

  if (!data) {
    return <p className="p-6 text-center text-sm text-black/50">{error ?? "Ачаалж байна…"}</p>;
  }

  const isCustomer = data.viewer === "customer";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {data.items.length === 0 && (
          <p className="py-8 text-center text-sm text-black/50">Мессеж алга. Эхний мессежээ бичнэ үү.</p>
        )}
        {data.items.map((m) => {
          const mine = m.sender === data.viewer;
          if (m.kind === "contract") {
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="card w-full max-w-[85%] space-y-2 p-4 text-sm">
                  <p className="font-semibold text-brand">Гэрээ · {m.contract_number}</p>
                  <p className="text-black/70">
                    {m.contract_type === "rent" ? "Түрээс" : "Худалдаа"} · {m.amount ? fmtMnt(m.amount) : "—"}
                  </p>
                  <p className="text-black/60">
                    {m.start_date ?? "—"} → {m.end_date ?? "—"}
                  </p>
                  {isCustomer && m.party_status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <button className="btn-primary !py-1.5" onClick={() => respond(m.contract_id!, true)}>Гэрээлэх</button>
                      <button className="btn-ghost !py-1.5" onClick={() => respond(m.contract_id!, false)}>Татгалзах</button>
                    </div>
                  )}
                  {m.party_status === "accepted" && <p className="font-medium text-brand">✓ Гэрээлсэн</p>}
                  {m.party_status === "declined" && <p className="font-medium text-red-600">Татгалзсан</p>}
                  {!isCustomer && m.party_status && (
                    <p className="text-xs text-black/50">Хэрэглэгчийн төлөв: {m.party_status === "pending" ? "хүлээгдэж байна" : m.party_status === "accepted" ? "гэрээлсэн" : "татгалзсан"}</p>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${mine ? "bg-brand text-white" : "bg-brand-soft text-black"}`}>
                {!mine && <p className="mb-0.5 text-xs opacity-60">{m.sender === "staff" ? "Эрдэнэт хөрөнгө" : "Хэрэглэгч"}</p>}
                {m.body}
              </div>
            </div>
          );
        })}
      </div>

      {!isCustomer && data.sendableContracts.length > 0 && (
        <div className="flex gap-2 border-t border-black/5 p-3">
          <select className="input py-1.5" value={pickedContract} onChange={(e) => setPickedContract(e.target.value)}>
            <option value="">Гэрээ сонгох…</option>
            {data.sendableContracts.map((c) => (
              <option key={c.id} value={c.id}>{c.contract_number} · {fmtMnt(c.amount)}</option>
            ))}
          </select>
          <button className="btn-ghost whitespace-nowrap !py-1.5" onClick={sendContract} disabled={!pickedContract}>Гэрээ илгээх</button>
        </div>
      )}

      {data.canReply ? (
        <form onSubmit={send} className="flex gap-2 border-t border-black/5 p-3">
          <input
            className="input"
            placeholder="Мессеж бичих…"
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-primary whitespace-nowrap" disabled={sending || !text.trim()}>Илгээх</button>
        </form>
      ) : (
        <p className="border-t border-black/5 p-3 text-center text-xs text-black/50">Танд хариулах эрх байхгүй.</p>
      )}
      {error && <p className="px-4 pb-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
