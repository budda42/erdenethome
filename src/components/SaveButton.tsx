"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Saving needs an account. Visitors are sent to the login page.
export function SaveButton({ propertyId, loggedIn, initiallySaved }: { propertyId: number; loggedIn: boolean; initiallySaved: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!loggedIn) return router.push(`/login?next=/properties/${propertyId}`);
    setBusy(true);
    const res = saved
      ? await fetch(`/api/saved/${propertyId}`, { method: "DELETE" })
      : await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId }) });
    if (res.ok) setSaved(!saved);
    setBusy(false);
  }

  return (
    <button onClick={toggle} disabled={busy} className={saved ? "btn-primary" : "btn-ghost"}>
      {saved ? "♥ Хадгалсан" : "♡ Хадгалах"}
    </button>
  );
}
