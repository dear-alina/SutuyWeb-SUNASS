/**
 * Flujo normal del uso excepcional del fondo (FI) para la DEMO.
 * Secuencia y responsables: hoja «Hitos» del diccionario y flujograma del Expediente General.
 * Base legal de cada paso: RGT art. 89 (RCD 028-2021-SUNASS-CD), TUPA de la Sunass y TUO LPAG 2026.
 * En el MVP estas transiciones las valida el backend.
 */
import type { ExpedienteFi, Hito } from "./expedientes-demo";

export type PasoFi = {
  codigoHito: string;
  area: "EP" | "DRE" | "SRT" | "equipo_srt" | "OAJ" | "GG" | "CD";
  accion: string; // lo que hace el área, en infinitivo
  boton: string;
  base: string;
};

export const PASOS_FI: PasoFi[] = [
  { codigoHito: "solicitud", area: "EP", accion: "Presentar la solicitud con los requisitos del TUPA", boton: "", base: "RGT 89.1 y 89.2; TUPA PA9000ED96" },
  { codigoHito: "derivacion", area: "DRE", accion: "Derivar la solicitud a la Subdirección de Regulación Tarifaria (1 día hábil)", boton: "Derivar a la SRT", base: "Flujograma del FI; hoja Hitos" },
  { codigoHito: "asignacion", area: "SRT", accion: "Formar el equipo de especialistas que verificará y evaluará el expediente", boton: "Formar equipo", base: "Flujograma del FI" },
  { codigoHito: "verificacion_tupa", area: "equipo_srt", accion: "Verificar los requisitos del TUPA", boton: "Requisitos conformes", base: "TUPA de la Sunass; TUO LPAG art. 125" },
  { codigoHito: "evaluacion", area: "equipo_srt", accion: "Evaluar el caso fortuito o de fuerza mayor y el uso propuesto", boton: "Evaluación concluida", base: "RGT 89.1 y 89.6" },
  { codigoHito: "informe", area: "equipo_srt", accion: "Elaborar el informe técnico-legal y el proyecto de resolución", boton: "Informe elaborado", base: "RGT 89.3" },
  { codigoHito: "visado_informe", area: "SRT", accion: "Revisar y visar el informe", boton: "Visar informe", base: "Flujograma del FI" },
  { codigoHito: "firma_informe_dre", area: "DRE", accion: "Revisar y firmar el informe técnico-legal (responsabilidad compartida con la OAJ)", boton: "Firmar informe", base: "RGT 89.3" },
  { codigoHito: "firma_informe_oaj", area: "OAJ", accion: "Revisar y firmar la parte legal del informe técnico-legal", boton: "Firmar informe", base: "RGT 89.3" },
  { codigoHito: "memo_gg", area: "DRE", accion: "Firmar el memorándum que eleva el informe y el proyecto de resolución a la Gerencia General", boton: "Firmar memorándum a la GG", base: "RGT 89.3" },
  { codigoHito: "elevacion_cd", area: "GG", accion: "De estar conforme, presentar el expediente al Consejo Directivo", boton: "Elevar al Consejo Directivo", base: "RGT 89.4" },
  { codigoHito: "resolucion_cd", area: "CD", accion: "Resolver: aprobar, aprobar en parte o denegar, y fijar la devolución o la exoneración", boton: "", base: "RGT 89.5" },
];

export const NOMBRE_AREA: Record<string, string> = {
  EP: "Empresa prestadora", DRE: "Dirección de Regulación Económica", SRT: "Subdirección de Regulación Tarifaria",
  equipo_srt: "Equipo técnico SRT", OAJ: "Oficina de Asesoría Jurídica", GG: "Gerencia General", CD: "Consejo Directivo",
};

/** Las áreas del perfil vienen en minúsculas (dre, oaj…); las de los hitos, como en el dataset (DRE, OAJ…). */
export const esMismaArea = (areaHito: string, areaPerfil: string | null | undefined) =>
  !!areaPerfil && areaHito.toLowerCase() === areaPerfil.toLowerCase();

