"use client";

import { useRouter } from "next/navigation";

const ROLES: [string, string][] = [["super_admin", "Super Admin"], ["admin", "Admin"], ["manager", "Manager"], ["employee", "Employee"], ["customer", "Customer"]];

export function UserRow({ id, role, status, canSuper, self }: { id: number; role: string; status: string; canSuper: boolean; self: boolean }) {
  const router = useRouter();
  async function patch(body: object) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) alert(json.error);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="input max-w-[160px] py-1.5" value={role} disabled={self}
        onChange={(e) => patch({ role: e.target.value })}>
        {ROLES.map(([k, l]) => <option key={k} value={k} disabled={k === "super_admin" && !canSuper}>{l}</option>)}
      </select>
      <button className={status === "active" ? "btn-ghost text-sm text-red-600" : "btn-ghost text-sm"} disabled={self}
        onClick={() => patch({ status: status === "active" ? "blocked" : "active" })}>
        {status === "active" ? "Хаах" : "Нээх"}
      </button>
    </div>
  );
}
