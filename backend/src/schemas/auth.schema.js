import { z } from "zod";

// Valida email y contraseña segura en front y back
export const signupSchema = z.object({
  name: z.string().trim().min(2, "Nombre mínimo 2 caracteres").max(50),
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(8, "Contraseña mínimo 8 caracteres"),
});

export const loginSchema = z.object({
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(1, "Contraseña requerida"),
});

// Valida solo admin crea barberos
export const createBarberSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(8, "Contraseña mínimo 8 caracteres"),
});
