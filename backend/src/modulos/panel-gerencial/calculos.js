// Cálculos del panel gerencial de la DRE. Funciones puras: reciben filas ya leídas de la base.
// - Fecha límite: inicio + plazo máximo + días de suspensión, en días hábiles (TUO LPAG arts. 134.1, 125.3.1 y 125.5).
// - Límite para notificar: fecha límite + 5 días (TUO LPAG art. 24.1).
// - Silencio positivo: solo en el uso excepcional del fondo (TUPA de la Sunass, PA9000ED96; RGT art. 89.8).
//   En los demás procedimientos el panel no supone ningún silencio: solo marca el plazo vencido.
// - Plazo propio de cada paso: "plazoReferencialDiasHabiles" del hito (hoja Hitos).

export const PLAZO_NOTIFICACION_DIAS = 5;
const CON_SILENCIO_POSITIVO = new Set(["uso_excepcional_fondo"]);
/** Actores que no son áreas de Sunass: no cuentan para "¿dónde se demora?". */
const ACTORES_EXTERNOS = new Set(["ep", "ep_e_interesados", "inei"]);

/** Días en que la EP tuvo el expediente (subsanación, información): suspenden el plazo de Sunass. */
export function calcularDiasSuspension(hitos, fechaCorte, calendario) {
  return hitos
    .filter((h) => !h.cuentaPlazo)
    .reduce((total, h) => total + Math.max(0, calendario.contarDiasHabiles(h.iniciadoEn, h.finalizadoEn ?? fechaCorte)), 0);
}

/** Hito en curso: el de mayor número sin fecha de fin, solo si el expediente está en trámite. */
export function obtenerHitoActual(expediente, hitos) {
  if (expediente.estado !== "en_tramite") return null;
  return [...hitos].sort((a, b) => b.numero - a.numero).find((h) => !h.finalizadoEn) ?? null;
}

export function calcularPlazo(expediente, hitos, { fechaCorte, diasAlerta, calendario }) {
  const tieneSilencioPositivo = CON_SILENCIO_POSITIVO.has(expediente.tipoProcedimiento);
  if (expediente.plazoMaximoDiasHabiles == null) {
    return { fechaLimite: null, fechaLimiteNotificacion: null, diaDelPlazo: null, diasRestantes: null, diasSuspension: 0, semaforo: "sin_plazo" };
  }
  const diasSuspension = calcularDiasSuspension(hitos, fechaCorte, calendario);
  const fechaLimite = calendario.sumarDiasHabiles(expediente.fechaInicio, expediente.plazoMaximoDiasHabiles + diasSuspension);
  const limiteNotificacion = calendario.sumarDiasHabiles(fechaLimite, PLAZO_NOTIFICACION_DIAS);
  const hasta = expediente.fechaConclusion && expediente.fechaConclusion < fechaCorte ? expediente.fechaConclusion : fechaCorte;
  const diaDelPlazo = Math.max(0, calendario.contarDiasHabiles(expediente.fechaInicio, hasta) - diasSuspension);
  const diasRestantes = calendario.contarDiasHabiles(fechaCorte, fechaLimite);

  let semaforo;
  if (expediente.estado !== "en_tramite") {
    // Sin fecha de conclusión no se sabe si se resolvió a tiempo: no cuenta para el indicador (y figura en calidad de datos).
    if (!expediente.fechaConclusion) semaforo = "resuelto_sin_fecha";
    else semaforo = expediente.fechaConclusion > fechaLimite ? "resuelto_fuera_de_plazo" : "resuelto_en_plazo";
  } else if (tieneSilencioPositivo && fechaCorte > limiteNotificacion) semaforo = "silencio_positivo";
  else if (fechaCorte > fechaLimite) semaforo = "vencido";
  else if (diasRestantes <= diasAlerta) semaforo = "por_vencer";
  else semaforo = "en_plazo";

  return {
    fechaLimite,
    fechaLimiteNotificacion: tieneSilencioPositivo ? limiteNotificacion : null,
    diaDelPlazo,
    diasRestantes,
    diasSuspension,
    semaforo,
  };
}

