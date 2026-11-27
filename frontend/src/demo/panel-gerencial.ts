/**
 * Cálculos del panel gerencial de la DRE para el modo demo sin backend (con backend: GET /api/v1/panel-gerencial).
 * - Fecha límite: inicio + plazo máximo en días hábiles + días de suspensión (TUO LPAG arts. 134.1 y 125.3.1).
 * - Límite para notificar: fecha límite + 5 días (TUO LPAG art. 24.1).
 * - Silencio positivo: solo en el uso excepcional del fondo (TUPA de la Sunass, PA9000ED96; RGT 89.8).
 *   Para los demás procedimientos el panel no supone ningún silencio: solo marca el plazo vencido.
 * - Plazo propio de cada paso: plazo_referencial_dh de la hoja Hitos (derivación 1, subsanación 2, información 10).
 */
import { contarDiasHabiles, sumarDiasHabiles } from "./calendario-demo";
import type { ExpedienteFi } from "./expedientes-demo";
import type { FilaCsv } from "./lector-csv";
import type { ObservacionCalidad, PanelGerencial, Semaforo, VencimientoPanel } from "@/servicios/api/panel-gerencial";

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

/** Normaliza el responsable al código de área. */
export function normalizarArea(area: string): string;
export function normalizarArea(area: string | null | undefined): string | null;
export function normalizarArea(area: string | null | undefined): string | null {
  // Mismo catálogo que la base: «Equipo SRT» → equipo_srt, «EP e interesados» → ep_e_interesados, «DRE» → dre
  if (!area) return null;
  return area.trim().toLowerCase().replace(/\s+/g, "_");
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
      responsableActual: normalizarArea(f.responsable_actual || null),
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
      fechaConclusion: e.fechaConclusion, hitoActual: pendiente?.codigoHito ?? null, responsableActual: normalizarArea(pendiente?.area ?? null), fechaLimiteDeclarada: null,
    };
  });
  return { expedientes, hitos };
}

/** La EP, los interesados y entidades externas (INEI) no son áreas de la Sunass. */
const ACTORES_EXTERNOS = new Set(["ep", "ep_e_interesados", "inei"]);

/**
 * Panel calculado en el navegador, con la MISMA forma que GET /api/v1/panel-gerencial.
 * Solo se usa en el modo demo sin backend; con backend, la pantalla consulta la API.
 */
