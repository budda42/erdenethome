import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MyListings } from "@/components/MyListings";

export const metadata = { title: "Миний зар — ERDENET HOME" };

export default async function MyListingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my/listings");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Миний зар ба мэдэгдэл</h1>
        <p className="text-sm text-black/60">Зараа оруулж, холбоо барих хүсэлтүүдээ энд харна. Админ баталгаажуулсны дараа зар бусдад харагдана.</p>
      </div>
      <MyListings />
    </div>
  );
}
