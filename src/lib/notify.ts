import { exec, one } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// Tells the owner of a customer-posted listing that someone contacted them about it.
// Only customer-owned listings notify; staff-created listings are handled by admins.
// Never throws, so a notification failure does not break the request itself.
export async function notifyOwner(propertyId: number, title: string, body: string, actorId: number | null) {
  try {
    const owner = await one<RowDataPacket>(
      `SELECT p.created_by AS owner_id
         FROM properties p JOIN users u ON u.id = p.created_by JOIN roles r ON r.id = u.role_id
        WHERE p.id = ? AND r.code = 'customer'`,
      [propertyId],
    );
    if (!owner?.owner_id || owner.owner_id === actorId) return;
    await exec("INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)", [owner.owner_id, title, body.slice(0, 2000)]);
  } catch (err) {
    console.error("owner notify failed", err);
  }
}
