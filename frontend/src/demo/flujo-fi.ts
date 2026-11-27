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
  { codigoHito: "asignacion", area: "SRT", accion: "Asignar el expediente a un especialista del equipo", boton: "Asignar al equipo", base: "Flujograma del FI" },
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

export function obtenerPaso(codigoHito: string): PasoFi | undefined {
  return PASOS_FI.find((p) => p.codigoHito === codigoHito);
}

/** Completa el paso pendiente en `fecha` y abre el siguiente del flujo normal. */
export function completarPaso(expediente: ExpedienteFi, fecha: string): ExpedienteFi {
  const hitos = expediente.hitos.map((h) => ({ ...h }));
  const pendiente = [...hitos].reverse().find((h) => !h.finalizadoEn);
  if (!pendiente) return expediente;
  pendiente.finalizadoEn = fecha;
  const indice = PASOS_FI.findIndex((p) => p.codigoHito === pendiente.codigoHito);
  const siguiente = PASOS_FI[indice + 1];
  if (siguiente) {
    const nuevo: Hito = {
      numero: Math.max(...hitos.map((h) => h.numero)) + 1, codigoHito: siguiente.codigoHito, area: siguiente.area,
      iniciadoEn: fecha, finalizadoEn: null, plazoReferencialDiasHabiles: siguiente.codigoHito === "derivacion" ? 1 : null,
      cuentaPlazo: true, numeroDocumento: null,
    };
    hitos.push(nuevo);
  }
  return { ...expediente, hitos };
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
