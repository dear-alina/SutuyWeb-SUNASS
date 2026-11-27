/**
 * Cálculos del panel gerencial de la DRE (DEMO; en el MVP los hace el backend).
 * - Fecha límite: inicio + plazo máximo en días hábiles + días de suspensión (TUO LPAG arts. 134.1 y 125.3.1).
 * - Límite para notificar: fecha límite + 5 días (TUO LPAG art. 24.1).
 * - Silencio positivo: solo en el uso excepcional del fondo (TUPA de la Sunass, PA9000ED96; RGT 89.8).
 *   Para los demás procedimientos el panel no supone ningún silencio: solo marca el plazo vencido.
 * - Plazo propio de cada paso: plazo_referencial_dh de la hoja Hitos (derivación 1, subsanación 2, información 10).
 */
import { contarDiasHabiles, sumarDiasHabiles } from "./calendario-demo";
import type { ExpedienteFi } from "./expedientes-demo";
import type { FilaCsv } from "./lector-csv";

export const PLAZO_NOTIFICACION_DIAS = 5;
const CON_SILENCIO_POSITIVO = new Set(["uso_excepcional_fondo"]);

export const NOMBRE_PROCEDIMIENTO: Record<string, string> = {
  uso_excepcional_fondo: "Uso excepcional del fondo (FI)",
  cambio_programa_inversiones: "Cambio del programa de inversiones",
  revision_periodica: "Revisión periódica",
  verificacion_incremento: "Verificación de incrementos",
  reajuste_ipm: "Reajuste por IPM",
  reporte_periodico: "Reporte periódico",
};

export type ExpedientePanel = {
  codigoExpediente: string;
  codigoEps: string;
  tipoProcedimiento: string;
  fechaInicio: string;
  plazoMaximoDiasHabiles: number | null;
  diasSuspension: number;
  estado: string;
  resultado: string | null;
  fechaConclusion: string | null;
  hitoActual: string | null;
  responsableActual: string | null;
  fechaLimiteDeclarada: string | null; // la que trae el archivo, para contrastarla con la calculada
};

export type HitoPanel = {
  codigoExpediente: string;
  codigoHito: string;
  responsable: string;
  iniciadoEn: string;
  finalizadoEn: string | null;
  plazoReferencialDiasHabiles: number | null;
  cuentaPlazo: boolean;
};

export type Observacion = { fila: number; codigo: string; texto: string };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const esFecha = (v: string | undefined) => !!v && FECHA.test(v);
const numero = (v: string | undefined) => (v && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : null);

/** Normaliza el responsable: «Equipo SRT» y «equipo_srt» son la misma área. */
export function normalizarArea(area: string | null | undefined): string {
  if (!area) return "—";
  const a = area.trim().toLowerCase().replace(/\s+/g, "_");
  return a === "equipo_srt" ? "Equipo SRT" : a.toUpperCase();
}

export function leerProcedimientos(filas: FilaCsv[]): { expedientes: ExpedientePanel[]; observaciones: Observacion[] } {
  const observaciones: Observacion[] = [];
  const vistos = new Set<string>();
  const expedientes: ExpedientePanel[] = [];
  filas.forEach((f, i) => {
    const fila = i + 2; // +1 por la cabecera, +1 porque las hojas cuentan desde 1
    const codigo = f.id_expediente ?? "";
    if (!codigo) { observaciones.push({ fila, codigo: "—", texto: "Fila sin id_expediente: no se usa." }); return; }
    if (vistos.has(codigo)) { observaciones.push({ fila, codigo, texto: "Expediente repetido: se usa solo la primera fila." }); return; }
    if (!esFecha(f.fecha_inicio)) { observaciones.push({ fila, codigo, texto: `fecha_inicio no válida («${f.fecha_inicio ?? ""}»): no se puede calcular el plazo.` }); return; }
    if (f.estado === "concluido" && !esFecha(f.fecha_conclusion)) observaciones.push({ fila, codigo, texto: "Concluido sin fecha_conclusion." });
    vistos.add(codigo);
    expedientes.push({
      codigoExpediente: codigo,
      codigoEps: f.cod_eps ?? "",
      tipoProcedimiento: f.tipo_procedimiento ?? "",
      fechaInicio: f.fecha_inicio,
      plazoMaximoDiasHabiles: numero(f.plazo_maximo_dh),
      diasSuspension: numero(f.dias_suspension_dh) ?? 0,
      estado: f.estado ?? "",
      resultado: f.resultado || null,
      fechaConclusion: esFecha(f.fecha_conclusion) ? f.fecha_conclusion : null,
      hitoActual: f.hito_actual || null,
      responsableActual: f.responsable_actual || null,
      fechaLimiteDeclarada: esFecha(f.fecha_limite) ? f.fecha_limite : null,
    });
  });
  return { expedientes, observaciones };
}

