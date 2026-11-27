/**
 * Cliente del copiloto para las vistas de la Sunass. Llama al puente de Next (/api/copiloto/...),
 * nunca al copiloto directamente: el token de servicio no está en el navegador.
 * Contrato: copiloto/LEEME.md y copiloto/contratos.py (rama main).
 */
export type EstadoEvidencia = "evidencia_encontrada" | "evidencia_parcial" | "no_hallada" | "no_determinable";

export type RequisitoParaCopiloto = { codigoRequisito: string; texto: string; palabrasClave: string[] };

export type ResultadoCopiloto = {
  codigoRequisito: string;
  punto: string;
  estado: EstadoEvidencia | string;
  codigoFragmento: string | null;
  documento: string | null;
  pagina: number | null;
  cita: string;
  motivo: string;
  origen: string;
  esVerificada: boolean;
  debeRevisarse: boolean;
  alerta: string | null;
};

export type RespuestaEvaluacion = { resultados: ResultadoCopiloto[]; borrador: string | null; modelo: string };

export type DecisionCopiloto = "revisado" | "no_es_correcto" | "confirma_falta" | "si_esta_en_expediente";

export class ErrorCopiloto extends Error {
  constructor(public codigo: string, mensaje: string) {
    super(mensaje);
  }
}

async function llamar<T>(ruta: string, cuerpo?: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api/copiloto${ruta}`, {
      method: cuerpo === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorCopiloto("sin_conexion", "No se pudo conectar con el servidor de la aplicación.");
  }
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorCopiloto(datos?.codigo ?? "error", datos?.detail ?? "El copiloto no pudo responder.");
  return datos as T;
}

/** Documentos que el copiloto tiene indexados (para saber si un expediente tiene material que revisar). */
export async function consultarDocumentosIndexados(): Promise<{ modelo: string; documentos: string[] }> {
  return llamar("/salud");
}

export function evaluarRequisitos(codigoExpediente: string, requisitos: RequisitoParaCopiloto[], plazoDiasHabiles?: number) {
  return llamar<RespuestaEvaluacion>(`/expedientes/${encodeURIComponent(codigoExpediente)}/evaluaciones-requisitos`, { requisitos, plazoDiasHabiles });
}

export function registrarDecision(datos: {
  codigoExpediente: string; codigoRequisito: string; decision: DecisionCopiloto; registradoPorId: string;
  estadoSugerido: string; codigoFragmento: string | null; comentario?: string;
}) {
  return llamar<{ registradoEn: string }>("/decisiones", datos);
}
