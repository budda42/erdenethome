import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser, can } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { FacebookIcon } from "@/components/FacebookButton";
import { getOrgInfo } from "@/lib/org";

export const metadata: Metadata = {
  title: "ERDENET HOME — Эрдэнэт байр",
  description: "Эрдэнэт хотын байр, үл хөдлөх хөрөнгө: түрээс, худалдаа, газрын зураг, гэрээ.",
};

const nav = [
  { href: "/", label: "Нүүр" },
  { href: "/properties", label: "Байр хайх" },
  { href: "/swipe", label: "Байр сонгох" },
  { href: "/map", label: "Газрын зураг" },
  { href: "/about", label: "Байгууллагын тухай" },
  { href: "/contact", label: "Холбоо барих" },
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [user, org] = await Promise.all([getCurrentUser(), getOrgInfo()]);
  const staff = !!user && (can(user, "properties.read") || can(user, "contracts.read") || can(user, "users.manage") || can(user, "org.manage") || can(user, "settings.manage"));

  return (
    <html lang="mn">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-1 font-bold tracking-tight">
              <span className="text-brand">ERDENET</span> HOME
            </Link>
            <nav className="hidden gap-5 whitespace-nowrap text-sm text-black/70 lg:flex">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-brand">{n.label}</Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2 text-sm">
              {user ? (
                <>
                  {staff && <Link href="/admin" className="btn-ghost">Админ</Link>}
                  <Link href="/account" className="btn-ghost">Миний хэсэг</Link>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost">Нэвтрэх</Link>
                  <Link href="/register" className="btn-primary">Бүртгүүлэх</Link>
                </>
              )}
            </div>
          </div>
          <nav className="flex gap-4 overflow-x-auto border-t border-black/5 px-4 py-2 text-xs text-black/70 md:hidden">
            {nav.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
          </nav>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

        <footer className="mt-16 border-t border-black/5 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-black/50">
            <span>© {new Date().getFullYear()} ERDENET HOME · Байр мэдээлэл · зар · гэрээ · удирдлага</span>
            <div className="flex items-center gap-4">
              <Link href="/about" className="hover:text-brand">Бидний тухай</Link>
              <Link href="/contact" className="hover:text-brand">Холбоо барих</Link>
              <a href={org["org.facebook"]} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                 className="flex items-center gap-1 text-[#1877F2] hover:underline">
                <FacebookIcon className="h-4 w-4" /> Facebook
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
