"use client";

import dynamic from "next/dynamic";
import type { PublicListing } from "@/lib/listings";

// Leaflet needs `window`, so the map is rendered on the client only.
const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="card flex h-[70vh] items-center justify-center text-black/50">Газрын зураг ачаалж байна…</div>,
});

export function MapClient({ items, mine = [], focusId = null }: { items: PublicListing[]; mine?: PublicListing[]; focusId?: number | null }) {
  return <MapView items={items} mine={mine} focusId={focusId} />;
}
