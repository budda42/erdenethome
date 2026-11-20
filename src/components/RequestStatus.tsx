"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RequestStatus({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  return (
    <select
      className="input max-w-[160px] py-1.5"
      value={value}
      onChange={async (e) => {
        setValue(e.target.value);
        await fetch(`/api/admin/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: e.target.value }) });
        router.refresh();
      }}
    >
      <option value="new">Шинэ</option>
      <option value="contacted">Холбогдсон</option>
      <option value="closed">Хаагдсан</option>
    </select>
  );
}
