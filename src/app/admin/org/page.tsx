import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { OrgEditor } from "@/components/OrgEditor";
import type { RowDataPacket } from "mysql2";

export default async function OrgPage() {
  await requirePerm("org.manage");
  const depts = await query<RowDataPacket[]>("SELECT id, name, parent_id, description, sort_order FROM departments ORDER BY sort_order, id");
  const emps = await query<RowDataPacket[]>("SELECT id, full_name, department_id, position, phone, email, duties, status FROM employees ORDER BY id DESC");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Байгууллагын бүтэц & ажилтан</h1>
      <OrgEditor depts={depts as never} emps={emps as never} />
    </div>
  );
}
