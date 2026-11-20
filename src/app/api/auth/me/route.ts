import { z } from "zod";
import { getCurrentUser, audit } from "@/lib/auth";
import { exec, one } from "@/lib/db";
import { ok, fail, parseBody } from "@/lib/http";
import { phoneSchema } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();
  return ok({ user });
}

// Users edit their own name and contact details from /account.
const profileSchema = z
  .object({
    fullName: z.string().trim().min(2, "Нэр хамгийн багадаа 2 тэмдэгт байна.").max(120),
    email: z.union([z.email("И-мэйл буруу байна.").max(190), z.literal("")]).optional(),
    phone: z.union([phoneSchema, z.literal("")]).optional(),
  })
  .refine((v) => v.email || v.phone, { message: "И-мэйл эсвэл утасны дугаар заавал байна.", path: ["email"] });

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Нэвтэрнэ үү.", 401);
  const body = await parseBody(req, profileSchema);
  if ("error" in body) return body.error;
  const email = body.data.email || null;
  const phone = body.data.phone || null;

  const dup = await one<{ id: number }>(
    "SELECT id FROM users WHERE id <> ? AND ((? IS NOT NULL AND email = ?) OR (? IS NOT NULL AND phone = ?)) LIMIT 1",
    [user.id, email, email, phone, phone],
  );
  if (dup) return fail("Энэ и-мэйл эсвэл утас өөр хэрэглэгчид бүртгэлтэй байна.", 409);

  await exec("UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?", [body.data.fullName, email, phone, user.id]);
  await audit(user.id, "user.profile_update", "user", user.id);
  return ok({ fullName: body.data.fullName, email, phone });
}