export function leerHitos(filas: FilaCsv[]): { hitos: HitoPanel[]; observaciones: Observacion[] } {
  const observaciones: Observacion[] = [];
  const hitos: HitoPanel[] = [];
  filas.forEach((f, i) => {
    const fila = i + 2;
    if (!f.id_expediente || !esFecha(f.fecha_inicio)) { observaciones.push({ fila, codigo: f.id_expediente || "—", texto: "Hito sin expediente o sin fecha_inicio válida: no se usa." }); return; }
    if (f.fecha_fin && !esFecha(f.fecha_fin)) observaciones.push({ fila, codigo: f.id_expediente, texto: `fecha_fin no válida («${f.fecha_fin}»).` });
    if (esFecha(f.fecha_fin) && f.fecha_fin < f.fecha_inicio) observaciones.push({ fila, codigo: f.id_expediente, texto: "fecha_fin anterior a fecha_inicio." });
    hitos.push({
      codigoExpediente: f.id_expediente,
      codigoHito: f.hito ?? "",
      responsable: normalizarArea(f.responsable),
      iniciadoEn: f.fecha_inicio,
      finalizadoEn: esFecha(f.fecha_fin) ? f.fecha_fin : null,
      plazoReferencialDiasHabiles: numero(f.plazo_referencial_dh),
      cuentaPlazo: (f.cuenta_plazo ?? "True").toLowerCase() !== "false",
    });
  });
  return { hitos, observaciones };
}

/** Datos de la demo (los de la bandeja), para cuando todavía no se carga ningún archivo. */
export function desdeExpedientesDemo(lista: ExpedienteFi[]): { expedientes: ExpedientePanel[]; hitos: HitoPanel[] } {
  const hitos: HitoPanel[] = lista.flatMap((e) => e.hitos.map((h) => ({
    codigoExpediente: e.codigoExpediente, codigoHito: h.codigoHito, responsable: normalizarArea(h.area),
    iniciadoEn: h.iniciadoEn, finalizadoEn: h.finalizadoEn, plazoReferencialDiasHabiles: h.plazoReferencialDiasHabiles, cuentaPlazo: h.cuentaPlazo,
  })));
  const expedientes = lista.map((e) => {
    const pendiente = e.estado === "en_tramite" ? [...e.hitos].reverse().find((h) => !h.finalizadoEn) : undefined;
    const suspension = e.hitos.filter((h) => !h.cuentaPlazo && h.finalizadoEn).reduce((t, h) => t + contarDiasHabiles(h.iniciadoEn, h.finalizadoEn as string), 0);
    return {
      codigoExpediente: e.codigoExpediente, codigoEps: e.codigoEps, tipoProcedimiento: e.tipoProcedimiento, fechaInicio: e.fechaInicio,
      plazoMaximoDiasHabiles: e.plazoMaximoDiasHabiles, diasSuspension: suspension, estado: e.estado, resultado: e.resultado,
      fechaConclusion: e.fechaConclusion, hitoActual: pendiente?.codigoHito ?? null, responsableActual: pendiente?.area ?? null, fechaLimiteDeclarada: null,
    };
  });
  return { expedientes, hitos };
}

export type Semaforo = "silencio" | "vencido" | "riesgo" | "en_plazo" | "resuelto_en_plazo" | "resuelto_fuera" | "sin_plazo";

export type CalculoPlazo = {
  fechaLimite: string | null;
  fechaLimiteNotificacion: string | null;
  diaDelPlazo: number | null;
  diasRestantes: number | null;
  semaforo: Semaforo;
  tieneSilencioPositivo: boolean;
  difiereDeLaDeclarada: boolean;
};

