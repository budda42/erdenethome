import { mkdir, writeFile, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

/**
 * File storage. Local disk by default (UPLOAD_DIR, default ./uploads).
 * On Vercel the disk is read-only and not persistent: switch this module to an
 * object store (e.g. Vercel Blob or S3) before going to production.
 */
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads"));

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4" };
export const PDF_TYPES: Record<string, string> = { "application/pdf": "pdf" };

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export async function saveFile(file: File, folder: "properties" | "contracts", ext: string) {
  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/api/files/${folder}/${name}`;
}

/** Resolves a stored file for download. Rejects any path that escapes UPLOAD_DIR. */
export async function readStoredFile(segments: string[]) {
  const target = path.resolve(/*turbopackIgnore: true*/ UPLOAD_DIR, ...segments);
  if (!target.startsWith(UPLOAD_DIR + path.sep)) throw new Error("Invalid path");
  return readFile(target);
}
