import { exec, one, query } from "@/lib/db";
import { ok, fail, idParam } from "@/lib/http";
import { getCurrentUser, can, audit } from "@/lib/auth";
import {
  IMAGE_TYPES, VIDEO_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, saveFile,
} from "@/lib/storage";
import type { RowDataPacket } from "mysql2";

type Ctx = { params: Promise<{ id: string }> };

// Accepts multipart/form-data with one or more "files" fields (JPEG/PNG/WEBP or MP4).
export async function POST(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!can(user, "properties.write")) return fail("Эрх хүрэхгүй.", 403);
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  if (!(await one<RowDataPacket>("SELECT id FROM properties WHERE id = ?", [id.data]))) return fail("Олдсонгүй.", 404);

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return fail("Файл сонгоогүй байна.", 400);
  if (files.length > 20) return fail("Нэг удаад 20 файлаас их байж болохгүй.", 400);

  const maxSort = await one<RowDataPacket & { m: number }>(
    "SELECT COALESCE(MAX(sort_order), 0) AS m FROM property_images WHERE property_id = ?", [id.data]);
  let sort = (maxSort?.m ?? 0) + 1;
  const saved: { url: string; type: string }[] = [];

  for (const file of files) {
    const isImage = file.type in IMAGE_TYPES;
    const isVideo = file.type in VIDEO_TYPES;
    if (!isImage && !isVideo) return fail(`Дэмжихгүй файл: ${file.name}`, 415);
    if (isImage && file.size > MAX_IMAGE_BYTES) return fail("Зураг 8MB-аас их байна.", 413);
    if (isVideo && file.size > MAX_VIDEO_BYTES) return fail("Видео 50MB-аас их байна.", 413);

    const ext = isImage ? IMAGE_TYPES[file.type] : VIDEO_TYPES[file.type];
    const url = await saveFile(file, "properties", ext);
    const type = isImage ? "image" : "video";
    await exec(
      "INSERT INTO property_images (property_id, file_url, media_type, sort_order) VALUES (?,?,?,?)",
      [id.data, url, type, sort++],
    );
    saved.push({ url, type });
  }

  await audit(user!.id, "property.media_upload", "property", id.data, { count: saved.length });
  return ok({ files: saved }, 201);
}

export async function GET(_req: Request, { params }: Ctx) {
  const id = idParam.safeParse((await params).id);
  if (!id.success) return fail("Буруу ID.", 400);
  const rows = await query<RowDataPacket[]>(
    "SELECT id, file_url, media_type, sort_order FROM property_images WHERE property_id = ? ORDER BY sort_order, id",
    [id.data],
  );
  return ok({ items: rows });
}
