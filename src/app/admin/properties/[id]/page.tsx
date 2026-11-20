import { notFound } from "next/navigation";
import { one, query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { PropertyForm } from "@/components/PropertyForm";
import type { RowDataPacket } from "mysql2";

export default async function EditProperty({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requirePerm("properties.read");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const p = await one<RowDataPacket>(
    `SELECT p.*, a.deal_type, a.price, a.service_fee, a.status, l.latitude, l.longitude
       FROM properties p LEFT JOIN property_ads a ON a.property_id = p.id
       LEFT JOIN property_locations l ON l.property_id = p.id WHERE p.id = ?`, [id]);
  if (!p) notFound();
  const employees = await query<RowDataPacket[]>("SELECT id, full_name FROM employees WHERE status = 'active' ORDER BY full_name");
  const images = await query<RowDataPacket[]>("SELECT id, file_url, media_type FROM property_images WHERE property_id = ? ORDER BY sort_order, id", [id]);
  const created = (await searchParams).created;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{p.name}</h1>
        <p className="text-sm text-black/60">Зарын дугаар: {p.ad_number ?? "—"}</p>
        {created === "1" && <p className="mt-2 text-sm text-brand">Зар амжилттай үүслээ. Одоо зураг нэмэх боломжтой.</p>}
      </div>
      <PropertyForm
        id={id}
        employees={employees as never}
        images={images as never}
        init={{
          name: p.name, propertyType: p.property_type, address: p.address, district: p.district ?? "", buildingNo: p.building_no ?? "",
          entrance: p.entrance ?? "", floor: p.floor, rooms: p.rooms, areaM2: p.area_m2 === null ? null : Number(p.area_m2),
          description: p.description ?? "", latitude: p.latitude === null ? null : Number(p.latitude),
          longitude: p.longitude === null ? null : Number(p.longitude), assignedEmployeeId: p.assigned_employee_id,
          dealType: p.deal_type, price: p.price === null ? null : Number(p.price),
          serviceFee: p.service_fee === null ? null : Number(p.service_fee), status: p.status,
        }}
      />
    </div>
  );
}
