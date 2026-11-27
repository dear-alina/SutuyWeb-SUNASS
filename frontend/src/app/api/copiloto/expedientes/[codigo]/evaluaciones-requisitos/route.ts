import { CODIGO_EXPEDIENTE_VALIDO, reenviarAlCopiloto, responderProblema } from "@/servicios/copiloto/puente-servidor";

/** Revisión asistida de requisitos: evidencia, cita, documento y página por requisito, y borrador de observaciones. */
export async function POST(solicitud: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  if (!CODIGO_EXPEDIENTE_VALIDO.test(codigo)) return responderProblema(422, "validacion_fallida", "Código de expediente no válido.");
  return reenviarAlCopiloto(`/expedientes/${codigo}/evaluaciones-requisitos`, "POST", await solicitud.text());
}
