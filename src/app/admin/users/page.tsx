import { query } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { UserRow } from "@/components/UserRow";
import type { RowDataPacket } from "mysql2";

export default async function UsersPage() {
  const me = await requirePerm("users.manage");
  const rows = await query<RowDataPacket[]>(
    `SELECT u.id, u.full_name, u.email, u.phone, u.status, u.last_login_at, r.code AS role
       FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id DESC LIMIT 500`);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Хэрэглэгч & эрхийн удирдлага</h1>
      <p className="text-sm text-black/60">Эрхийн түвшин: Super Admin, Admin, Manager, Employee, Customer. Super Admin эрхийг зөвхөн Super Admin өөрчилнө.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft/50 text-left text-black/60">
            <tr><th className="p-3">Нэр</th><th className="p-3">И-мэйл / утас</th><th className="p-3">Сүүлд нэвтэрсэн</th><th className="p-3">Эрх / Төлөв</th></tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-black/5">
                <td className="p-3">{u.full_name}</td>
                <td className="p-3 text-black/70">{u.email ?? u.phone}</td>
                <td className="p-3 text-black/60">{u.last_login_at ? new Date(u.last_login_at).toLocaleString("mn-MN") : "—"}</td>
                <td className="p-3">
                  <UserRow id={u.id} role={u.role} status={u.status} canSuper={me.role === "super_admin"} self={u.id === me.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
