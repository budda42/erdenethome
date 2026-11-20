"use client";

import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type L from "leaflet";
import type { PublicListing } from "@/lib/listings";
import { DISTRICTS } from "@/lib/constants";
import { fmtMnt } from "@/components/PropertyCard";
import { labelIcon } from "@/components/mapIcons";

// Erdenet city centre (approx.)
const CENTER: [number, number] = [49.0333, 104.05];

type Pin = PublicListing & { mine?: boolean };
const hasPos = (i: PublicListing) => i.latitude != null && i.longitude != null;

/** Frames all markers once they change; a focused listing wins over the overview. */
function FitToItems({ items, focus }: { items: Pin[]; focus: Pin | null }) {
  const map = useMap();
  // Re-frame only when the set of markers (or the focus) really changes, not on every render.
  const key = `${focus?.id ?? ""}|${items.map((i) => i.id).join(",")}`;
  useEffect(() => {
    if (focus) {
      map.setView([focus.latitude!, focus.longitude!], 17);
      return;
    }
    const pts = items.map((i) => [i.latitude!, i.longitude!] as [number, number]);
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
    else if (pts.length === 1) map.setView(pts[0], 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export function MapView({ items, mine = [], focusId = null }: { items: PublicListing[]; mine?: PublicListing[]; focusId?: number | null }) {
  const [district, setDistrict] = useState("");
  const [deal, setDeal] = useState("");
  const [view, setView] = useState<"map" | "list">("map");
  const [maxPrice, setMaxPrice] = useState("");
  const markers = useRef<Record<number, L.Marker | null>>({});

  const all: Pin[] = [...mine.map((m) => ({ ...m, mine: true })), ...items];
  const filtered = all.filter((i) =>
    (!district || i.district === district) &&
    (!deal || i.dealType === deal) &&
    (!maxPrice || (i.price ?? 0) <= Number(maxPrice)),
  );
  const onMap = filtered.filter(hasPos);
  const focus = focusId ? onMap.find((i) => i.id === focusId) ?? null : null;

  // Open the focused listing's popup once its marker exists (e.g. right after posting an ad).
  useEffect(() => {
    if (view !== "map" || !focus) return;
    const t = setTimeout(() => markers.current[focus.id]?.openPopup(), 300);
    return () => clearTimeout(t);
  }, [focus, view]);

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <select className="input max-w-[200px]" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">Бүх хороолол</option>
          {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="input max-w-[180px]" value={deal} onChange={(e) => setDeal(e.target.value)}>
          <option value="">Түрээс / Худалдаа</option>
          <option value="rent">Түрээс</option>
          <option value="sale">Худалдаа</option>
        </select>
        <input className="input max-w-[200px]" type="number" min={0} placeholder="Дээд үнэ ₮" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
        <div className="ml-auto flex gap-2">
          <button className={view === "map" ? "btn-primary" : "btn-ghost"} onClick={() => setView("map")}>Газрын зураг</button>
          <button className={view === "list" ? "btn-primary" : "btn-ghost"} onClick={() => setView("list")}>Жагсаалт</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-black/60">
        <span>{filtered.length} зар · байршилтай {onMap.length}</span>
        {mine.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-full bg-amber-700" /> Таны хянагдаж буй зар (зөвхөн танд харагдана)
          </span>
        )}
      </div>

      {view === "map" ? (
        <div className="card overflow-hidden">
          <MapContainer center={CENTER} zoom={13} className="h-[70vh] w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitToItems items={onMap} focus={focus} />
            {onMap.map((p) => (
              <Marker
                key={`${p.mine ? "m" : "p"}${p.id}`}
                ref={(m) => { markers.current[p.id] = m; }}
                position={[p.latitude!, p.longitude!]}
                icon={labelIcon(p.mine ? "pending" : p.dealType, undefined, p.id === focusId)}
                zIndexOffset={p.mine || p.id === focusId ? 1000 : 0}
              >
                <Popup>
                  <div className="w-56 space-y-1 text-sm">
                    {p.coverUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.coverUrl} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />
                    )}
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-black/60">{p.address}</p>
                    <p>{p.rooms ?? "—"} өрөө · {p.areaM2 ?? "—"} м² · {p.floor ?? "—"} давхар</p>
                    <p className="font-bold text-brand">{fmtMnt(p.price)}{p.dealType === "rent" ? " / сар" : ""}</p>
                    <p className="text-xs">
                      {p.mine ? "Админ баталгаажуулмагц бусдад харагдана" : p.status === "reserved" ? "Захиалгатай" : "Боломжтой"}
                    </p>
                    <Link href={`/properties/${p.id}`} className="mt-1 block text-center text-brand underline">Дэлгэрэнгүй үзэх</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((p) => (
            <Link key={`${p.mine ? "m" : "p"}${p.id}`} href={`/properties/${p.id}`} className="card flex justify-between gap-4 p-4 hover:shadow-md">
              <div>
                <p className="font-semibold">{p.name}{p.mine && <span className="ml-2 text-xs font-normal text-amber-700">хянагдаж буй</span>}</p>
                <p className="text-sm text-black/60">{p.address}</p>
              </div>
              <p className="whitespace-nowrap font-bold text-brand">{fmtMnt(p.price)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
