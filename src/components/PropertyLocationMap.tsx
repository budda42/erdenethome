"use client";

import dynamic from "next/dynamic";

// Leaflet needs `window`, so the mini map is loaded on the client only.
const Inner = dynamic(() => import("@/components/PropertyLocationMapInner").then((m) => m.PropertyLocationMapInner), {
  ssr: false,
  loading: () => <div className="flex h-64 items-center justify-center rounded-xl bg-brand-soft text-sm text-brand/60">Газрын зураг ачаалж байна…</div>,
});

export function PropertyLocationMap({ lat, lng }: { lat: number; lng: number }) {
  return <Inner lat={lat} lng={lng} />;
}
