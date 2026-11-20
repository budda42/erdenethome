import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9+\- ]{6,20}$/, "Утасны дугаар буруу байна.");

export const passwordSchema = z.string().min(8, "Нууц үг хамгийн багадаа 8 тэмдэгт байна.").max(128);

export const identifierSchema = z.string().trim().min(3).max(190);

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.email("И-мэйл буруу байна.").max(190).optional(),
    phone: phoneSchema.optional(),
    password: passwordSchema,
  })
  .refine((v) => v.email || v.phone, { message: "И-мэйл эсвэл утасны дугаар заавал оруулна.", path: ["email"] });

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1).max(128),
});
