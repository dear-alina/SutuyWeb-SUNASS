import { CODIGO_EXPEDIENTE_VALIDO, reenviarAlCopiloto, responderProblema } from "@/servicios/copiloto/puente-servidor";

/** «Preguntar al expediente»: respuesta con cita verificada, pasajes e incertidumbre. */
export async function POST(solicitud: Request) {
  const texto = await solicitud.text();
  let cuerpo: { pregunta?: unknown; codigoExpediente?: unknown };
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return responderProblema(422, "validacion_fallida", "La pregunta no es válida.");
  }
  if (typeof cuerpo.pregunta !== "string" || cuerpo.pregunta.trim().length < 3 || cuerpo.pregunta.length > 500) {
    return responderProblema(422, "validacion_fallida", "Escriba una pregunta de 3 a 500 caracteres.");
  }
  if (cuerpo.codigoExpediente !== undefined && (typeof cuerpo.codigoExpediente !== "string" || !CODIGO_EXPEDIENTE_VALIDO.test(cuerpo.codigoExpediente))) {
    return responderProblema(422, "validacion_fallida", "Código de expediente no válido.");
  }
  return reenviarAlCopiloto("/preguntas", "POST", JSON.stringify({ pregunta: cuerpo.pregunta.trim(), codigoExpediente: cuerpo.codigoExpediente }));
}