export function construirPanelLocal(
  { expedientes, hitos }: { expedientes: ExpedientePanel[]; hitos: HitoPanel[] },
  { fechaCorte, diasAlerta, tipoProcedimiento }: { fechaCorte: string; diasAlerta: number; tipoProcedimiento: string | null },
): PanelGerencial {
  const filtrados = expedientes.filter((e) => e.fechaInicio <= fechaCorte && (!tipoProcedimiento || e.tipoProcedimiento === tipoProcedimiento));
  const codigos = new Set(filtrados.map((e) => e.codigoExpediente));
  const propios = hitos.filter((h) => codigos.has(h.codigoExpediente) && h.iniciadoEn <= fechaCorte);

  const calculados = filtrados.map((e) => {
    const tieneSilencioPositivo = CON_SILENCIO_POSITIVO.has(e.tipoProcedimiento);
    if (e.plazoMaximoDiasHabiles == null) return { e, semaforo: "sin_plazo" as Semaforo, plazo: null };
    const fechaLimite = sumarDiasHabiles(e.fechaInicio, e.plazoMaximoDiasHabiles + e.diasSuspension);
    const limiteNotificacion = sumarDiasHabiles(fechaLimite, PLAZO_NOTIFICACION_DIAS);
    const hasta = e.fechaConclusion && e.fechaConclusion < fechaCorte ? e.fechaConclusion : fechaCorte;
    const diaDelPlazo = Math.max(0, contarDiasHabiles(e.fechaInicio, hasta) - e.diasSuspension);
    const diasRestantes = contarDiasHabiles(fechaCorte, fechaLimite);
    let semaforo: Semaforo;
    if (e.estado !== "en_tramite") {
      // Sin fecha de conclusión no se sabe si se resolvió a tiempo: no cuenta para el indicador.
      semaforo = !e.fechaConclusion ? "resuelto_sin_fecha" : e.fechaConclusion > fechaLimite ? "resuelto_fuera_de_plazo" : "resuelto_en_plazo";
    } else if (tieneSilencioPositivo && fechaCorte > limiteNotificacion) semaforo = "silencio_positivo";
    else if (fechaCorte > fechaLimite) semaforo = "vencido";
    else if (diasRestantes <= diasAlerta) semaforo = "por_vencer";
    else semaforo = "en_plazo";
    return { e, semaforo, plazo: { fechaLimite, fechaLimiteNotificacion: tieneSilencioPositivo ? limiteNotificacion : null, diaDelPlazo, diasRestantes } };
  });
  const contar = (s: Semaforo) => calculados.filter((x) => x.semaforo === s).length;
  const resueltosEnPlazo = contar("resuelto_en_plazo");
  const resueltosConPlazo = resueltosEnPlazo + contar("resuelto_fuera_de_plazo");

  const vencimientos: VencimientoPanel[] = calculados
    .flatMap(({ e, semaforo, plazo }) => (e.estado === "en_tramite" && plazo ? [{
      codigoExpediente: e.codigoExpediente, codigoEps: e.codigoEps, tipoProcedimiento: e.tipoProcedimiento,
      areaActual: e.responsableActual, hitoActual: e.hitoActual, plazoMaximoDiasHabiles: e.plazoMaximoDiasHabiles as number,
      diasSuspension: e.diasSuspension, semaforo, ...plazo,
    }] : []))
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const grupos = new Map<string, number[]>();
  for (const h of propios) {
    if (ACTORES_EXTERNOS.has(h.responsable) || !h.cuentaPlazo) continue;
    grupos.set(h.responsable, [...(grupos.get(h.responsable) ?? []), Math.max(0, contarDiasHabiles(h.iniciadoEn, h.finalizadoEn ?? fechaCorte))]);
  }
  const tiempoPorArea = [...grupos.entries()]
    .map(([area, dias]) => ({ area, promedioDiasHabiles: Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10, maximoDiasHabiles: Math.max(...dias), cantidadPasos: dias.length }))
    .sort((a, b) => b.promedioDiasHabiles - a.promedioDiasHabiles);

  const pasosFueraDePlazo = propios.flatMap((h) => {
    if (h.plazoReferencialDiasHabiles == null) return [];
    const dias = contarDiasHabiles(h.iniciadoEn, h.finalizadoEn ?? fechaCorte);
    return dias > h.plazoReferencialDiasHabiles
      ? [{ codigoExpediente: h.codigoExpediente, codigoHito: h.codigoHito, responsable: h.responsable, diasHabiles: dias, plazoDiasHabiles: h.plazoReferencialDiasHabiles, estaEnCurso: !h.finalizadoEn }]
      : [];
  });

  const calidadDatos: ObservacionCalidad[] = [
    ...filtrados.filter((e) => e.estado === "concluido" && !e.fechaConclusion)
      .map((e) => ({ codigoExpediente: e.codigoExpediente, regla: "concluido_sin_fecha", detalle: "Figura como concluido pero no tiene fecha de conclusión." })),
    ...propios.filter((h) => h.finalizadoEn && h.finalizadoEn < h.iniciadoEn)
      .map((h) => ({ codigoExpediente: h.codigoExpediente, regla: "hito_termina_antes_de_iniciar", detalle: `El hito ${h.codigoHito} termina antes de iniciar.` })),
    // Solo con archivo cargado: contraste con la fecha límite que trae el CSV
    ...calculados.flatMap(({ e, plazo }) => (plazo && e.fechaLimiteDeclarada && e.fechaLimiteDeclarada !== plazo.fechaLimite
      ? [{ codigoExpediente: e.codigoExpediente, regla: "fecha_limite_distinta", detalle: `El archivo dice ${e.fechaLimiteDeclarada.split("-").reverse().join("/")}; el cálculo da ${plazo.fechaLimite.split("-").reverse().join("/")}.` }]
      : [])),
  ];

  return {
    fechaCorte, diasAlerta, tipoProcedimiento,
    indicadores: {
      enTramite: filtrados.filter((e) => e.estado === "en_tramite").length,
      porVencer: contar("por_vencer"), plazoVencido: contar("vencido"), silencioPositivo: contar("silencio_positivo"),
      resueltosEnPlazo, resueltosConPlazo,
      porcentajeResueltosEnPlazo: resueltosConPlazo ? Math.round((100 * resueltosEnPlazo) / resueltosConPlazo) : null,
    },
    vencimientos, tiempoPorArea, pasosFueraDePlazo, calidadDatos,
  };
}
