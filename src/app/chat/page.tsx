import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const metadata = { title: "Миний чат — ERDENET HOME" };

export default async function MyChatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/chat");

  const rows = await query<RowDataPacket[]>(
    `SELECT c.id, c.updated_at, p.name AS property_name,
            (SELECT m.kind FROM chat_messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_kind,
            (SELECT m.body FROM chat_messages m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_body
       FROM property_chats c JOIN properties p ON p.id = c.property_id
      WHERE c.user_id = ? ORDER BY c.updated_at DESC`,
    [user.id],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Миний чат</h1>
        <p className="text-sm text-black/60">Байрнуудын талаарх яриа болон ирсэн гэрээнүүд.</p>
      </div>
      {rows.length === 0 ? (
        <p className="card p-10 text-center text-black/60">
          Чат алга. <Link href="/swipe" className="text-brand hover:underline">Байр сонгох</Link> хэсгээс байрны чатыг нээнэ үү.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/chat/${r.id}`} className="card block p-4 hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate font-semibold">{r.property_name}</p>
                  <span className="whitespace-nowrap text-xs text-black/50">{new Date(r.updated_at).toLocaleString("mn-MN")}</span>
                </div>
                <p className="mt-1 truncate text-sm text-black/60">
                  {r.last_kind === "contract" ? "📄 Гэрээ ирсэн" : r.last_body ?? "Мессеж алга"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
