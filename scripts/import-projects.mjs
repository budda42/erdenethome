// Usage: node --env-file=.env.local scripts/import-projects.mjs [path/to/projects.json]
// Creates or updates projects and their unit ads from a JSON file. Safe to re-run:
// units match on ad_number, projects without units match on name.
import { readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const file = path.resolve(process.argv[2] ?? "data/projects-2026-11.json");
const { projects } = JSON.parse(await readFile(file, "utf8"));

const conn = process.env.DATABASE_URL
  ? await mysql.createConnection(process.env.DATABASE_URL)
  : await mysql.createConnection({
      host: process.env.DB_HOST ?? "127.0.0.1", port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root", password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "erdenet_home",
    });

async function upsertProperty(p) {
  const [found] = await conn.execute("SELECT id FROM properties WHERE name = ? ORDER BY id LIMIT 1", [p.name]);
  if (found.length) {
    await conn.execute(
      "UPDATE properties SET property_type = ?, address = ?, district = ?, description = ? WHERE id = ?",
      [p.property_type, p.address, p.district ?? null, p.description ?? null, found[0].id],
    );
    return found[0].id;
  }
  const [res] = await conn.execute(
    "INSERT INTO properties (name, property_type, address, district, description) VALUES (?, ?, ?, ?, ?)",
    [p.name, p.property_type, p.address, p.district ?? null, p.description ?? null],
  );
  return res.insertId;
}

async function upsertUnit(propertyId, projectName, u) {
  const [existing] = await conn.execute("SELECT id, property_id FROM property_ads WHERE ad_number = ?", [u.ad_number]);
  if (existing.length) {
    await conn.execute("UPDATE properties SET rooms = ?, area_m2 = ? WHERE id = ?", [u.rooms, u.area_m2, existing[0].property_id]);
    await conn.execute("UPDATE property_ads SET price = ? WHERE id = ?", [u.price, existing[0].id]);
    return "updated";
  }
  // Each unit is its own property row so it can be filtered, saved and chatted about separately.
  const [unitProp] = await conn.execute(
    "INSERT INTO properties (name, property_type, address, district, rooms, area_m2, description) VALUES (?, 'Орон сууц', ?, NULL, ?, ?, ?)",
    [`${projectName} · ${u.rooms} өрөө ${u.area_m2} м²`, `${projectName}, Эрдэнэт хот`, u.rooms, u.area_m2, `${projectName} төслийн ${u.rooms} өрөө орон сууц.`],
  );
  await conn.execute(
    "INSERT INTO property_ads (ad_number, property_id, deal_type, price, status, published_at) VALUES (?, ?, 'sale', ?, 'active', NOW())",
    [u.ad_number, unitProp.insertId, u.price],
  );
  return "created";
}

for (const p of projects) {
  const propertyId = await upsertProperty(p);
  if (!p.units?.length) {
    console.log(`[төсөл] ${p.name}: мэдээлэл шинэчлэгдлээ (зар байхгүй)`);
    continue;
  }
  const results = [];
  for (const u of p.units) results.push(await upsertUnit(propertyId, p.name, u));
  const created = results.filter((r) => r === "created").length;
  console.log(`[төсөл] ${p.name}: ${p.units.length} зар (${created} шинэ, ${results.length - created} шинэчилсэн)`);
}

await conn.end();
