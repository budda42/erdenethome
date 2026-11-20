import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, can } from "@/lib/auth";

const items = [
  { href: "/admin", label: "Ерөнхий", perm: "reports.read" },
  { href: "/admin/properties", label: "Байрны зар", perm: "properties.read" },
  { href: "/admin/requests", label: "Ирсэн хүсэлт", perm: "requests.read" },
  { href: "/admin/chats", label: "Чат", perm: "requests.read" },
  { href: "/map", label: "Газрын зураг", perm: "properties.read" },
  { href: "/admin/contracts", label: "Гэрээ", perm: "contracts.read" },
  { href: "/admin/org", label: "Бүтэц & ажилтан", perm: "org.manage" },
  { href: "/admin/users", label: "Хэрэглэгч & эрх", perm: "users.manage" },
  { href: "/admin/settings", label: "Тохиргоо", perm: "settings.manage" },
  { href: "/admin/audit", label: "Үйлдлийн түүх", perm: "audit.read" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  const visible = items.filter((i) => can(user, i.perm));
  if (visible.length === 0) redirect("/");

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <aside className="card h-fit space-y-1 p-3">
        <p className="px-3 pb-2 pt-1 text-xs text-black/50">{user.fullName}</p>
        {visible.map((i) => (
          <Link key={i.href} href={i.href} className="block rounded-lg px-3 py-2 text-sm hover:bg-brand-soft hover:text-brand">
            {i.label}
          </Link>
        ))}
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}
