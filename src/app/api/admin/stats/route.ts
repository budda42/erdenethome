import { one } from "@/lib/db";
import { ok, fail } from "@/lib/http";
import { getCurrentUser, can } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user, "reports.read") && !can(user, "properties.read")) return fail("Эрх хүрэхгүй.", 403);
  const s = await one<RowDataPacket>(
    `SELECT
       (SELECT COUNT(*) FROM properties) AS total_properties,
       (SELECT COUNT(*) FROM property_ads WHERE status = 'active') AS active_ads,
       (SELECT COUNT(*) FROM property_ads WHERE status = 'active' AND deal_type = 'rent') AS rent_properties,
       (SELECT COUNT(*) FROM property_ads WHERE status = 'active' AND deal_type = 'sale') AS sale_properties,
       (SELECT COUNT(*) FROM contracts) AS contracts_total,
       (SELECT COUNT(*) FROM property_requests WHERE status = 'new') AS pending_requests,
       (SELECT COUNT(*) FROM contracts WHERE end_date IS NOT NULL AND end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND status IN ('approved','valid')) AS expiring_contracts,
       (SELECT COUNT(*) FROM users) AS users_total`);
  return ok(s);
}
