import Link from "next/link";
import { listPublic } from "@/lib/listings";
import { PropertyCard } from "@/components/PropertyCard";
import { DISTRICTS } from "@/lib/constants";

export default async function Home() {
  const { items } = await listPublic({ page: 1, pageSize: 6 });
  return (
    <div className="space-y-12">
      <section className="card relative overflow-hidden bg-gradient-to-br from-white to-brand-soft p-8 md:p-14">
        <p className="text-sm font-medium text-brand">ЭРДЭНЭТ · БАЙР МЭДЭЭЛЭЛ · ЗАР · ГЭРЭЭ</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
          Танд тохирох байраа нэг дороос олоорой.
        </h1>
        <p className="mt-4 max-w-xl text-black/60">
          Эрдэнэт хотын байр, үл хөдлөх хөрөнгийн мэдээлэл, түрээс болон худалдааны саналыг нэг дороос.
        </p>
        <form action="/properties" className="mt-8 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-5">
          <input name="q" placeholder="Байрны нэр, хаяг" className="input md:col-span-2" />
          <select name="district" className="input" defaultValue="">
            <option value="">Хороолол</option>
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select name="deal" className="input" defaultValue="">
            <option value="">Түрээс / Худалдаа</option>
            <option value="rent">Түрээс</option>
            <option value="sale">Худалдаа</option>
          </select>
          <button className="btn-primary">Хайх</button>
        </form>
        <div className="mt-4 flex gap-3 text-sm">
          <Link href="/swipe" className="btn-primary">Байр сонгох (шудрах)</Link>
          <Link href="/map" className="btn-ghost">Газрын зураг дээр харах</Link>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold">Шинэ зарууд</h2>
          <Link href="/properties" className="text-sm font-medium text-brand hover:underline">Бүгдийг үзэх →</Link>
        </div>
        {items.length === 0 ? (
          <p className="card p-8 text-center text-black/60">Одоогоор идэвхтэй зар алга.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
