"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { useEffect, useState } from "react";
import { pinIcon } from "@/components/mapIcons";

// Erdenet city centre (approx.)
const CENTER: [number, number] = [49.0333, 104.05];
const round = (n: number) => Number(n.toFixed(6));

type Hit = { display_name: string; lat: string; lon: string };

function ClickSetter({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(round(e.latlng.lat), round(e.latlng.lng));
    },
  });
  return null;
}

/** Pans the map whenever the chosen point changes from outside a click (search, GPS, typed coordinates). */
function FollowPoint({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!pos) return;
    if (!map.getBounds().contains(pos)) map.setView(pos, Math.max(map.getZoom(), 16));
  }, [pos, map]);
  return null;
}

/**
 * Controlled location picker: click the map, drag the pin, search an address or use the
 * device's GPS. The value lives in the parent form (lat/lng props).
 */
export function MapPicker({
  lat, lng, onChange, onClear,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  onClear?: () => void;
}) {
  const pos: [number, number] | null = lat != null && lng != null ? [lat, lng] : null;
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function search() {
    const term = q.trim();
    if (term.length < 2) return;
    setBusy(true);
    setNote(null);
    try {
      // OpenStreetMap Nominatim, biased to Erdenet. Light, user-triggered use only.
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.search = new URLSearchParams({
        q: /эрдэнэт|erdenet/i.test(term) ? term : `${term}, Эрдэнэт`,
        format: "json", limit: "5", countrycodes: "mn", "accept-language": "mn",
        viewbox: "103.90,49.10,104.20,48.95",
      }).toString();
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data: Hit[] = res.ok ? await res.json() : [];
      setHits(data);
      if (!data.length) setNote("Хаяг олдсонгүй. Газрын зураг дээр шууд дарж сонгоно уу.");
    } catch {
      setNote("Хайлт амжилтгүй боллоо. Газрын зураг дээр шууд дарж сонгоно уу.");
    } finally {
      setBusy(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) return setNote("Таны төхөөрөмж байршил тодорхойлохыг дэмжихгүй байна.");
    setBusy(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      (p) => { setBusy(false); onChange(round(p.coords.latitude), round(p.coords.longitude)); },
      () => { setBusy(false); setNote("Байршил авах зөвшөөрөл олгогдсонгүй."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          className="input min-w-0 flex-1"
          placeholder="Хаягаар хайх (жишээ: 3-р хороолол, Соёлын төв)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
        />
        <button type="button" className="btn-ghost" onClick={search} disabled={busy}>Хайх</button>
        <button type="button" className="btn-ghost" onClick={locate} disabled={busy}>📍 Миний байршил</button>
      </div>

      {hits.length > 0 && (
        <ul className="card divide-y divide-black/5 text-sm">
          {hits.map((h) => (
            <li key={`${h.lat},${h.lon}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-brand-soft"
                onClick={() => { onChange(round(Number(h.lat)), round(Number(h.lon))); setHits([]); }}
              >
                {h.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="text-xs text-amber-700">{note}</p>}

      <div className="overflow-hidden rounded-xl border border-black/10">
        <MapContainer center={pos ?? CENTER} zoom={pos ? 16 : 14} className="h-72 w-full" scrollWheelZoom>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          <ClickSetter onPick={onChange} />
          <FollowPoint pos={pos} />
          {pos && (
            <Marker
              position={pos}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend(e) {
                  const m = e.target.getLatLng();
                  onChange(round(m.lat), round(m.lng));
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="flex items-center justify-between text-xs text-black/60">
        {pos ? (
          <span>Сонгосон байршил: {pos[0]}, {pos[1]} · тэмдэгийг чирж нарийвчилж болно</span>
        ) : (
          <span>Газрын зураг дээр дарж байрны байршлыг тэмдэглэнэ үү.</span>
        )}
        {pos && onClear && <button type="button" className="text-red-600 hover:underline" onClick={onClear}>Арилгах</button>}
      </div>
    </div>
  );
}
