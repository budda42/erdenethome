import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { requirePerm } from "@/lib/guard";
import { ChatThread } from "@/components/ChatThread";
import type { RowDataPacket } from "mysql2";

export default async function AdminChatPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePerm("requests.read");
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const chat = await one<RowDataPacket>(
    `SELECT c.id, p.name AS property_name, u.full_name, u.phone, u.email
       FROM property_chats c
       JOIN properties p ON p.id = c.property_id
       JOIN users u ON u.id = c.user_id
      WHERE c.id = ?`,
    [id],
  );
  if (!chat) notFound();

  return (
    <div className="space-y-4">
      <Link href="/admin/chats" className="text-sm text-brand hover:underline">← Бүх чат</Link>
      <div>
        <h1 className="text-xl font-bold">{chat.full_name} · {chat.property_name}</h1>
        <p className="text-sm text-black/60">{chat.phone ?? "Утасгүй"}{chat.email ? ` · ${chat.email}` : ""}</p>
      </div>
      <div className="card flex h-[70vh] flex-col overflow-hidden">
        <ChatThread chatId={id} />
      </div>
    </div>
  );
}