export function calcularPlazo(e: ExpedientePanel, fechaCorte: string, diasAlerta: number): CalculoPlazo {
  const tieneSilencioPositivo = CON_SILENCIO_POSITIVO.has(e.tipoProcedimiento);
  if (e.plazoMaximoDiasHabiles == null) {
    return { fechaLimite: null, fechaLimiteNotificacion: null, diaDelPlazo: null, diasRestantes: null, semaforo: "sin_plazo", tieneSilencioPositivo, difiereDeLaDeclarada: false };
  }
  const fechaLimite = sumarDiasHabiles(e.fechaInicio, e.plazoMaximoDiasHabiles + e.diasSuspension);
  const fechaLimiteNotificacion = sumarDiasHabiles(fechaLimite, PLAZO_NOTIFICACION_DIAS);
  const hasta = e.fechaConclusion && e.fechaConclusion < fechaCorte ? e.fechaConclusion : fechaCorte;
  const diaDelPlazo = Math.max(0, contarDiasHabiles(e.fechaInicio, hasta) - e.diasSuspension);
  const diasRestantes = contarDiasHabiles(fechaCorte, fechaLimite);
  const difiereDeLaDeclarada = !!e.fechaLimiteDeclarada && e.fechaLimiteDeclarada !== fechaLimite;

  let semaforo: Semaforo;
  if (e.estado !== "en_tramite") semaforo = e.fechaConclusion && e.fechaConclusion > fechaLimite ? "resuelto_fuera" : "resuelto_en_plazo";
  else if (tieneSilencioPositivo && fechaCorte > fechaLimiteNotificacion) semaforo = "silencio";
  else if (fechaCorte > fechaLimite) semaforo = "vencido";
  else if (diasRestantes <= diasAlerta) semaforo = "riesgo";
  else semaforo = "en_plazo";
  return { fechaLimite, fechaLimiteNotificacion: tieneSilencioPositivo ? fechaLimiteNotificacion : null, diaDelPlazo, diasRestantes, semaforo, tieneSilencioPositivo, difiereDeLaDeclarada };
}

/** La EP, los interesados y entidades externas (INEI) no son áreas de la Sunass. */
const ACTORES_EXTERNOS = /^(EP|EP_.*|INEI)$/;

export type TiempoPorArea = { area: string; promedio: number; maximo: number; pasos: number };

/** Días hábiles promedio que cada área de la Sunass tarda en sus pasos (sin la EP ni los pasos que no cuentan). */
export function calcularTiempoPorArea(hitos: HitoPanel[], fechaCorte: string, codigos?: Set<string>): TiempoPorArea[] {
  const grupos = new Map<string, number[]>();
  for (const h of hitos) {
    if (ACTORES_EXTERNOS.test(h.responsable) || !h.cuentaPlazo || (codigos && !codigos.has(h.codigoExpediente))) continue;
    const dias = Math.max(0, contarDiasHabiles(h.iniciadoEn, h.finalizadoEn ?? fechaCorte));
    grupos.set(h.responsable, [...(grupos.get(h.responsable) ?? []), dias]);
  }
  return [...grupos.entries()]
    .map(([area, dias]) => ({ area, promedio: dias.reduce((a, b) => a + b, 0) / dias.length, maximo: Math.max(...dias), pasos: dias.length }))
    .sort((a, b) => b.promedio - a.promedio);
}

export type PasoFueraDePlazo = { codigoExpediente: string; codigoHito: string; responsable: string; dias: number; plazo: number; enCurso: boolean };

/** Pasos con plazo propio (hoja Hitos) que lo superaron, terminados o en curso. */
export function buscarPasosFueraDePlazo(hitos: HitoPanel[], fechaCorte: string, codigos?: Set<string>): PasoFueraDePlazo[] {
  return hitos.flatMap((h) => {
    if (h.plazoReferencialDiasHabiles == null || (codigos && !codigos.has(h.codigoExpediente))) return [];
    const dias = contarDiasHabiles(h.iniciadoEn, h.finalizadoEn ?? fechaCorte);
    return dias > h.plazoReferencialDiasHabiles
      ? [{ codigoExpediente: h.codigoExpediente, codigoHito: h.codigoHito, responsable: h.responsable, dias, plazo: h.plazoReferencialDiasHabiles, enCurso: !h.finalizadoEn }]
      : [];
  });
}