/**
 * Pasos de las excepciones del flujo (hoja Hitos y flujograma del FI):
 * - Subsanación: verificacion_tupa → oficio_subsanacion (SRT) → subsanacion_ep (EP, 2 d.h.) → evaluacion.
 * - Información adicional: evaluacion → oficio_informacion (SRT) → informacion_ep (EP, hasta 10 d.h.) → informe.
 * Los días de la EP no cuentan para el plazo de la Sunass (TUO LPAG arts. 125.3.1 y 125.5).
 */
export const PASOS_EXCEPCION: PasoFi[] = [
  { codigoHito: "oficio_subsanacion", area: "SRT", accion: "Revisar y firmar el oficio de subsanación de requisitos", boton: "Firmar oficio de subsanación", base: "TUO LPAG art. 125.1; flujograma del FI" },
  { codigoHito: "subsanacion_ep", area: "EP", accion: "Subsanar los requisitos observados (2 días hábiles)", boton: "", base: "TUO LPAG art. 125.1" },
  { codigoHito: "oficio_informacion", area: "SRT", accion: "Revisar y firmar el oficio de información adicional", boton: "Firmar oficio de información", base: "RGT art. 89.6; flujograma del FI" },
  { codigoHito: "informacion_ep", area: "EP", accion: "Enviar la información adicional (hasta 10 días hábiles)", boton: "", base: "RGT art. 89.6" },
];

const SIGUIENTE_EXCEPCION: Record<string, string> = {
  oficio_subsanacion: "subsanacion_ep", subsanacion_ep: "evaluacion",
  oficio_informacion: "informacion_ep", informacion_ep: "informe",
};

export function obtenerPaso(codigoHito: string): PasoFi | undefined {
  return [...PASOS_FI, ...PASOS_EXCEPCION].find((p) => p.codigoHito === codigoHito);
}

/** Completa el paso pendiente en `fecha` y abre el siguiente (del flujo normal, de la excepción o el indicado). */
export function completarPaso(expediente: ExpedienteFi, fecha: string, opciones: { siguiente?: string; plazo?: number; numeroDocumento?: string } = {}): ExpedienteFi {
  const hitos = expediente.hitos.map((h) => ({ ...h }));
  const pendiente = [...hitos].reverse().find((h) => !h.finalizadoEn);
  if (!pendiente) return expediente;
  pendiente.finalizadoEn = fecha;
  if (opciones.numeroDocumento) pendiente.numeroDocumento = opciones.numeroDocumento;
  const codigoSiguiente = opciones.siguiente ?? SIGUIENTE_EXCEPCION[pendiente.codigoHito]
    ?? PASOS_FI[PASOS_FI.findIndex((p) => p.codigoHito === pendiente.codigoHito) + 1]?.codigoHito;
  const siguiente = codigoSiguiente ? obtenerPaso(codigoSiguiente) : undefined;
  if (siguiente) {
    const plazoPorDefecto: Record<string, number> = { derivacion: 1, subsanacion_ep: 2, informacion_ep: 10 };
    hitos.push({
      numero: Math.max(...hitos.map((h) => h.numero)) + 1, codigoHito: siguiente.codigoHito, area: siguiente.area,
      iniciadoEn: fecha, finalizadoEn: null, plazoReferencialDiasHabiles: opciones.plazo ?? plazoPorDefecto[siguiente.codigoHito] ?? null,
      cuentaPlazo: siguiente.area !== "EP", numeroDocumento: null,
    });
  }
  return { ...expediente, hitos };
}

export type TipoPedido = "subsanacion" | "informacion";

/** El equipo SRT registra que falta algo: abre el oficio que revisa y firma la SRT. */
export function registrarPedido(expediente: ExpedienteFi, fecha: string, pedido: { tipo: TipoPedido; requisitos: string[]; detalle: string; plazoDiasHabiles: number }): ExpedienteFi {
  const avanzado = completarPaso(expediente, fecha, { siguiente: pedido.tipo === "subsanacion" ? "oficio_subsanacion" : "oficio_informacion" });
  return { ...avanzado, pedidos: [...(expediente.pedidos ?? []), { ...pedido, registradoEn: fecha, numeroOficio: null, respondidoEn: null }] };
}

