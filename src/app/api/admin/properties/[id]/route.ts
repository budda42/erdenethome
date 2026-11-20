import { exec, one, withTx } from "@/lib/db";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import { propertyInputSchema } from "@/lib/properties";
import type { RowDataPacket } from "mysql2";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "properties.read")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  const row = await one<RowDataPacket>(
    `SELECT p.*, a.ad_number, a.deal_type, a.price, a.service_fee, a.status, l.latitude, l.longitude
       FROM properties p LEFT JOIN property_ads a ON a.property_id = p.id
       LEFT JOIN property_locations l ON l.property_id = p.id WHERE p.id = ?`,
    [id.data],
  );
  return row ? ok(row) : fail("Олдсонгүй.", 404);
}

export async function PUT(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "properties.write")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  const body = await parseBody(req, propertyInputSchema);
  if ("error" in body) return body.error;
  const d = body.data;

  const exists = await one<RowDataPacket>("SELECT id FROM properties WHERE id = ?", [id.data]);
  if (!exists) return fail("Олдсонгүй.", 404);

  await withTx(async (conn) => {
    await conn.execute(
      `UPDATE properties SET name=?, property_type=?, address=?, district=?, building_no=?, entrance=?, floor=?,
              rooms=?, area_m2=?, description=?, assigned_employee_id=? WHERE id=?`,
      [d.name, d.propertyType, d.address, d.district ?? null, d.buildingNo ?? null, d.entrance ?? null, d.floor ?? null,
       d.rooms ?? null, d.areaM2 ?? null, d.description ?? null, d.assignedEmployeeId ?? null, id.data],
    );
    if (d.latitude != null && d.longitude != null) {
      await conn.execute(
        `INSERT INTO property_locations (property_id, latitude, longitude) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude)`,
        [id.data, d.latitude, d.longitude],
      );
    } else {
      // Location cleared in the form → remove the pin from the map.
      await conn.execute("DELETE FROM property_locations WHERE property_id = ?", [id.data]);
    }
    await conn.execute(
      `UPDATE property_ads SET deal_type=?, price=?, service_fee=?, status=?,
              published_at = CASE WHEN ? = 'active' AND published_at IS NULL THEN NOW() ELSE published_at END
        WHERE property_id = ?`,
      [d.ad.dealType, d.ad.price, d.ad.serviceFee ?? null, d.ad.status, d.ad.status, id.data],
    );
  });

  await audit(user!.id, "property.update", "property", id.data);
  return ok({ id: id.data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "properties.write")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);

  const contract = await one<RowDataPacket>("SELECT id FROM contracts WHERE property_id = ? LIMIT 1", [id.data]);
  if (contract) return fail("Гэрээтэй байрыг устгах боломжгүй. Зарыг 'Хаагдсан' төлөвт шилжүүлнэ үү.", 409);

  await exec("DELETE FROM properties WHERE id = ?", [id.data]);
  await audit(user!.id, "property.delete", "property", id.data);
  return ok();
}

