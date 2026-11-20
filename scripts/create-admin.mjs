// Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='min8chars' node scripts/create-admin.mjs
// Creates (or promotes) a Super Admin. Run once after the schema is applied.
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME ?? "Super Admin";
if (!email || !password || password.length < 8) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) are required.");
  process.exit(1);
}

const conn = process.env.DATABASE_URL
  ? await mysql.createConnection(process.env.DATABASE_URL)
  : await mysql.createConnection({
      host: process.env.DB_HOST ?? "127.0.0.1", port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root", password: process.env.DB_PASSWORD ?? "",
      database: process.env.DB_NAME ?? "erdenet_home",
    });

const hash = await bcrypt.hash(password, 12);
await conn.execute(
  `INSERT INTO users (email, password_hash, full_name, role_id)
   VALUES (?, ?, ?, (SELECT id FROM roles WHERE code='super_admin'))
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role_id = VALUES(role_id), status = 'active'`,
  [email, hash, name],
);
console.log(`Super Admin ready: ${email}`);
await conn.end();
