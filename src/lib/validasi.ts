import { z } from "zod";

/** Aturan email & password yang sama untuk daftar, reset password, dan pembuatan akun admin. */
export const skemaEmail = z.string().trim().toLowerCase().email("Format email tidak valid");

export const skemaPassword = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter")
  .regex(/[A-Za-z]/, "Password harus mengandung huruf")
  .regex(/[0-9]/, "Password harus mengandung angka");
