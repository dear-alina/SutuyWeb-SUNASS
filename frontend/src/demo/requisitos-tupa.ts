/**
 * Requisitos del uso excepcional del fondo de inversiones según el TUPA de la Sunass
 * (DS 015-2025-PCM, modificado por RCD 138-2025-SUNASS-CD; procedimiento PA9000ED96).
 * La solicitud y tres documentos que la acompañan.
 *
 * Recepción (TUO LPAG art. 125.1): la mesa de partes no rechaza la solicitud incompleta;
 * la recibe, deja constancia de lo que falta y la EP tiene 2 días hábiles para subsanar.
 */
import type { Documento } from "./expedientes-demo";

// palabrasClave: pistas para la búsqueda del copiloto (no deciden nada; las revisa el especialista).
export const REQUISITOS_TUPA_FI = [
  { codigo: "solicitud", texto: "Solicitud dirigida a la Sunass", tipoDocumento: "carta_ep", palabrasClave: ["solicitamos", "uso excepcional", "Gerencia General"] },
  { codigo: "informe", texto: "Informe sobre la propuesta de uso excepcional (caso fortuito o de fuerza mayor)", tipoDocumento: "anexo", palabrasClave: ["motivo", "caso fortuito", "fuerza mayor", "rotura"] },
  { codigo: "sustento", texto: "Documentos que sustentan la propuesta", tipoDocumento: "anexo", palabrasClave: ["sustento", "presupuesto", "costos unitarios", "cronograma"] },
  { codigo: "propuesta", texto: "Propuesta de devolución o de exoneración de la devolución", tipoDocumento: "anexo", palabrasClave: ["devolución", "exoneración", "reposición"] },
] as const;

/**
 * Revisión de contenido en la evaluación: requisitos CANDIDATOS del copiloto (copiloto/requisitos_ufi.json, U1–U6).
 * Salen de oficios de expedientes ficticios; NO son el TUPA oficial. Se muestran rotulados como tales.
 */
export const REVISION_CONTENIDO_CANDIDATA = [
  { codigo: "U1", texto: "La solicitud está suscrita por la Gerencia General, representante legal de la empresa", palabrasClave: ["Gerencia General"] },
  { codigo: "U2", texto: "Se indica el monto solicitado del fondo de inversiones", palabrasClave: ["uso excepcional de", "solicitamos", "monto", "fondo de inversiones"] },
  { codigo: "U3", texto: "Se expone el motivo que sustenta el uso excepcional", palabrasClave: ["motivo"] },
  { codigo: "U4", texto: "Se adjunta el sustento de los costos unitarios de las obras propuestas", palabrasClave: ["costos unitarios", "presupuesto"] },
  { codigo: "U5", texto: "El cronograma de ejecución es coherente con el programa de inversiones vigente", palabrasClave: ["cronograma"] },
  { codigo: "U6", texto: "Se adjunta el acuerdo de Directorio que aprueba la solicitud", palabrasClave: ["acuerdo", "Directorio"] },
] as const;

export type CodigoRequisito = (typeof REQUISITOS_TUPA_FI)[number]["codigo"];

/** Qué requisitos tienen un documento presentado. La carta de la EP cuenta como la solicitud. */
export function revisarRequisitos(documentos: Documento[]) {
  return REQUISITOS_TUPA_FI.map((r) => ({
    ...r,
    documento: documentos.find((d) => d.codigoRequisito === r.codigo || (r.codigo === "solicitud" && d.tipoDocumento === "carta_ep")) ?? null,
  }));
}
