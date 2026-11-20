import Link from "next/link";
import type { PublicListing } from "@/lib/listings";

export const fmtMnt = (n: number | null) =>
  n === null ? "—" : `${n.toLocaleString("en-US").replace(/,/g, " ")} ₮`;

export function PropertyCard({ p }: { p: PublicListing }) {
  return (
    <article className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] bg-brand-soft">
        {p.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.coverUrl} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-brand/60">Зураггүй</div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-brand">
          {p.dealType === "rent" ? "Түрээс" : "Худалдаа"}
        </span>
        {p.status === "reserved" && (
          <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Захиалгатай</span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-semibold">{p.name}</h3>
        <p className="line-clamp-1 text-sm text-black/60">{p.address}{p.district ? ` · ${p.district}` : ""}</p>
        <p className="text-sm text-black/70">
          {p.rooms ?? "—"} өрөө · {p.floor ?? "—"} давхар · {p.areaM2 ?? "—"} м²
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-brand">{fmtMnt(p.price)}</span>
          <Link href={`/properties/${p.id}`} className="text-sm font-medium text-brand hover:underline">Дэлгэрэнгүй →</Link>
        </div>
      </div>
    </article>
  );
}
