/**
 * «Lo indispensable» que se revisa con el copiloto en un expediente de uso excepcional del fondo.
 * Cada punto dice de dónde sale. Las palabras clave solo orientan la búsqueda: no deciden nada.
 */
export type PuntoIndispensable = { codigo: string; texto: string; base: string; palabrasClave: string[] };

export const PUNTOS_INDISPENSABLES: PuntoIndispensable[] = [
  { codigo: "P1", texto: "Identificación de la EPS y firma de la Gerencia General", base: "Solicitud (TUPA PA9000ED96)", palabrasClave: ["EPS", "Gerencia General", "CARTA"] },
  { codigo: "P2", texto: "Motivo: caso fortuito o de fuerza mayor", base: "RGT art. 89.1", palabrasClave: ["motivo", "rotura", "fuerza mayor", "caso fortuito", "emergencia"] },
  { codigo: "P3", texto: "Monto solicitado del fondo de inversiones", base: "Solicitud; RGT art. 89", palabrasClave: ["S/", "monto", "uso excepcional de", "fondo de inversiones"] },
  { codigo: "P4", texto: "Sustento técnico de la intervención y sus costos", base: "TUPA: documentos que sustentan la propuesta", palabrasClave: ["sustento", "presupuesto", "costos unitarios", "cronograma"] },
  { codigo: "P5", texto: "Propuesta de devolución o de exoneración de la devolución", base: "TUPA PA9000ED96", palabrasClave: ["devolución", "exoneración", "reposición"] },
  { codigo: "P6", texto: "Acuerdo de Directorio que aprueba la solicitud", base: "Observación frecuente en oficios del concurso (candidato, no es TUPA)", palabrasClave: ["acuerdo", "Directorio"] },
];
