import Link from "next/link";
import { query, one } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrgInfo } from "@/lib/org";
import { FacebookButton } from "@/components/FacebookButton";
import type { RowDataPacket } from "mysql2";

export const metadata = { title: "Байгууллагын тухай — ERDENET HOME" };

type Dept = RowDataPacket & { id: number; parent_id: number | null; name: string; description: string | null };
type Emp = RowDataPacket & { id: number; department_id: number | null; full_name: string; position: string | null; duties: string | null };

const FEATURES = [
  { icon: "🗺️", title: "Газрын зураг дээр хайх", text: "Байр бүрийн байршлыг газрын зураг дээр харж, сургууль, ажлын газартаа ойрыг нь сонгоорой." },
  { icon: "👆", title: "Шудраад сонгох", text: "Таалагдсан байраа баруун тийш шудраад хадгална — хэдхэн минутад богино жагсаалттай болно." },
  { icon: "✅", title: "Шалгагдсан зар", text: "Зар бүрийг манай ажилтан хянаж баталгаажуулсны дараа нийтэлдэг тул хуурамч зар байхгүй." },
  { icon: "💬", title: "Шууд чат", text: "Сонирхсон байрныхаа талаар хариуцсан ажилтантай сайтаар дамжуулан шууд харилцана." },
  { icon: "📝", title: "Онлайн гэрээ", text: "Гэрээний төслийг чатаар хүлээн авч, уншаад нэг товчоор зөвшөөрнө." },
  { icon: "🏠", title: "Үнэгүй зар оруулах", text: "Байраа зарах, түрээслэх бол бүртгүүлээд зараа байршилтай нь хэдхэн алхмаар оруулна." },
];

const STEPS = [
  { title: "Хайх", text: "Хороолол, үнэ, өрөөний тоогоор шүүх эсвэл газрын зургаас сонгоно." },
  { title: "Холбогдох", text: "Хүсэлт илгээх эсвэл чатаар ажилтантай ярилцаж, байраа үзэх цагаа товлоно." },
  { title: "Гэрээ байгуулах", text: "Гэрээгээ онлайнаар хүлээн авч баталгаажуулна. Бүх зүйл нэг дор." },
];

const FAQ = [
  ["Сайт ашиглах төлбөртэй юу?", "Байр хайх, хадгалах, хүсэлт илгээх, зар оруулах нь үнэгүй."],
  ["Миний оруулсан зар хэзээ нийтлэгдэх вэ?", "Зарыг манай ажилтан хянаж баталгаажуулмагц нийтлэгдэнэ. Хянагдаж байх хугацаанд та өөрийн зараа газрын зураг дээр харж болно."],
  ["Байрыг очиж үзэж болох уу?", "Тийм. Байрны хуудаснаас хүсэлт илгээх эсвэл чатаар холбогдож үзэх цагаа товлоорой."],
  ["Гэрээг хэрхэн байгуулах вэ?", "Ажилтан гэрээний төслийг чатаар илгээнэ. Та уншаад зөвшөөрөхөд гэрээ баталгаажих шатанд шилжинэ."],
];

