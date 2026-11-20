import { getOrgInfo } from "@/lib/org";
import { FacebookButton } from "@/components/FacebookButton";

export const metadata = { title: "Холбоо барих — ERDENET HOME" };

export default async function ContactPage() {
  const info = await getOrgInfo();
  const rows: [string, string, string | undefined][] = [
    ["📍", "Хаяг", info["org.address"]], ["📞", "Утас", info["org.phone"]],
    ["✉️", "И-мэйл", info["org.email"]], ["🕘", "Ажлын цаг", info["org.hours"]],
  ];
  return (
    <div className="card mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Холбоо барих</h1>
        <p className="text-sm text-black/60">Асуух зүйл байвал утсаар, и-мэйлээр эсвэл Facebook-ээр бидэнтэй холбогдоорой.</p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([icon, k, v]) => (
          <div key={k} className="rounded-xl bg-brand-soft/60 p-4">
            <dt className="text-sm text-black/50">{icon} {k}</dt>
            <dd className="mt-1 font-medium">
              {!v ? "—" : k === "Утас" ? <a href={`tel:${v.replace(/\s/g, "")}`} className="hover:text-brand">{v}</a>
                : k === "И-мэйл" ? <a href={`mailto:${v}`} className="hover:text-brand">{v}</a> : v}
            </dd>
          </div>
        ))}
      </dl>
      <FacebookButton href={info["org.facebook"]} className="w-full" />
      <p className="text-sm text-black/60">Байрны хуудсан дээрх &quot;Холбогдох хүсэлт&quot; маягтаар шууд хүсэлт илгээж болно.</p>
    </div>
  );
}
