import L from "leaflet";

// Leaflet's default marker images don't resolve through the Next.js bundler, so every
// marker in the app uses these HTML (divIcon) markers instead.

/** Teardrop pin used by the location picker and the detail-page mini map. */
export const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
    <path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="#167653" stroke="#fff" stroke-width="2"/>
    <circle cx="16" cy="15.5" r="5.5" fill="#fff"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 41],
  popupAnchor: [0, -38],
});

export type MarkerKind = "rent" | "sale" | "pending";

const KIND: Record<MarkerKind, { bg: string; label: string }> = {
  rent: { bg: "#167653", label: "Түрээс" },
  sale: { bg: "#0f5a40", label: "Худалдаа" },
  pending: { bg: "#b45309", label: "Миний зар · хянагдаж буй" },
};

/** Pill-shaped price/label marker for the main map. */
export function labelIcon(kind: MarkerKind, text?: string, highlighted = false) {
  const { bg, label } = KIND[kind];
  const ring = highlighted ? "outline:3px solid #fbbf24;outline-offset:1px;" : "";
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);display:inline-block;background:${bg};color:#fff;padding:5px 9px;border-radius:999px;font:600 12px/1 system-ui;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap;${ring}">${text ?? label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -26],
  });
}
