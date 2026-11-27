import { CODIGO_EXPEDIENTE_VALIDO, reenviarAlCopiloto, responderProblema } from "@/servicios/copiloto/puente-servidor";

/** Registro de lo que decidió el especialista sobre cada sugerencia (quién, qué y cuándo). */
export async function POST(solicitud: Request) {
  return reenviarAlCopiloto("/decisiones", "POST", await solicitud.text());
}

/** Decisiones ya registradas de un expediente. */
export async function GET(solicitud: Request) {
  const codigo = new URL(solicitud.url).searchParams.get("codigoExpediente") ?? "";
  if (!CODIGO_EXPEDIENTE_VALIDO.test(codigo)) return responderProblema(422, "validacion_fallida", "Código de expediente no válido.");
  return reenviarAlCopiloto(`/decisiones?codigoExpediente=${encodeURIComponent(codigo)}`, "GET");
}
