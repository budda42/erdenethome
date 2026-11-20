"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { pinIcon } from "@/components/mapIcons";

/** Read-only map with a single pin, used on the listing detail page. */
export function PropertyLocationMapInner({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/10">
      <MapContainer center={[lat, lng]} zoom={16} className="h-64 w-full" scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
