import { one, exec } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getCurrentUser, audit } from "@/lib/auth";
import { phoneSchema } from "@/lib/validators";
import { notifyOwner } from "@/lib/notify";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";

const schema = z.object({
  propertyId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  message: z.string().trim().max(2000).optional(),
  // Honeypot: real visitors leave this empty, bots tend to fill it.
  website: z.string().max(0).optional(),
});

// Visitors can submit without an account. Basic spam guard: max 5 requests per phone per hour.
export async function POST(req: Request) {
  const body = await parseBody(req, schema);
  if ("error" in body) return body.error;
  const d = body.data;

  const recent = await one<RowDataPacket & { c: number }>(
    "SELECT COUNT(*) AS c FROM property_requests WHERE phone = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)",
    [d.phone],
  );
  if ((recent?.c ?? 0) >= 5) return fail("Хэт олон хүсэлт илгээсэн байна. Хэсэг хугацааны дараа дахин оролдоно уу.", 429);

  const visible = await one<RowDataPacket>(
    "SELECT p.id FROM properties p JOIN property_ads a ON a.property_id = p.id WHERE p.id = ? AND a.status IN ('active','reserved')",
    [d.propertyId],
  );
  if (!visible) return fail("Байр олдсонгүй.", 404);

  const user = await getCurrentUser();
  const res = await exec(
    "INSERT INTO property_requests (property_id, user_id, name, phone, message) VALUES (?,?,?,?,?)",
    [d.propertyId, user?.id ?? null, d.name, d.phone, d.message ?? null],
  );
  await audit(user?.id ?? null, "request.create", "property_request", res.insertId, { propertyId: d.propertyId });
  await notifyOwner(
    d.propertyId,
    "Таны зарт холбоо барих хүсэлт ирлээ",
    `Нэр: ${d.name}\nУтас: ${d.phone}${d.message ? `\nМессеж: ${d.message}` : ""}\nАдмин мөн холбогдоно.`,
    user?.id ?? null,
  );
  return ok({ id: res.insertId }, 201);
}
