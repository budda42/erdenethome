import { z } from "zod";

export const CONTRACT_STATUSES = ["drafting", "reviewing", "approved", "valid", "finished", "cancelled"] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

// Allowed status moves. "approved" additionally needs contracts.approve.
export const TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  drafting: ["reviewing", "cancelled"],
  reviewing: ["drafting", "approved", "cancelled"],
  approved: ["valid", "cancelled"],
  valid: ["finished", "cancelled"],
  finished: [],
  cancelled: [],
};

export const contractInputSchema = z.object({
  contractNumber: z.string().trim().min(3).max(40),
  contractType: z.enum(["rent", "sale"]),
  propertyId: z.coerce.number().int().positive(),
  sellerParty: z.string().trim().min(2).max(200),
  buyerParty: z.string().trim().min(2).max(200),
  signedDate: z.string().date().optional().nullable(),
  startDate: z.string().date().optional().nullable(),
  endDate: z.string().date().optional().nullable(),
  amount: z.coerce.number().int().min(0),
  paymentTerms: z.string().max(5000).optional().nullable(),
  responsibleEmployeeId: z.coerce.number().int().positive().optional().nullable(),
  status: z.enum(CONTRACT_STATUSES).optional(),
});
