import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { one, query } from "@/lib/db";
import { fmtMnt } from "@/components/PropertyCard";
import { ProfileEditor } from "@/components/ProfileEditor";
import type { RowDataPacket } from "mysql2";

export const metadata = { title: "Миний хэсэг — ERDENET HOME" };

const REQUEST_STATUS: Record<string, { label: string; cls: string; hint: string }> = {
  new: { label: "Хүлээн авсан", cls: "bg-sky-50 text-sky-700", hint: "Ажилтан удахгүй холбогдоно" },
  contacted: { label: "Холбогдсон", cls: "bg-emerald-50 text-emerald-700", hint: "Ажилтан тантай холбогдсон" },
  closed: { label: "Хаагдсан", cls: "bg-black/5 text-black/60", hint: "Хүсэлт шийдвэрлэгдсэн" },
};

const LISTING_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Ноорог", cls: "bg-black/5 text-black/60" },
  under_review: { label: "Хянагдаж байна", cls: "bg-amber-50 text-amber-700" },
  active: { label: "Нийтэлсэн", cls: "bg-emerald-50 text-emerald-700" },
  reserved: { label: "Захиалгатай", cls: "bg-sky-50 text-sky-700" },
  contracted: { label: "Гэрээлсэн", cls: "bg-violet-50 text-violet-700" },
  closed: { label: "Хаагдсан", cls: "bg-black/5 text-black/60" },
};

