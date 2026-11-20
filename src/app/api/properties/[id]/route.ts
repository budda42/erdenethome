import { query, one } from "@/lib/db";
import { ok, fail, idParam } from "@/lib/http";
import { getCurrentUser, can } from "@/lib/auth";
import { PUBLIC_AD_STATUSES, toNum } from "@/lib/properties";
import type { RowDataPacket } from "mysql2";

// Public detail page. Staff with properties.read can also see draft/unpublished ads.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = idParam.safeParse((await params).id);
  if (!parsed.success) return fail("Буруу ID.", 400);
  const user = await getCurrentUser();
  const staff = can(user, "properties.read");

  const row = await one<RowDataPacket>(
    `SELECT p.*, a.ad_number, a.deal_type, a.price, a.service_fee, a.status, a.published_at,
            l.latitude, l.longitude, e.full_name AS employee_name, e.phone AS employee_phone
       FROM properties p
       LEFT JOIN property_ads a ON a.property_id = p.id
       LEFT JOIN property_locations l ON l.property_id = p.id
       LEFT JOIN employees e ON e.id = p.assigned_employee_id
      WHERE p.id = ?`,
    [parsed.data],
  );
  if (!row) return fail("Байр олдсонгүй.", 404);
  const visible = (PUBLIC_AD_STATUSES as readonly string[]).includes(row.status);
  if (!visible && !staff) return fail("Байр олдсонгүй.", 404);

  const images = await query<RowDataPacket[]>(
    "SELECT id, file_url, media_type FROM property_images WHERE property_id = ? ORDER BY sort_order, id",
    [parsed.data],
  );

  return ok({
    id: row.id,
    name: row.name,
    propertyType: row.property_type,
    address: row.address,
    district: row.district,
    buildingNo: row.building_no,
    entrance: row.entrance,
    floor: row.floor,
    rooms: row.rooms,
    areaM2: toNum(row.area_m2),
    description: row.description,
    adNumber: row.ad_number,
    dealType: row.deal_type,
    price: toNum(row.price),
    serviceFee: toNum(row.service_fee),
    status: row.status,
    latitude: toNum(row.latitude),
    longitude: toNum(row.longitude),
    employee: row.employee_name ? { name: row.employee_name, phone: row.employee_phone } : null,
    images: images.map((i) => ({ id: i.id, url: i.file_url, type: i.media_type })),
  });
}
