/**
 * Reglas de las vistas internas de la Sunass en la DEMO (en el MVP las calcula el backend).
 * Qué le toca a cada área: hoja «Hitos» y RGT art. 89; notificación: TUO LPAG art. 24.1.
 */
import { contarDiasHabiles, sumarDiasHabiles } from "./calendario-demo";
import type { ExpedienteFi, Hito } from "./expedientes-demo";
import { esMismaArea, obtenerPaso } from "./flujo-fi";
import { obtenerHitoPendiente } from "./reglas-eps";

export type TareaArea =
  | { tipo: "paso"; hito: Hito }
  | { tipo: "resolver"; hito: Hito } // CD
  | { tipo: "notificar" }; // DRE, tras la resolución

/** Lo que el área del perfil debe hacer ahora con el expediente, o null si no le toca. */
export function obtenerTareaArea(expediente: ExpedienteFi, areaPerfil: string | null | undefined): TareaArea | null {
  if (expediente.estado !== "en_tramite") {
    return expediente.fechaNotificacion === null && esMismaArea("DRE", areaPerfil) ? { tipo: "notificar" } : null;
  }
  const hito = obtenerHitoPendiente(expediente);
  if (!hito || !esMismaArea(hito.area, areaPerfil) || !obtenerPaso(hito.codigoHito)) return null;
  return hito.codigoHito === "resolucion_cd" ? { tipo: "resolver", hito } : { tipo: "paso", hito };
}

/** Días hábiles que el expediente lleva en el área actual: sirve para ver el cuello de botella. */
export function calcularDiasEnArea(expediente: ExpedienteFi, fechaReferencia: string): number | null {
  const hito = obtenerHitoPendiente(expediente);
  return hito ? Math.max(0, contarDiasHabiles(hito.iniciadoEn, fechaReferencia)) : null;
}

export type PlazoPaso = {
  diasEnArea: number;
  plazoDiasHabiles: number | null; // null: el paso no tiene plazo propio, solo cuenta dentro de los 30 días
  venceEl: string | null;
  estaVencido: boolean;
};

/**
 * Plazo del paso actual, tomado del propio hito (plazo_referencial_dh del dataset ds02).
 * En el FI solo tienen plazo propio la derivación de la DRE (1 d.h.), la subsanación de la EP (2 d.h.)
 * y la información de la EP (hasta 10 d.h.). Los demás pasos no tienen plazo propio.
 */
export function obtenerPlazoPaso(expediente: ExpedienteFi, fechaReferencia: string): PlazoPaso | null {
  const hito = obtenerHitoPendiente(expediente);
  if (!hito) return null;
  const diasEnArea = Math.max(0, contarDiasHabiles(hito.iniciadoEn, fechaReferencia));
  const plazo = hito.plazoReferencialDiasHabiles;
  if (plazo == null) return { diasEnArea, plazoDiasHabiles: null, venceEl: null, estaVencido: false };
  return { diasEnArea, plazoDiasHabiles: plazo, venceEl: sumarDiasHabiles(hito.iniciadoEn, plazo), estaVencido: diasEnArea > plazo };
}

/** Numeración ficticia de documentos de la demo (no corresponde a documentos reales). */
export function generarNumeroDocumento(expediente: ExpedienteFi, tipo: "oficio" | "rcd", area: "DRE" | "SRT" = "DRE"): string {
  const correlativo = String(100 + expediente.documentos.length).padStart(3, "0");
  return tipo === "oficio" ? `N.° D${correlativo}-2026-SUNASS-${area} (demo)` : `RCD N.° D${correlativo}-2026-SUNASS-CD (demo)`;
}
