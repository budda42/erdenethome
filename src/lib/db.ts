import mysql from "mysql2/promise";

declare global {
  var __mysqlPool: mysql.Pool | undefined;
}

function createPool() {
  const url = process.env.DATABASE_URL;
  if (url) {
    return mysql.createPool({ uri: url, connectionLimit: 5, namedPlaceholders: false, dateStrings: false });
  }
  return mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "erdenet_home",
    connectionLimit: 5,
    charset: "utf8mb4",
  });
}

// Reuse one pool across hot reloads / serverless warm starts.
export const pool: mysql.Pool = globalThis.__mysqlPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.__mysqlPool = pool;

export async function query<T = mysql.RowDataPacket[]>(sql: string, params: unknown[] = []): Promise<T> {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}

export async function one<T = mysql.RowDataPacket>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows[0] ?? null;
}

export async function exec(sql: string, params: unknown[] = []): Promise<mysql.ResultSetHeader> {
  const [res] = await pool.execute<mysql.ResultSetHeader>(sql, params as (string | number | boolean | Date | null)[]);
  return res;
}

import type { PoolConnection } from "mysql2/promise";

/** Runs fn inside a transaction; rolls back if fn throws. */
export async function withTx<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
