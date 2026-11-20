// Usage: node scripts/migrate.mjs  (reads DB_* or DATABASE_URL from env)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import mysql from "mysql2/promise";

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, "..", "db", "schema.sql"), "utf8");

const conn = process.env.DATABASE_URL
  ? await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: true })
  : await mysql.createConnection({
      host: process.env.DB_HOST ?? "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "erdenet_home",
      multipleStatements: true,
    });

await conn.query(sql);
console.log("Schema applied.");
await conn.end();
