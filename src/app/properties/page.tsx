import Link from "next/link";
import { publicFilterSchema } from "@/lib/properties";
import { listPublic } from "@/lib/listings";
import { PropertyCard } from "@/components/PropertyCard";
import { DISTRICTS } from "@/lib/constants";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function PropertiesPage({ searchParams }: { searchParams: SP }) {
  const raw = Object.fromEntries(
    Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v),
  );
  const parsed = publicFilterSchema.safeParse(raw);
  const f = parsed.success ? parsed.data : publicFilterSchema.parse({});
  const { total, items } = await listPublic(f);
  const pages = Math.max(1, Math.ceil(total / f.pageSize));
  const qs = (p: number) => {
    const u = new URLSearchParams(raw as Record<string, string>);
    u.set("page", String(p));
    return `/properties?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Байр хайх</h1>
          <p className="text-sm text-black/60">Нийт {total} зар</p>
        </div>
        <Link href="/map" className="btn-ghost">Газрын зураг</Link>
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-6">
        <input name="q" defaultValue={f.q} placeholder="Нэр, хаяг" className="input md:col-span-2" />
        <select name="district" defaultValue={f.district ?? ""} className="input">
          <option value="">Бүх хороолол</option>
          {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select name="rooms" defaultValue={f.rooms ?? ""} className="input">
          <option value="">Өрөө</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} өрөө</option>)}
        </select>
        <select name="deal" defaultValue={f.deal ?? ""} className="input">
          <option value="">Түрээс / Худалдаа</option>
          <option value="rent">Түрээс</option>
          <option value="sale">Худалдаа</option>
        </select>
        <div className="flex gap-2">
          <input name="minPrice" type="number" min={0} defaultValue={f.minPrice} placeholder="Доод ₮" className="input" />
          <input name="maxPrice" type="number" min={0} defaultValue={f.maxPrice} placeholder="Дээд ₮" className="input" />
        </div>
        <button className="btn-primary md:col-span-6">Шүүх</button>
      </form>

      {items.length === 0 ? (
        <p className="card p-10 text-center text-black/60">Таны шүүлтэд тохирох зар олдсонгүй.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2 text-sm">
          {f.page > 1 && <Link className="btn-ghost" href={qs(f.page - 1)}>← Өмнөх</Link>}
          <span className="px-3 text-black/60">{f.page} / {pages}</span>
          {f.page < pages && <Link className="btn-ghost" href={qs(f.page + 1)}>Дараах →</Link>}
        </nav>
      )}
    </div>
  );
}
