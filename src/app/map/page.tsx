import { listPublic, listMineForMap } from "@/lib/listings";
import { getCurrentUser } from "@/lib/auth";
import { MapClient } from "@/components/MapClient";

export const metadata = { title: "Газрын зураг — ERDENET HOME" };

export default async function MapPage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const { focus } = await searchParams;
  const focusId = Number(focus);
  const user = await getCurrentUser();

  // Visitors see every visible ad with coordinates (capped at 200 per request). A signed-in
  // user also sees their own ads that are still waiting for admin approval.
  const [{ items }, mine] = await Promise.all([
    listPublic({ page: 1, pageSize: 200 }),
    user ? listMineForMap(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Газрын зураг</h1>
      <MapClient items={items} mine={mine} focusId={Number.isInteger(focusId) && focusId > 0 ? focusId : null} />
    </div>
  );
}
