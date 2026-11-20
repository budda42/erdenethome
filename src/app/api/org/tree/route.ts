import { query } from "@/lib/db";
import { ok } from "@/lib/http";
import type { RowDataPacket } from "mysql2";

// Public org structure. Phone and e-mail stay private (staff-only endpoints).
export async function GET() {
  const departments = await query<RowDataPacket[]>(
    "SELECT id, parent_id, name, description, sort_order FROM departments ORDER BY sort_order, id");
  const employees = await query<RowDataPacket[]>(
    `SELECT id, department_id, full_name, position, duties FROM employees
      WHERE status = 'active' ORDER BY id`);
  return ok({ departments, employees });
}
