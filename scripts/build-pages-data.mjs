// Usage: npm run pages:data
// Builds site/data/listings.json for the static GitHub Pages site from
//   - data/fb-listings.json   (ads collected from the Facebook page; edit by hand)
//   - data/projects-*.json    (project units, e.g. Oyut Residence)
// Categories: apartment (Орон сууц), house (Хашаа байшин), land (Газар), rent (Түрээс), object (Объект).
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const CATS = new Set(["apartment", "house", "land", "rent", "object"]);
const listings = [];

if (existsSync("data/fb-listings.json")) {
  const { listings: fb } = JSON.parse(await readFile("data/fb-listings.json", "utf8"));
  for (const l of fb) {
    if (!CATS.has(l.category)) throw new Error(`${l.id}: ангилал буруу "${l.category}"`);
    listings.push({ images: [], ...l });
  }
}

const { projects } = JSON.parse(await readFile("data/projects-2026-11.json", "utf8"));
for (const p of projects) {
  for (const u of p.units ?? []) {
    listings.push({
      id: u.ad_number,
      category: "apartment",
      title: `${p.name} · ${u.rooms} өрөө ${u.area_m2} м²`,
      location: p.address,
      rooms: u.rooms,
      areaM2: u.area_m2,
      price: u.price,
      images: [],
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
      description: p.description ?? "",
    });
  }
}

await mkdir("site/data", { recursive: true });
await writeFile("site/data/listings.json", JSON.stringify({ generatedAt: new Date().toISOString(), listings }, null, 2));
const by = {};
listings.forEach((l) => { by[l.category] = (by[l.category] ?? 0) + 1; });
console.log(`site/data/listings.json: ${listings.length} зар`, by);
