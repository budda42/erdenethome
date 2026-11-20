import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { one, exec } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const SESSION_COOKIE = "eh_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type Role = "super_admin" | "admin" | "manager" | "employee" | "customer";

export type CurrentUser = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  permissions: string[];
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET env хувьсагч дор хаяж 32 тэмдэгттэй байх ёстой.");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number, tokenVersion: number) {
  const token = await new SignJWT({ tv: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

type UserRow = RowDataPacket & {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_code: Role;
  status: "active" | "blocked";
  token_version: number;
  permissions: string | null;
};

/** Reads the session cookie, verifies the JWT, and reloads the user from MySQL. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let payload: { sub?: string; tv?: number };
  try {
    ({ payload } = await jwtVerify(token, secretKey()));
  } catch {
    return null;
  }

  const row = await one<UserRow>(
    `SELECT u.id, u.full_name, u.email, u.phone, u.status, u.token_version,
            r.code AS role_code,
            GROUP_CONCAT(p.code) AS permissions
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ?
      GROUP BY u.id`,
    [Number(payload.sub)],
  );

  if (!row || row.status !== "active" || row.token_version !== payload.tv) return null;

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role_code,
    permissions: row.permissions ? row.permissions.split(",") : [],
  };
}

export function can(user: CurrentUser | null, permission: string) {
  return !!user && (user.role === "super_admin" || user.permissions.includes(permission));
}

/** Writes an audit trail entry. Never throw from logging. */
export async function audit(
  userId: number | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  meta?: unknown,
) {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    await exec(
      "INSERT INTO audit_logs (user_id, action, entity, entity_id, meta, ip) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, action, entity, entityId === null ? null : String(entityId), meta ? JSON.stringify(meta) : null, ip],
    );
  } catch (err) {
    console.error("audit log failed", err);
  }
}