const ROLE_MN: Record<string, string> = {
  super_admin: "Супер админ", admin: "Админ", manager: "Менежер", employee: "Ажилтан", customer: "Хэрэглэгч",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const [profile, counts, saved, listings, requests] = await Promise.all([
    one<RowDataPacket>("SELECT created_at FROM users WHERE id = ?", [user.id]),
    one<RowDataPacket>(
      `SELECT
         (SELECT COUNT(*) FROM saved_properties WHERE user_id = ?) AS saved,
         (SELECT COUNT(*) FROM properties WHERE created_by = ?) AS listings,
         (SELECT COUNT(*) FROM property_requests WHERE user_id = ?) AS requests,
         (SELECT COUNT(*) FROM property_chats WHERE user_id = ?) AS chats,
         (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0) AS unread,
         (SELECT COUNT(*) FROM contract_parties WHERE user_id = ? AND status = 'pending') AS pending_contracts`,
      [user.id, user.id, user.id, user.id, user.id, user.id]),
    query<RowDataPacket[]>(
      `SELECT p.id, p.name, p.district, p.rooms, p.area_m2, a.price, a.deal_type, a.status,
              (SELECT i.file_url FROM property_images i WHERE i.property_id = p.id AND i.media_type = 'image'
                 ORDER BY i.sort_order, i.id LIMIT 1) AS cover_url
         FROM saved_properties s
         JOIN properties p ON p.id = s.property_id LEFT JOIN property_ads a ON a.property_id = p.id
        WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 12`, [user.id]),
    query<RowDataPacket[]>(
      `SELECT p.id, p.name, a.price, a.deal_type, a.status FROM properties p
         JOIN property_ads a ON a.property_id = p.id
        WHERE p.created_by = ? ORDER BY p.id DESC LIMIT 3`, [user.id]),
    query<RowDataPacket[]>(
      `SELECT r.id, r.status, r.created_at, p.id AS property_id, p.name FROM property_requests r
         JOIN properties p ON p.id = r.property_id WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 10`, [user.id]),
  ]);

  const n = (k: string) => Number(counts?.[k] ?? 0);
  const initials = user.fullName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const since = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("mn-MN") : null;

  const stats = [
    { label: "Хадгалсан байр", value: n("saved"), href: "#saved", icon: "❤️" },
    { label: "Миний зар", value: n("listings"), href: "/my/listings", icon: "🏠" },
    { label: "Хүсэлт", value: n("requests"), href: "#requests", icon: "📨" },
    { label: "Чат", value: n("chats"), href: "/chat", icon: "💬" },
  ];

  const actions = [
    { href: "/my/listings", icon: "➕", title: "Зар оруулах", desc: "Байраа зарах, түрээслэх" },
    { href: "/swipe", icon: "👆", title: "Байр сонгох", desc: "Шудраад тохирохоо ол" },
    { href: "/map", icon: "🗺️", title: "Газрын зураг", desc: "Ойр орчмын байрууд" },
    { href: "/properties", icon: "🔎", title: "Байр хайх", desc: "Шүүлтүүрээр хайх" },
  ];

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <section className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand to-emerald-400" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-10 flex items-end gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-brand-soft text-2xl font-bold text-brand shadow-sm">
              {initials || "?"}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold">Сайн байна уу, {user.fullName}</h1>
              <p className="text-sm text-black/60">
                {[user.email, user.phone].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-brand-soft px-2 py-0.5 font-medium text-brand">{ROLE_MN[user.role] ?? user.role}</span>
                {since && <span className="rounded-full bg-black/5 px-2 py-0.5 text-black/60">Бүртгүүлсэн: {since}</span>}
              </p>
            </div>
          </div>
          <ProfileEditor fullName={user.fullName} email={user.email} phone={user.phone} />
        </div>
      </section>

      {/* Attention items */}
      {(n("pending_contracts") > 0 || n("unread") > 0) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {n("pending_contracts") > 0 && (
            <Link href="/chat" className="card flex items-center gap-3 border-l-4 border-l-violet-500 p-4 hover:shadow-md">
              <span className="text-2xl">📝</span>
              <div><p className="font-semibold">Танд {n("pending_contracts")} гэрээ ирсэн байна</p><p className="text-sm text-black/60">Чат руу орж шалгаад зөвшөөрнө үү →</p></div>
            </Link>
          )}
          {n("unread") > 0 && (
            <Link href="/my/listings" className="card flex items-center gap-3 border-l-4 border-l-red-500 p-4 hover:shadow-md">
              <span className="text-2xl">🔔</span>
              <div><p className="font-semibold">{n("unread")} уншаагүй мэдэгдэл</p><p className="text-sm text-black/60">Мэдэгдлээ харах →</p></div>
            </Link>
          )}
        </section>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-black/60">{s.icon} {s.label}</p>
            <p className="mt-1 text-3xl font-bold text-brand">{s.value}</p>
          </Link>
        ))}
      </section>

      {/* Quick actions */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Түргэн үйлдэл</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="card flex items-center gap-3 p-4 hover:bg-brand-soft/50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-lg">{a.icon}</span>
              <span><span className="block font-medium">{a.title}</span><span className="block text-xs text-black/60">{a.desc}</span></span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Saved properties */}
        <section id="saved" className="scroll-mt-24 space-y-3 lg:col-span-2">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold">Хадгалсан байрнууд</h2>
            {n("saved") > saved.length && <span className="text-xs text-black/50">Сүүлийн {saved.length}</span>}
          </div>
          {saved.length === 0 ? (
            <div className="card p-8 text-center text-sm text-black/60">
              Одоогоор хадгалсан байр алга. Байрны хуудсан дээрх ❤️ товчоор хадгална.
              <div className="mt-3"><Link href="/properties" className="btn-primary">Байр хайх</Link></div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {saved.map((s) => (
                <Link key={s.id} href={`/properties/${s.id}`} className="card flex gap-3 overflow-hidden p-2 hover:shadow-md">
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-brand-soft">
                    {s.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={s.cover_url} alt="" className="h-full w-full object-cover" />
                      : <div className="flex h-full items-center justify-center text-2xl">🏢</div>}
                  </div>
                  <div className="min-w-0 flex-1 py-1 pr-2">
                    <p className="line-clamp-1 font-medium">{s.name}</p>
                    <p className="line-clamp-1 text-xs text-black/60">
                      {[s.district, s.rooms != null ? `${s.rooms} өрөө` : null, s.area_m2 ? `${Number(s.area_m2)} м²` : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="font-bold text-brand">{fmtMnt(s.price != null ? Number(s.price) : null)}</span>
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand">{s.deal_type === "rent" ? "Түрээс" : "Худалдаа"}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-8">
          {/* My listings */}
          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-semibold">Миний зар</h2>
              <Link href="/my/listings" className="text-sm text-brand hover:underline">Бүгд →</Link>
            </div>
            {listings.length === 0 ? (
              <Link href="/my/listings" className="card block p-5 text-center text-sm text-black/60 hover:shadow-md">
                Та зар оруулаагүй байна. <span className="font-medium text-brand">Эхний зараа оруулах →</span>
              </Link>
            ) : (
              <ul className="card divide-y divide-black/5">
                {listings.map((l) => {
                  const st = LISTING_STATUS[l.status] ?? { label: l.status, cls: "bg-black/5" };
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                      <span className="min-w-0"><span className="block truncate font-medium">{l.name}</span>
                        <span className="text-xs text-black/60">{fmtMnt(Number(l.price))}</span></span>
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Requests */}
          <section id="requests" className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold">Миний хүсэлтүүд</h2>
            {requests.length === 0 ? (
              <p className="card p-5 text-center text-sm text-black/60">Хүсэлт илгээгээгүй байна. Байрны хуудаснаас &quot;Холбогдох хүсэлт&quot; илгээнэ.</p>
            ) : (
              <ol className="card space-y-0 p-2">
                {requests.map((r) => {
                  const st = REQUEST_STATUS[r.status] ?? { label: r.status, cls: "bg-black/5", hint: "" };
                  return (
                    <li key={r.id}>
                      <Link href={`/properties/${r.property_id}`} className="flex items-start justify-between gap-2 rounded-xl p-3 text-sm hover:bg-brand-soft/50">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{r.name}</span>
                          <span className="text-xs text-black/50">{new Date(r.created_at).toLocaleDateString("mn-MN")} · {st.hint}</span>
                        </span>
                        <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
