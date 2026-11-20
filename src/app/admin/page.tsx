import Link from "next/link";
import { one } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await getCurrentUser();
  const denied = (await searchParams).denied;
  const s = await one<RowDataPacket>(
    `SELECT
       (SELECT COUNT(*) FROM properties) AS total_properties,
       (SELECT COUNT(*) FROM property_ads WHERE status = 'active') AS active_ads,
       (SELECT COUNT(*) FROM property_ads WHERE status = 'active' AND deal_type = 'rent') AS rent_ads,
       (SELECT COUNT(*) FROM property_ads WHERE status = 'active' AND deal_type = 'sale') AS sale_ads,
       (SELECT COUNT(*) FROM contracts) AS contracts_total,
       (SELECT COUNT(*) FROM property_requests WHERE status = 'new') AS pending_requests,
       (SELECT COUNT(*) FROM contracts WHERE end_date IS NOT NULL AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND status IN ('approved','valid')) AS expiring,
       (SELECT COUNT(*) FROM users) AS users_total`);

  const cards: [string, number | string, string][] = [
    ["Нийт байр", s?.total_properties ?? 0, "/admin/properties"],
    ["Идэвхтэй зар", s?.active_ads ?? 0, "/admin/properties"],
    ["Түрээсийн байр", s?.rent_ads ?? 0, "/admin/properties"],
    ["Худалдах байр", s?.sale_ads ?? 0, "/admin/properties"],
    ["Гэрээний тоо", s?.contracts_total ?? 0, "/admin/contracts"],
    ["Хүлээгдэж буй хүсэлт", s?.pending_requests ?? 0, "/admin/requests"],
    ["30 хоногт дуусах гэрээ", s?.expiring ?? 0, "/admin/contracts"],
    ["Хэрэглэгч", s?.users_total ?? 0, "/admin/users"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Удирдлагын самбар</h1>
        <p className="text-sm text-black/60">Сайн байна уу, {user?.fullName}</p>
      </div>
      {denied && <p className="card p-4 text-sm text-red-600">Таны эрх энэ хэсэгт хүрэхгүй.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, href]) => (
          <Link key={label} href={can(user, "properties.read") ? href : "/admin"} className="card p-5 hover:shadow-md">
            <p className="text-sm text-black/60">{label}</p>
            <p className="mt-2 text-3xl font-bold text-brand">{String(value)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
