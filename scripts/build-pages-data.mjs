// Usage: node scripts/build-pages-data.mjs
// Writes site/data/listings.json for the static GitHub Pages site (site/) from data/projects-*.json.
// The static site shows this file only when the live app (EH_CONFIG.appUrl) can't be reached.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const { projects } = JSON.parse(await readFile("data/projects-2026-11.json", "utf8"));

const listings = [];
const showcase = [];
for (const p of projects) {
  if (!p.units?.length) {
    showcase.push({ name: p.name, address: p.address, description: p.description ?? "" });
    continue;
  }
  for (const u of p.units) {
    listings.push({
      id: u.ad_number,
      name: `${p.name} · ${u.rooms} өрөө ${u.area_m2} м²`,
      project: p.name,
      address: p.address,
      district: p.district ?? null,
      rooms: u.rooms,
      areaM2: u.area_m2,
      price: u.price,
      dealType: "sale",
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      coverUrl: null,
      description: p.description ?? "",
    });
  }
}

await mkdir("site/data", { recursive: true });
await writeFile("site/data/listings.json", JSON.stringify({ generatedAt: new Date().toISOString(), listings, showcase }, null, 2));
console.log(`site/data/listings.json: ${listings.length} зар, ${showcase.length} төсөл`);
