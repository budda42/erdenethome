import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { ChatThread } from "@/components/ChatThread";
import type { RowDataPacket } from "mysql2";

export const metadata = { title: "Чат — ERDENET HOME" };

export default async function MyChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/chat");

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const chat = await one<RowDataPacket>(
    `SELECT c.id, p.name AS property_name
       FROM property_chats c JOIN properties p ON p.id = c.property_id
      WHERE c.id = ? AND c.user_id = ?`,
    [id, user.id],
  );
  if (!chat) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/chat" className="text-sm text-brand hover:underline">← Бүх чат</Link>
      <h1 className="text-xl font-bold">{chat.property_name}</h1>
      <div className="card flex h-[70vh] flex-col overflow-hidden">
        <ChatThread chatId={id} />
      </div>
    </div>
  );
}