/** Días hábiles promedio que cada área de Sunass tarda en sus pasos (incluye los pasos en curso hasta la fecha de corte). */
export function calcularTiempoPorArea(hitos, { fechaCorte, calendario }) {
  const grupos = new Map();
  for (const h of hitos) {
    if (ACTORES_EXTERNOS.has(h.responsable) || !h.cuentaPlazo) continue;
    const dias = Math.max(0, calendario.contarDiasHabiles(h.iniciadoEn, h.finalizadoEn ?? fechaCorte));
    grupos.set(h.responsable, [...(grupos.get(h.responsable) ?? []), dias]);
  }
  return [...grupos.entries()]
    .map(([area, dias]) => ({
      area,
      promedioDiasHabiles: Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10,
      maximoDiasHabiles: Math.max(...dias),
      cantidadPasos: dias.length,
    }))
    .sort((a, b) => b.promedioDiasHabiles - a.promedioDiasHabiles);
}

/** Pasos con plazo propio que lo superaron, terminados o en curso. */
export function buscarPasosFueraDePlazo(hitos, { fechaCorte, calendario }) {
  return hitos.flatMap((h) => {
    if (h.plazoReferencialDiasHabiles == null) return [];
    const dias = calendario.contarDiasHabiles(h.iniciadoEn, h.finalizadoEn ?? fechaCorte);
    return dias > h.plazoReferencialDiasHabiles
      ? [{ codigoExpediente: h.codigoExpediente, codigoHito: h.codigoHito, responsable: h.responsable, diasHabiles: dias, plazoDiasHabiles: h.plazoReferencialDiasHabiles, estaEnCurso: !h.finalizadoEn }]
      : [];
  });
}

/** Inconsistencias que el panel muestra en «Calidad de los datos». */
export function revisarCalidad(expedientes, hitos) {
  const observaciones = [];
  for (const e of expedientes) {
    if (e.estado === "concluido" && !e.fechaConclusion) {
      observaciones.push({ codigoExpediente: e.codigoExpediente, regla: "concluido_sin_fecha", detalle: "Figura como concluido pero no tiene fecha de conclusión." });
    }
  }
  for (const h of hitos) {
    if (h.finalizadoEn && h.finalizadoEn < h.iniciadoEn) {
      observaciones.push({ codigoExpediente: h.codigoExpediente, regla: "hito_termina_antes_de_iniciar", detalle: `El hito ${h.numero} (${h.codigoHito}) termina antes de iniciar.` });
    }
  }
  return observaciones;
}

/** Arma la respuesta completa del panel. */
export function construirPanel({ expedientes, hitos, fechaCorte, diasAlerta, calendario }) {
  const hitosPorExpediente = new Map();
  for (const h of hitos) hitosPorExpediente.set(h.codigoExpediente, [...(hitosPorExpediente.get(h.codigoExpediente) ?? []), h]);
  const opciones = { fechaCorte, diasAlerta, calendario };

  const calculados = expedientes.map((e) => {
    const propios = hitosPorExpediente.get(e.codigoExpediente) ?? [];
    return { e, hitoActual: obtenerHitoActual(e, propios), plazo: calcularPlazo(e, propios, opciones) };
  });
  const contar = (semaforo) => calculados.filter((x) => x.plazo.semaforo === semaforo).length;
  const resueltosEnPlazo = contar("resuelto_en_plazo");
  const resueltosConPlazo = resueltosEnPlazo + contar("resuelto_fuera_de_plazo");

  const vencimientos = calculados
    .filter((x) => x.e.estado === "en_tramite" && x.plazo.fechaLimite)
    .sort((a, b) => a.plazo.diasRestantes - b.plazo.diasRestantes)
    .map(({ e, hitoActual, plazo }) => ({
      codigoExpediente: e.codigoExpediente,
      codigoEps: e.codigoEps,
      tipoProcedimiento: e.tipoProcedimiento,
      areaActual: hitoActual?.responsable ?? null,
      hitoActual: hitoActual?.codigoHito ?? null,
      plazoMaximoDiasHabiles: e.plazoMaximoDiasHabiles,
      ...plazo,
    }));

  return {
    fechaCorte,
    diasAlerta,
    indicadores: {
      enTramite: calculados.filter((x) => x.e.estado === "en_tramite").length,
      porVencer: contar("por_vencer"),
      plazoVencido: contar("vencido"),
      silencioPositivo: contar("silencio_positivo"),
      resueltosEnPlazo,
      resueltosConPlazo,
      porcentajeResueltosEnPlazo: resueltosConPlazo ? Math.round((100 * resueltosEnPlazo) / resueltosConPlazo) : null,
    },
    vencimientos,
    tiempoPorArea: calcularTiempoPorArea(hitos, opciones),
    pasosFueraDePlazo: buscarPasosFueraDePlazo(hitos, opciones),
    calidadDatos: revisarCalidad(expedientes, hitos),
  };
}
