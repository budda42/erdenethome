import { query, one } from "@/lib/db";
import { PUBLIC_AD_STATUSES, toNum, type PublicFilter } from "@/lib/properties";
import type { RowDataPacket } from "mysql2";

export type PublicListing = {
  id: number; name: string; propertyType: string; address: string; district: string | null;
  rooms: number | null; floor: number | null; areaM2: number | null; adNumber: string;
  dealType: "rent" | "sale"; price: number | null; serviceFee: number | null; status: string;
  latitude: number | null; longitude: number | null; coverUrl: string | null;
};

/** Shared by the public API, the home page, the listing page and the map. */
export async function listPublic(f: PublicFilter): Promise<{ total: number; items: PublicListing[] }> {
  const where: string[] = [`a.status IN (${PUBLIC_AD_STATUSES.map(() => "?").join(",")})`];
  const params: unknown[] = [...PUBLIC_AD_STATUSES];

  if (f.q) { where.push("(p.name LIKE ? OR p.address LIKE ? OR p.district LIKE ?)"); params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`); }
  if (f.district) { where.push("p.district = ?"); params.push(f.district); }
  if (f.rooms !== undefined) { where.push("p.rooms = ?"); params.push(f.rooms); }
  if (f.deal) { where.push("a.deal_type = ?"); params.push(f.deal); }
  if (f.minPrice !== undefined) { where.push("a.price >= ?"); params.push(f.minPrice); }
  if (f.maxPrice !== undefined) { where.push("a.price <= ?"); params.push(f.maxPrice); }
  const whereSql = where.join(" AND ");

  const total = await one<RowDataPacket & { c: number }>(
    `SELECT COUNT(*) AS c FROM property_ads a JOIN properties p ON p.id = a.property_id WHERE ${whereSql}`, params);
  const rows = await query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.property_type, p.address, p.district, p.rooms, p.floor, p.area_m2,
            a.ad_number, a.deal_type, a.price, a.service_fee, a.status, l.latitude, l.longitude,
            (SELECT i.file_url FROM property_images i WHERE i.property_id = p.id AND i.media_type = 'image'
               ORDER BY i.sort_order, i.id LIMIT 1) AS cover_url
       FROM property_ads a
       JOIN properties p ON p.id = a.property_id
       LEFT JOIN property_locations l ON l.property_id = p.id
      WHERE ${whereSql}
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT ? OFFSET ?`,
    [...params, f.pageSize, (f.page - 1) * f.pageSize]);

  return {
    total: total?.c ?? 0,
    items: rows.map((r) => ({
      id: r.id, name: r.name, propertyType: r.property_type, address: r.address, district: r.district,
      rooms: r.rooms, floor: r.floor, areaM2: toNum(r.area_m2), adNumber: r.ad_number,
      dealType: r.deal_type, price: toNum(r.price), serviceFee: toNum(r.service_fee), status: r.status,
      latitude: toNum(r.latitude), longitude: toNum(r.longitude), coverUrl: r.cover_url,
    })),
  };
}

/**
 * The signed-in user's own listings that are not public yet (e.g. "under_review"), with a
 * location. The map shows them only to their owner, so a new ad appears right after posting.
 */
export async function listMineForMap(userId: number): Promise<PublicListing[]> {
  const rows = await query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.property_type, p.address, p.district, p.rooms, p.floor, p.area_m2,
            a.ad_number, a.deal_type, a.price, a.service_fee, a.status, l.latitude, l.longitude,
            (SELECT i.file_url FROM property_images i WHERE i.property_id = p.id AND i.media_type = 'image'
               ORDER BY i.sort_order, i.id LIMIT 1) AS cover_url
       FROM properties p
       JOIN property_ads a ON a.property_id = p.id
       JOIN property_locations l ON l.property_id = p.id
      WHERE p.created_by = ? AND a.status IN ('draft', 'under_review')
      ORDER BY p.id DESC LIMIT 50`,
    [userId]);
  return rows.map((r) => ({
    id: r.id, name: r.name, propertyType: r.property_type, address: r.address, district: r.district,
    rooms: r.rooms, floor: r.floor, areaM2: toNum(r.area_m2), adNumber: r.ad_number,
    dealType: r.deal_type, price: toNum(r.price), serviceFee: toNum(r.service_fee), status: r.status,
    latitude: toNum(r.latitude), longitude: toNum(r.longitude), coverUrl: r.cover_url,
  }));
}
