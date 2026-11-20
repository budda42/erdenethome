import Link from "next/link";
import { listPublic } from "@/lib/listings";
import { getCurrentUser } from "@/lib/auth";
import { SwipeDeck } from "@/components/SwipeDeck";

export const metadata = { title: "Байр сонгох — ERDENET HOME" };

export default async function SwipePage() {
  const user = await getCurrentUser();
  const { items } = await listPublic({ page: 1, pageSize: 200 });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Байр сонгох</h1>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-black/60">Бүсээ сонгоод карт шудрах: баруун тал = хадгалах, зүүн тал = алгасах.</p>
          {user && <Link href="/chat" className="whitespace-nowrap text-sm font-medium text-brand hover:underline">Миний чат →</Link>}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="card p-10 text-center text-black/60">Одоогоор идэвхтэй зар алга.</p>
      ) : (
        <SwipeDeck items={items} loggedIn={!!user} />
      )}
    </div>
  );
}
