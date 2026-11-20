import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { PropertyForm } from "@/components/PropertyForm";
import type { RowDataPacket } from "mysql2";

export default async function NewProperty() {
  await requirePerm("properties.write");
  const employees = await query<RowDataPacket[]>("SELECT id, full_name FROM employees WHERE status = 'active' ORDER BY full_name");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Шинэ байрны зар</h1>
      <PropertyForm init={{ dealType: "rent", status: "draft" }} employees={employees as never} images={[]} />
    </div>
  );
}
