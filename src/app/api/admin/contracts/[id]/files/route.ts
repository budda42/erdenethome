import { exec, one } from "@/lib/db";
import { ok, fail, idParam } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import { PDF_TYPES, MAX_PDF_BYTES, saveFile } from "@/lib/storage";
import type { RowDataPacket } from "mysql2";

// Upload one PDF contract file (multipart field "file").
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!can(user, "contracts.write")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  if (!(await one<RowDataPacket>("SELECT id FROM contracts WHERE id = ?", [id.data]))) return fail("Олдсонгүй.", 404);

  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return fail("Файл сонгоогүй байна.", 400);
  if (!(file.type in PDF_TYPES)) return fail("Зөвхөн PDF файл оруулна.", 415);
  if (file.size > MAX_PDF_BYTES) return fail("PDF 20MB-аас их байна.", 413);

  const url = await saveFile(file, "contracts", "pdf");
  const res = await exec(
    "INSERT INTO contract_files (contract_id, file_url, original_name, mime_type, size_bytes, uploaded_by) VALUES (?,?,?,?,?,?)",
    [id.data, url, file.name.slice(0, 255), file.type, file.size, user!.id],
  );
  await audit(user!.id, "contract.file_upload", "contract", id.data, { fileId: res.insertId });
  return ok({ id: res.insertId, url }, 201);
}
