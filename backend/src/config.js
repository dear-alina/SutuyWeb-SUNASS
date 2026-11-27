import { z } from "./compartido/zod.js";

const esquemaConfig = z.object({
  PUERTO: z.coerce.number().int().positive().default(4000),
  SUPABASE_URL: z.url(),
  SUPABASE_CLAVE_PUBLICA: z.string().min(20),
  SUPABASE_CLAVE_SECRETA: z.string().min(20),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "Debe ser una URL de PostgreSQL"),
  ORIGENES_PERMITIDOS: z
    .string()
    .default("http://localhost:3000")
    .transform((valor) => valor.split(",").map((origen) => origen.trim()).filter(Boolean)),
  COOKIE_SEGURA: z
    .enum(["true", "false"])
    .default("true")
    .transform((valor) => valor === "true"),
});

/** Valida las variables de entorno. */
export function leerConfig(entorno = process.env) {
  const resultado = esquemaConfig.safeParse(entorno);
  if (!resultado.success) {
    const detalles = resultado.error.issues.map((problema) => `${problema.path.join(".")}: ${problema.message}`);
    throw new Error(`Configuración inválida (revise backend/.env):\n  - ${detalles.join("\n  - ")}`);
  }
  return resultado.data;
}