/** La SRT firma el oficio: se notifica a la EP y empieza su plazo (2 d.h. subsanación; hasta 10 d.h. información). */
export function firmarOficioPedido(expediente: ExpedienteFi, fecha: string, numeroOficio: string): ExpedienteFi {
  const pedidos = [...(expediente.pedidos ?? [])];
  const ultimo = pedidos[pedidos.length - 1];
  if (!ultimo) return expediente;
  pedidos[pedidos.length - 1] = { ...ultimo, numeroOficio };
  const avanzado = completarPaso(expediente, fecha, { numeroDocumento: numeroOficio, plazo: ultimo.plazoDiasHabiles });
  return {
    ...avanzado, pedidos,
    documentos: [...expediente.documentos, {
      codigoDocumento: `${expediente.codigoExpediente}-of-${pedidos.length}`, tipoDocumento: "oficio", numeroDocumento: numeroOficio, fechaDocumento: fecha,
      asunto: ultimo.tipo === "subsanacion" ? "Observaciones a los requisitos del TUPA" : "Requerimiento de información adicional",
      nivelAcceso: "restringido_partes",
    }],
  };
}

/** La EP responde desde su panel: se registran sus documentos y el expediente vuelve al equipo SRT. */
export function responderPedido(expediente: ExpedienteFi, fecha: string, archivos: { nombre: string; codigoRequisito?: string; descripcion: string }[]): ExpedienteFi {
  const pedidos = [...(expediente.pedidos ?? [])];
  const ultimo = pedidos[pedidos.length - 1];
  if (ultimo) pedidos[pedidos.length - 1] = { ...ultimo, respondidoEn: fecha };
  const avanzado = completarPaso(expediente, fecha);
  const base = expediente.documentos.length;
  return {
    ...avanzado, pedidos,
    documentos: [...expediente.documentos, ...archivos.map((a, i) => ({
      codigoDocumento: `${expediente.codigoExpediente}-r-${base + i + 1}`, tipoDocumento: "anexo" as const,
      numeroDocumento: ultimo?.tipo === "subsanacion" ? `Subsanación ${i + 1}` : `Información ${i + 1}`, fechaDocumento: fecha,
      asunto: `${a.descripcion} (${a.nombre})`, nivelAcceso: "restringido_partes" as const, codigoRequisito: a.codigoRequisito,
    }))],
  };
}

/** La SRT forma el equipo de especialistas: completa el paso de asignación y lo deja registrado. */
export function asignarEquipo(expediente: ExpedienteFi, fecha: string, equipo: NonNullable<ExpedienteFi["equipoAsignado"]>): ExpedienteFi {
  return { ...completarPaso(expediente, fecha), equipoAsignado: equipo };
}

/** El Consejo Directivo emite la resolución (RGT 89.5). La notificación es un paso aparte de la DRE (LPAG 24.1). */
export function emitirResolucion(expediente: ExpedienteFi, fecha: string, resultado: "aprobado" | "aprobado_parcial" | "denegado", numeroResolucion: string): ExpedienteFi {
  const hitos = expediente.hitos.map((h) =>
    !h.finalizadoEn && h.codigoHito === "resolucion_cd" ? { ...h, finalizadoEn: fecha, numeroDocumento: numeroResolucion } : { ...h },
  );
  return {
    ...expediente, hitos, estado: "concluido", resultado, fechaConclusion: fecha, fechaNotificacion: null,
    documentos: [
      ...expediente.documentos,
      { codigoDocumento: `${expediente.codigoExpediente}-rcd`, tipoDocumento: "resolucion_consejo_directivo", numeroDocumento: numeroResolucion, fechaDocumento: fecha, asunto: "Resolución sobre el uso excepcional del fondo de inversiones", nivelAcceso: "publico" },
    ],
  };
}

/** La DRE notifica a la EP la resolución y el informe que forma parte integrante de ella (caso EPSSMU: Oficio 629-2025-SUNASS-DRT). */
export function notificarResolucion(expediente: ExpedienteFi, fecha: string, numeroOficio: string): ExpedienteFi {
  return {
    ...expediente, fechaNotificacion: fecha,
    documentos: [
      ...expediente.documentos,
      { codigoDocumento: `${expediente.codigoExpediente}-notif`, tipoDocumento: "oficio", numeroDocumento: numeroOficio, fechaDocumento: fecha, asunto: "Notificación de la resolución y del informe que forma parte integrante de ella", nivelAcceso: "restringido_partes" },
    ],
  };
}
