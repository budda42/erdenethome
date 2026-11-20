import { z } from "zod";

export const AD_STATUSES = ["draft", "under_review", "active", "reserved", "contracted", "closed"] as const;
export const PUBLIC_AD_STATUSES = ["active", "reserved"] as const;

export const propertyInputSchema = z.object({
  name: z.string().trim().min(2).max(200),
  propertyType: z.string().trim().min(2).max(60).default("Орон сууц"),
  address: z.string().trim().min(3).max(255),
  district: z.string().trim().max(120).optional().nullable(),
  buildingNo: z.string().trim().max(40).optional().nullable(),
  entrance: z.string().trim().max(20).optional().nullable(),
  floor: z.coerce.number().int().min(-5).max(200).optional().nullable(),
  rooms: z.coerce.number().int().min(0).max(50).optional().nullable(),
  areaM2: z.coerce.number().min(0).max(100000).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
  longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
  assignedEmployeeId: z.coerce.number().int().positive().optional().nullable(),
  ad: z.object({
    dealType: z.enum(["rent", "sale"]),
    price: z.coerce.number().int().min(0).max(10_000_000_000_000),
    serviceFee: z.coerce.number().int().min(0).optional().nullable(),
    status: z.enum(AD_STATUSES).default("draft"),
  }),
});

export type PropertyInput = z.infer<typeof propertyInputSchema>;

export const publicFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  rooms: z.coerce.number().int().min(0).max(50).optional(),
  deal: z.enum(["rent", "sale"]).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(12),
});

/** Turns a string like "12.5" into a number, keeping NULL as null. */
export type PublicFilter = z.infer<typeof publicFilterSchema>;

export const toNum = (v: number | null | undefined) => (v === null || v === undefined ? null : Number(v));
