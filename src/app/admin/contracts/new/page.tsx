import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { ContractForm } from "@/components/ContractForm";
import type { RowDataPacket } from "mysql2";

export default async function NewContract() {
  await requirePerm("contracts.write");
  const properties = await query<RowDataPacket[]>("SELECT id, name FROM properties ORDER BY name");
  const employees = await query<RowDataPacket[]>("SELECT id, full_name FROM employees WHERE status='active' ORDER BY full_name");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Шинэ гэрээ</h1>
      <ContractForm canWrite canApprove={false} files={[]} properties={properties as never} employees={employees as never}
        init={{ contractNumber: "", contractType: "rent", propertyId: null, sellerParty: "", buyerParty: "", signedDate: "", startDate: "", endDate: "", amount: 0, paymentTerms: "", responsibleEmployeeId: null, status: "drafting" }} />
    </div>
  );
}