export default async function AboutPage() {
  const [info, user, depts, emps, stats] = await Promise.all([
    getOrgInfo(),
    getCurrentUser(),
    query<Dept[]>("SELECT id, parent_id, name, description FROM departments ORDER BY sort_order, id"),
    query<Emp[]>("SELECT id, department_id, full_name, position, duties FROM employees WHERE status = 'active' ORDER BY id"),
    one<RowDataPacket>(
      `SELECT
         (SELECT COUNT(*) FROM property_ads WHERE status IN ('active','reserved')) AS listings,
         (SELECT COUNT(DISTINCT p.district) FROM properties p JOIN property_ads a ON a.property_id = p.id
           WHERE a.status IN ('active','reserved') AND p.district IS NOT NULL) AS districts,
         (SELECT COUNT(*) FROM contracts WHERE status IN ('approved','valid','finished')) AS contracts,
         (SELECT COUNT(*) FROM users WHERE status = 'active') AS users`),
  ]);

  // Only show figures that are worth showing; an empty "0" doesn't attract anyone.
  const figures = [
    { value: Number(stats?.listings ?? 0), label: "идэвхтэй зар" },
    { value: Number(stats?.districts ?? 0), label: "хороололд" },
    { value: Number(stats?.contracts ?? 0), label: "байгуулсан гэрээ" },
    { value: Number(stats?.users ?? 0), label: "бүртгэлтэй хэрэглэгч" },
  ].filter((f) => f.value > 0);

  const children = (pid: number | null) => depts.filter((d) => d.parent_id === pid);
  const empsOf = (did: number) => emps.filter((e) => e.department_id === did);

  function Tree({ parent, level }: { parent: number | null; level: number }) {
    return (
      <ul className={level ? "ml-6 mt-2 space-y-2 border-l border-brand/20 pl-4" : "space-y-3"}>
        {children(parent).map((d) => (
          <li key={d.id}>
            <details open={level === 0} className="rounded-xl bg-white p-4 shadow-sm">
              <summary className="cursor-pointer font-medium text-brand">{d.name}</summary>
              {d.description && <p className="mt-2 text-sm text-black/70">{d.description}</p>}
              {empsOf(d.id).length > 0 && (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {empsOf(d.id).map((e) => (
                    <li key={e.id} className="flex gap-3 rounded-lg bg-brand-soft/60 p-3 text-sm">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-brand">
                        {e.full_name.trim()[0]?.toUpperCase()}
                      </span>
                      <span>
                        <span className="block font-medium">{e.full_name}</span>
                        <span className="block text-black/60">{e.position}</span>
                        {e.duties && <span className="mt-1 block text-xs text-black/60">{e.duties}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Tree parent={d.id} level={level + 1} />
            </details>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="card relative overflow-hidden bg-gradient-to-br from-brand to-emerald-500 p-8 text-white md:p-14">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-white/10" />
        <p className="relative text-sm font-medium uppercase tracking-wider text-white/80">ERDENET HOME · Бидний тухай</p>
        <h1 className="relative mt-3 max-w-2xl text-3xl font-bold leading-tight md:text-5xl">
          Эрдэнэтэд байр хайх хамгийн хялбар арга.
        </h1>
        <p className="relative mt-4 max-w-xl text-white/85">
          Шалгагдсан зар, газрын зураг, шууд чат, онлайн гэрээ — байраа олохоос гэрээ байгуулах хүртэлх бүх алхам нэг дор.
        </p>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Link href="/properties" className="inline-flex items-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-brand hover:bg-brand-soft">Байр хайх</Link>
          <Link href={user ? "/my/listings" : "/register"} className="inline-flex items-center rounded-xl border border-white/60 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
            {user ? "Зар оруулах" : "Үнэгүй бүртгүүлэх"}
          </Link>
        </div>
        {figures.length > 0 && (
          <dl className="relative mt-10 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
            {figures.map((f) => (
              <div key={f.label} className="rounded-2xl bg-white/15 p-4 backdrop-blur">
                <dt className="text-3xl font-bold">{f.value.toLocaleString("en-US")}</dt>
                <dd className="text-sm text-white/80">{f.label}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Why us */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Яагаад ERDENET HOME гэж?</h2>
          <p className="mt-1 text-black/60">Байр хайхад цаг, мөнгө, мэдрэлээ хэмнэ.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-2xl">{f.icon}</span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-black/70">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="card space-y-6 p-8">
        <h2 className="text-center text-2xl font-bold">Хэрхэн ажилладаг вэ?</h2>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-black/70">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Organisation texts managed in /admin/settings */}
      {(info["org.about"] || info["org.mission"] || info["org.activities"]) && (
        <section className="grid gap-4 md:grid-cols-3">
          {info["org.about"] && (
            <div className="card p-6 md:col-span-3">
              <h2 className="text-xl font-bold">Танилцуулга</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-black/80">{info["org.about"]}</p>
            </div>
          )}
          {info["org.mission"] && (
            <div className="card border-t-4 border-t-brand p-6 md:col-span-1">
              <h2 className="font-semibold">🎯 Эрхэм зорилго</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-black/80">{info["org.mission"]}</p>
            </div>
          )}
          {info["org.activities"] && (
            <div className={`card border-t-4 border-t-brand p-6 ${info["org.mission"] ? "md:col-span-2" : "md:col-span-3"}`}>
              <h2 className="font-semibold">🧭 Үйл ажиллагааны чиглэл</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-black/80">{info["org.activities"]}</p>
            </div>
          )}
        </section>
      )}

      {/* Team */}
      {depts.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Манай баг</h2>
            <p className="text-black/60">Танд туслахад бэлэн мэргэжлийн хамт олон.</p>
          </div>
          <Tree parent={null} level={0} />
        </section>
      )}

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Түгээмэл асуулт</h2>
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {q}<span className="text-brand transition group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-black/70">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card flex flex-col items-center gap-4 bg-brand-soft p-8 text-center md:p-12">
        <h2 className="text-2xl font-bold">Асуух зүйл байна уу?</h2>
        <p className="max-w-lg text-black/70">
          Facebook хуудсаар маань шинэ зар, мэдээллийг хамгийн түрүүнд аваарай, эсвэл бидэнтэй шууд холбогдоорой.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <FacebookButton href={info["org.facebook"]} />
          <Link href="/contact" className="btn-ghost">Холбоо барих</Link>
          {info["org.phone"] && <a href={`tel:${info["org.phone"].replace(/\s/g, "")}`} className="btn-primary">📞 {info["org.phone"]}</a>}
        </div>
      </section>
    </div>
  );
}
