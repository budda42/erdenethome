import { query, one, exec } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import { contractInputSchema } from "@/lib/contracts";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user, "contracts.read")) return fail("Эрх хүрэхгүй.", 403);
  const rows = await query<RowDataPacket[]>(
    `SELECT c.id, c.contract_number, c.contract_type, c.status, c.amount, c.start_date, c.end_date,
            p.name AS property_name, e.full_name AS employee_name
       FROM contracts c
       JOIN properties p ON p.id = c.property_id
       LEFT JOIN employees e ON e.id = c.responsible_employee_id
      ORDER BY c.id DESC LIMIT 300`);
  return ok({ items: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!can(user, "contracts.write")) return fail("Эрх хүрэхгүй.", 403);
  const body = await parseBody(req, contractInputSchema);
  if ("error" in body) return body.error;
  const d = body.data;

  if (!(await one<RowDataPacket>("SELECT id FROM properties WHERE id = ?", [d.propertyId]))) return fail("Байр олдсонгүй.", 404);
  if (await one<RowDataPacket>("SELECT id FROM contracts WHERE contract_number = ?", [d.contractNumber])) {
    return fail("Гэрээний дугаар давхцаж байна.", 409);
  }

  const res = await exec(
    `INSERT INTO contracts (contract_number, contract_type, property_id, seller_party, buyer_party, signed_date,
       start_date, end_date, amount, payment_terms, status, responsible_employee_id, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,'drafting',?,?)`,
    [d.contractNumber, d.contractType, d.propertyId, d.sellerParty, d.buyerParty, d.signedDate ?? null,
     d.startDate ?? null, d.endDate ?? null, d.amount, d.paymentTerms ?? null, d.responsibleEmployeeId ?? null, user!.id],
  );
  await audit(user!.id, "contract.create", "contract", res.insertId);
  return ok({ id: res.insertId }, 201);
}
