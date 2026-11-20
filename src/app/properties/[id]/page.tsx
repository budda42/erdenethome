import Link from "next/link";
import { notFound } from "next/navigation";
import { one, query } from "@/lib/db";
import { getCurrentUser, can } from "@/lib/auth";
import { PUBLIC_AD_STATUSES } from "@/lib/properties";
import { fmtMnt } from "@/components/PropertyCard";
import { RequestForm } from "@/components/RequestForm";
import { SaveButton } from "@/components/SaveButton";
import { PropertyLocationMap } from "@/components/PropertyLocationMap";
import type { RowDataPacket } from "mysql2";

export default async function PropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const user = await getCurrentUser();
  const staff = can(user, "properties.read");

  const p = await one<RowDataPacket>(
    `SELECT p.*, a.ad_number, a.deal_type, a.price, a.service_fee, a.status,
            l.latitude, l.longitude, e.full_name AS employee_name, e.phone AS employee_phone
       FROM properties p
       LEFT JOIN property_ads a ON a.property_id = p.id
       LEFT JOIN property_locations l ON l.property_id = p.id
       LEFT JOIN employees e ON e.id = p.assigned_employee_id
      WHERE p.id = ?`, [id]);
  if (!p) notFound();
  const owner = !!user && p.created_by === user.id;
  const isPublic = (PUBLIC_AD_STATUSES as readonly string[]).includes(p.status);
  // Non-public ads (e.g. under review) are visible to staff and to the person who posted them.
  if (!isPublic && !staff && !owner) notFound();

  const images = await query<RowDataPacket[]>(
    "SELECT id, file_url, media_type FROM property_images WHERE property_id = ? ORDER BY sort_order, id", [id]);
  const saved = user ? await one<RowDataPacket>("SELECT 1 FROM saved_properties WHERE user_id = ? AND property_id = ?", [user.id, id]) : null;

  const spec = [
    ["Төрөл", p.property_type], ["Хаяг", p.address], ["Хороолол", p.district], ["Байрны дугаар", p.building_no],
    ["Орц", p.entrance], ["Давхар", p.floor], ["Өрөө", p.rooms], ["Талбай", p.area_m2 ? `${p.area_m2} м²` : null],
    ["Ашиглалтын төлбөр", p.service_fee ? fmtMnt(Number(p.service_fee)) : null], ["Зарын дугаар", p.ad_number],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card overflow-hidden">
          {images.length ? (
            <div className="grid gap-1 md:grid-cols-2">
              {images.map((img) => img.media_type === "video" ? (
                <video key={img.id} src={img.file_url} controls className="aspect-video w-full bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.file_url} alt={p.name} className="aspect-[4/3] w-full object-cover" />
              ))}
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-brand-soft text-brand/60">Зураг оруулаагүй</div>
          )}
        </div>

        <div className="card space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{p.name}</h1>
              <p className="text-black/60">{p.address}</p>
            </div>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand">
              {p.deal_type === "rent" ? "Түрээс" : "Худалдаа"}
            </span>
          </div>
          <p className="text-3xl font-bold text-brand">{fmtMnt(p.price ? Number(p.price) : null)}</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
            {spec.map(([k, v]) => (
              <div key={String(k)}><dt className="text-black/50">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
            ))}
          </dl>
          {p.description && <p className="whitespace-pre-line leading-relaxed text-black/80">{p.description}</p>}
          {!isPublic && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Энэ зар админы хяналтад байна — баталгаажмагц бусдад харагдана.
            </p>
          )}
        </div>

        {p.latitude != null && p.longitude != null && (
          <div className="card space-y-3 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Байршил</h2>
              <a className="text-sm font-medium text-brand hover:underline" target="_blank" rel="noopener noreferrer"
                 href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=17/${p.latitude}/${p.longitude}`}>
                OpenStreetMap дээр нээх ↗
              </a>
            </div>
            <PropertyLocationMap lat={Number(p.latitude)} lng={Number(p.longitude)} />
          </div>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-3 p-5">
          <p className="text-sm font-medium">Төлөв: {p.status === "reserved" ? "Захиалгатай" : p.status === "active" ? "Боломжтой" : p.status === "under_review" ? "Хянагдаж байна" : p.status}</p>
          <SaveButton propertyId={id} loggedIn={!!user} initiallySaved={!!saved} />
          {p.employee_name && (
            <p className="text-sm text-black/70">Холбоо барих: {p.employee_name}{p.employee_phone ? ` · ${p.employee_phone}` : ""}</p>
          )}
          <Link href={p.latitude != null ? `/map?focus=${id}` : "/map"} className="block text-center text-sm text-brand hover:underline">Газрын зураг дээр харах</Link>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold">Холбогдох хүсэлт</h2>
          <RequestForm propertyId={id} defaultName={user?.fullName} />
        </div>
      </aside>
    </div>
  );
}
