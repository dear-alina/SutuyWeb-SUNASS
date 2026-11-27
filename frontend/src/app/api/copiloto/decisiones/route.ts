import { reenviarAlCopiloto } from "@/servicios/copiloto/puente-servidor";

/** Registro de lo que decidió el especialista sobre cada sugerencia (quién, qué y cuándo). */
export async function POST(solicitud: Request) {
  return reenviarAlCopiloto("/decisiones", "POST", await solicitud.text());
}
