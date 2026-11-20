import { z } from "zod";
import { exec } from "@/lib/db";
import { ok, fail, parseBody, idParam } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user, "requests.write")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  const body = await parseBody(req, z.object({ status: z.enum(["new", "contacted", "closed"]) }));
  if ("error" in body) return body.error;
  await exec("UPDATE property_requests SET status = ? WHERE id = ?", [body.data.status, id.data]);
  await audit(user!.id, "request.status", "property_request", id.data, { status: body.data.status });
  return ok();
}
