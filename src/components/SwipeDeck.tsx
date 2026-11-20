"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import type { PublicListing } from "@/lib/listings";
import { fmtMnt } from "@/components/PropertyCard";
import { ChatSheet } from "@/components/ChatSheet";

const LIKED_KEY = "eh_liked";
const THRESHOLD = 110;

function readLiked(): number[] {
  try { return JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]"); } catch { return []; }
}

export function SwipeDeck({ items, loggedIn }: { items: PublicListing[]; loggedIn: boolean }) {
  // Zones (хороолол) that actually have listings, biggest first.
  const zones = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((i) => { const z = i.district ?? "Бусад"; counts.set(z, (counts.get(z) ?? 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const [zone, setZone] = useState<string | null>(null);
  const deck = useMemo(() => items.filter((i) => zone === null || (i.district ?? "Бусад") === zone), [items, zone]);

  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<null | "left" | "right">(null);
  const [liked, setLiked] = useState<number[]>(() => (typeof window === "undefined" ? [] : readLiked()));
  const [history, setHistory] = useState<{ id: number; liked: boolean }[]>([]);
  const start = useRef<number | null>(null);
  const [chatFor, setChatFor] = useState<{ id: number; name: string } | null>(null);

  function pickZone(z: string | null) {
    setZone(z);
    setIndex(0);
    setHistory([]);
  }

  const current = deck[index];
  const next = deck[index + 1];

  function persistLike(id: number, add: boolean) {
    if (loggedIn) {
      fetch(add ? "/api/saved" : `/api/saved/${id}`, add
        ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: id }) }
        : { method: "DELETE" });
    }
    const set = new Set(readLiked());
    if (add) set.add(id);
    else set.delete(id);
    localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
    setLiked([...set]);
  }

  function decide(like: boolean) {
    if (!current || leaving) return;
    setLeaving(like ? "right" : "left");
    setTimeout(() => {
      if (like) persistLike(current.id, true);
      setHistory((h) => [...h, { id: current.id, liked: like }]);
      setIndex((i) => i + 1);
      setLeaving(null);
      setDx(0);
    }, 280);
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    if (last.liked) persistLike(last.id, false);
    setHistory((h) => h.slice(0, -1));
    setIndex((i) => Math.max(0, i - 1));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (chatFor) return; // typing in the chat sheet must not swipe the deck
      if (e.key === "ArrowRight") decide(true);
      else if (e.key === "ArrowLeft") decide(false);
      else if (e.key === "Backspace" || e.key === "ArrowUp") undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onPointerDown(e: React.PointerEvent) {
    start.current = e.clientX;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (start.current === null) return;
    setDx(e.clientX - start.current);
  }
  function onPointerUp() {
    if (start.current === null) return;
    start.current = null;
    setDragging(false);
    if (dx > THRESHOLD) decide(true);
    else if (dx < -THRESHOLD) decide(false);
    else setDx(0);
  }

  const rotate = dx / 20;
  const likeOpacity = Math.min(Math.max(dx / THRESHOLD, 0), 1);
  const nopeOpacity = Math.min(Math.max(-dx / THRESHOLD, 0), 1);
  const flyX = leaving === "right" ? 800 : leaving === "left" ? -800 : dx;

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className={zone === null ? "btn-primary whitespace-nowrap" : "btn-ghost whitespace-nowrap"} onClick={() => pickZone(null)}>
          Бүх бүс ({items.length})
        </button>
        {zones.map(([z, n]) => (
          <button key={z} className={zone === z ? "btn-primary whitespace-nowrap" : "btn-ghost whitespace-nowrap"} onClick={() => pickZone(z)}>
            {z} ({n})
          </button>
        ))}
      </div>

      <div className="mx-auto flex max-w-sm flex-col items-center gap-5">
        <div className="relative h-[560px] w-full select-none touch-none">
          {next && (
            <div className="absolute inset-x-3 top-3 h-full scale-[0.96] rounded-3xl bg-white shadow-sm" aria-hidden />
          )}
          {current ? (
            <div
              key={current.id}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                transform: `translateX(${flyX}px) rotate(${rotate}deg)`,
                transition: dragging ? "none" : "transform 280ms ease",
              }}
              className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl bg-white shadow-xl active:cursor-grabbing"
            >
              <div className="relative h-[70%] bg-brand-soft">
                {current.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.coverUrl} alt={current.name} draggable={false} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-brand/60">Зураггүй</div>
                )}
                <div
                  className="absolute left-5 top-5 rotate-[-12deg] rounded-xl border-4 border-brand px-3 py-1 text-2xl font-extrabold text-brand"
                  style={{ opacity: likeOpacity }}
                >ХАДГАЛАХ</div>
                <div
                  className="absolute right-5 top-5 rotate-[12deg] rounded-xl border-4 border-red-500 px-3 py-1 text-2xl font-extrabold text-red-500"
                  style={{ opacity: nopeOpacity }}
                >АЛГАСАХ</div>
                <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-brand">
                  {current.dealType === "rent" ? "Түрээс" : "Худалдаа"}
                </span>
              </div>
              <div className="space-y-2 p-5">
                <p className="text-xl font-bold leading-tight">{current.name}</p>
                <p className="line-clamp-1 text-sm text-black/60">{current.address}</p>
                <p className="text-sm text-black/70">{current.rooms ?? "—"} өрөө · {current.floor ?? "—"} давхар · {current.areaM2 ?? "—"} м²</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-brand">{fmtMnt(current.price)}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setChatFor({ id: current.id, name: current.name })}
                      className="text-sm font-medium text-brand hover:underline"
                    >💬 Чат</button>
                    <Link href={`/properties/${current.id}`} onPointerDown={(e) => e.stopPropagation()} className="text-sm font-medium text-brand hover:underline">Дэлгэрэнгүй →</Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-semibold">Энэ бүсэд үзэх зар дууслаа</p>
              <p className="text-sm text-black/60">Хадгалсан: {liked.length} байр</p>
              <button className="btn-ghost" onClick={() => pickZone(null)}>Дахин эхлэх</button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <button aria-label="Буцаах" onClick={undo} disabled={history.length === 0} className="btn-ghost h-12 w-12 !rounded-full text-lg">↶</button>
          <button aria-label="Алгасах" onClick={() => decide(false)} disabled={!current} className="btn-ghost h-16 w-16 !rounded-full text-2xl text-red-500">✕</button>
          <button aria-label="Хадгалах" onClick={() => decide(true)} disabled={!current} className="btn-primary h-16 w-16 !rounded-full text-2xl">♥</button>
        </div>
        <p className="text-xs text-black/50">
          {deck.length ? `${Math.min(index + 1, deck.length)} / ${deck.length}` : "0 / 0"} · Зүүн: алгасах · Баруун: хадгалах
          {!loggedIn && " · Нэвтрээгүй бол хадгалалт энэ төхөөрөмжид л үлдэнэ"}
        </p>
      </div>

      {chatFor && (
        <ChatSheet
          key={chatFor.id}
          propertyId={chatFor.id}
          propertyName={chatFor.name}
          loggedIn={loggedIn}
          onClose={() => setChatFor(null)}
        />
      )}
    </div>
  );
}
