/**
 * Requisitos del uso excepcional del fondo de inversiones según el TUPA de la Sunass
 * (DS 015-2025-PCM, modificado por RCD 138-2025-SUNASS-CD; procedimiento PA9000ED96).
 * La solicitud y tres documentos que la acompañan.
 *
 * Recepción (TUO LPAG art. 125.1): la mesa de partes no rechaza la solicitud incompleta;
 * la recibe, deja constancia de lo que falta y la EP tiene 2 días hábiles para subsanar.
 */
import type { Documento } from "./expedientes-demo";

export const REQUISITOS_TUPA_FI = [
  { codigo: "solicitud", texto: "Solicitud dirigida a la Sunass", tipoDocumento: "carta_ep" },
  { codigo: "informe", texto: "Informe sobre la propuesta de uso excepcional (caso fortuito o de fuerza mayor)", tipoDocumento: "anexo" },
  { codigo: "sustento", texto: "Documentos que sustentan la propuesta", tipoDocumento: "anexo" },
  { codigo: "propuesta", texto: "Propuesta de devolución o de exoneración de la devolución", tipoDocumento: "anexo" },
] as const;

export type CodigoRequisito = (typeof REQUISITOS_TUPA_FI)[number]["codigo"];

/** Qué requisitos tienen un documento presentado. La carta de la EP cuenta como la solicitud. */
export function revisarRequisitos(documentos: Documento[]) {
  return REQUISITOS_TUPA_FI.map((r) => ({
    ...r,
    documento: documentos.find((d) => d.codigoRequisito === r.codigo || (r.codigo === "solicitud" && d.tipoDocumento === "carta_ep")) ?? null,
  }));
}
