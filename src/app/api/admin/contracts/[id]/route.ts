import { one, exec, query } from "@/lib/db";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import { contractInputSchema, TRANSITIONS, type ContractStatus } from "@/lib/contracts";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "contracts.read")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  const c = await one<RowDataPacket>("SELECT * FROM contracts WHERE id = ?", [id.data]);
  if (!c) return fail("Олдсонгүй.", 404);
  const files = await query<RowDataPacket[]>(
    "SELECT id, file_url, original_name, size_bytes, uploaded_at FROM contract_files WHERE contract_id = ? ORDER BY uploaded_at DESC",
    [id.data]);
  const history = await query<RowDataPacket[]>(
    "SELECT action, meta, created_at, user_id FROM audit_logs WHERE entity = 'contract' AND entity_id = ? ORDER BY created_at DESC LIMIT 100",
    [String(id.data)]);
  return ok({ ...c, files, history });
}

export async function PUT(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "contracts.write")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  const body = await parseBody(req, contractInputSchema.extend({ status: z.enum(["drafting","reviewing","approved","valid","finished","cancelled"]).optional() }));
  if ("error" in body) return body.error;
  const d = body.data;

  const current = await one<RowDataPacket & { status: ContractStatus }>("SELECT status FROM contracts WHERE id = ?", [id.data]);
  if (!current) return fail("Олдсонгүй.", 404);

  // Status changes go through the transition table; approval needs its own permission.
  let statusSql = "";
  const statusParams: unknown[] = [];
  if (d.status && d.status !== current.status) {
    if (!TRANSITIONS[current.status].includes(d.status)) {
      return fail(`'${current.status}' төлөвөөс '${d.status}' руу шилжих боломжгүй.`, 409);
    }
    if (d.status === "approved" && !can(user, "contracts.approve")) return fail("Гэрээ баталгаажуулах эрх байхгүй.", 403);
    statusSql = ", status = ?" + (d.status === "approved" ? ", approved_by = ?, approved_at = NOW()" : "");
    statusParams.push(d.status);
    if (d.status === "approved") statusParams.push(user!.id);
  }

  await exec(
    `UPDATE contracts SET contract_number=?, contract_type=?, property_id=?, seller_party=?, buyer_party=?, signed_date=?,
       start_date=?, end_date=?, amount=?, payment_terms=?, responsible_employee_id=?${statusSql} WHERE id=?`,
    [d.contractNumber, d.contractType, d.propertyId, d.sellerParty, d.buyerParty, d.signedDate ?? null, d.startDate ?? null,
     d.endDate ?? null, d.amount, d.paymentTerms ?? null, d.responsibleEmployeeId ?? null, ...statusParams, id.data],
  );
  await audit(user!.id, "contract.update", "contract", id.data, { from: current.status, to: d.status ?? current.status });
  return ok({ id: id.data });
}
