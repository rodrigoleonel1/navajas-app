import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Nombre mínimo 2 caracteres").max(50),
    email: z.email("Email inválido").trim().toLowerCase(),
    password: z.string().min(8, "Contraseña mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export const loginSchema = z.object({
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(1, "Contraseña requerida"),
});

export const createBarberSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.email("Email inválido").trim().toLowerCase(),
  password: z.string().min(8, "Contraseña mínimo 8 caracteres"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBarberInput = z.infer<typeof createBarberSchema>;
