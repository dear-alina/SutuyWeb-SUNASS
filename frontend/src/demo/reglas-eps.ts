/**
 * Reglas que la vista de la EP necesita en la DEMO (en el MVP las calcula el backend).
 * Bases: RGT arts. 89.6–89.8; TUPA de la Sunass (DS 015-2025-PCM, mod. RCD 138-2025-SUNASS-CD);
 * TUO LPAG 2026 (DS 006-2026-JUS) arts. 24.1, 125.1, 125.3.1, 188.1, 188.2 y 207.2.
 */
import { contarDiasHabiles, sumarDiasHabiles } from "./calendario-demo";
import type { Documento, ExpedienteFi, Hito } from "./expedientes-demo";

export const PLAZO_SUBSANACION_DIAS_HABILES = 2; // LPAG 125.1
export const PLAZO_INFORMACION_MAXIMO_DIAS_HABILES = 10; // RGT 89.6
export const PLAZO_NOTIFICACION_DIAS = 5; // LPAG 24.1
export const PLAZO_RECONSIDERACION_DIAS_HABILES = 15; // TUPA; LPAG 207.2

export type Tono = "accion" | "alerta" | "informacion" | "exito" | "neutro";

export type AccionEps = {
  tipo: "subsanar" | "enviar_informacion";
  titulo: string;
  venceEl: string;
  diasHabilesRestantes: number;
  puedePedirProrroga: boolean;
  base: string;
};

export type PlazoSunass = {
  fechaLimite: string;
  fechaLimiteNotificacion: string;
  situacion: "en_plazo" | "vencido" | "silencio_configurado" | "resuelto_en_plazo" | "resuelto_tras_silencio";
};

export type SituacionEps = {
  textoEstado: string;
  tono: Tono;
  queEstaPasando: string;
  accion: AccionEps | null;
  plazo: PlazoSunass;
};

export type NotificacionEps = {
  codigo: string;
  codigoExpediente: string;
  tono: Tono;
  titulo: string;
  detalle: string;
  base: string;
};

const ETAPA_PARA_EPS: Record<string, string> = {
  solicitud: "Recibida por la Sunass",
  derivacion: "Recibida por la Sunass",
  asignacion: "Recibida por la Sunass",
  verificacion_tupa: "Revisión de requisitos",
  oficio_subsanacion: "Revisión de requisitos",
  subsanacion_ep: "Debe subsanar observaciones",
  evaluacion: "En evaluación técnica",
  oficio_informacion: "En evaluación técnica",
  informacion_ep: "Debe enviar información",
  informe: "En evaluación técnica",
  visado_informe: "En revisión técnica y legal",
  firma_informe_dre: "En revisión técnica y legal",
  firma_informe_oaj: "En revisión técnica y legal",
  memo_gg: "En aprobación interna",
  elevacion_cd: "En aprobación interna",
  resolucion_cd: "En el Consejo Directivo",
};

const QUE_PASA: Record<string, string> = {
  verificacion_tupa: "El equipo técnico revisa que su solicitud tenga los requisitos del TUPA.",
  evaluacion: "El equipo técnico evalúa el caso fortuito o de fuerza mayor y el uso propuesto.",
  informe: "El equipo técnico elabora el informe y el proyecto de resolución.",
  visado_informe: "La Subdirección de Regulación Tarifaria revisa el informe.",
  firma_informe_dre: "La Dirección de Regulación Económica revisa y firma el informe.",
  firma_informe_oaj: "La Oficina de Asesoría Jurídica revisa el informe técnico-legal.",
  memo_gg: "La Dirección de Regulación Económica envía su expediente a la Gerencia General.",
  elevacion_cd: "La Gerencia General revisa su expediente para elevarlo al Consejo Directivo.",
  resolucion_cd: "El Consejo Directivo está por resolver su solicitud.",
};

export const TEXTO_RESULTADO: Record<string, string> = {
  aprobado: "Aprobada",
  aprobado_parcial: "Aprobada en parte",
  denegado: "Denegada",
  archivado_no_subsana: "Archivada por no subsanar",
};

export function obtenerHitoPendiente(expediente: ExpedienteFi): Hito | null {
  if (expediente.estado !== "en_tramite") return null;
  return [...expediente.hitos].reverse().find((h) => !h.finalizadoEn) ?? null;
}

/** Días que la EP tardó en subsanar o responder: no corren para la Sunass (LPAG 125.3.1 y 125.5). */
function calcularDiasHabilesSuspension(expediente: ExpedienteFi, fechaReferencia?: string): number {
  return expediente.hitos
    .filter((h) => !h.cuentaPlazo && (h.finalizadoEn || fechaReferencia))
    .reduce((total, h) => total + Math.max(0, contarDiasHabiles(h.iniciadoEn, (h.finalizadoEn ?? fechaReferencia) as string)), 0);
}

export function calcularPlazoSunass(expediente: ExpedienteFi, fechaReferencia: string): PlazoSunass {
  const fechaLimite = sumarDiasHabiles(expediente.fechaInicio, expediente.plazoMaximoDiasHabiles + calcularDiasHabilesSuspension(expediente, fechaReferencia));
  const fechaLimiteNotificacion = sumarDiasHabiles(fechaLimite, PLAZO_NOTIFICACION_DIAS);
  let situacion: PlazoSunass["situacion"];
  if (expediente.fechaConclusion) {
    situacion = expediente.fechaConclusion > fechaLimiteNotificacion ? "resuelto_tras_silencio" : "resuelto_en_plazo";
  } else if (fechaReferencia > fechaLimiteNotificacion) situacion = "silencio_configurado";
  else if (fechaReferencia > fechaLimite) situacion = "vencido";
  else situacion = "en_plazo";
  return { fechaLimite, fechaLimiteNotificacion, situacion };
}

/** Días hábiles que lleva la Sunass, sin contar los que la EP tardó en subsanar o responder. */
export function calcularDiaDelPlazo(expediente: ExpedienteFi, fechaReferencia: string): number {
  const hasta = expediente.fechaConclusion && expediente.fechaConclusion < fechaReferencia ? expediente.fechaConclusion : fechaReferencia;
  return Math.max(0, contarDiasHabiles(expediente.fechaInicio, hasta) - calcularDiasHabilesSuspension(expediente, hasta));
}

/** Fecha del último movimiento del expediente. */
export function obtenerUltimoMovimiento(expediente: ExpedienteFi): string {
  return expediente.hitos.reduce((ultima, h) => {
    const fecha = h.finalizadoEn ?? h.iniciadoEn;
    return fecha > ultima ? fecha : ultima;
  }, expediente.fechaInicio);
}

/** Fecha en que empezó cada etapa visible para la EP (null si aún no empieza). */
export function obtenerInicioEtapa(expediente: ExpedienteFi, hitosEtapa: readonly string[]): string | null {
  const hito = expediente.hitos.find((h) => hitosEtapa.includes(h.codigoHito));
  return hito?.iniciadoEn ?? null;
}

export function obtenerSituacionEps(expediente: ExpedienteFi, fechaReferencia: string): SituacionEps {
  const plazo = calcularPlazoSunass(expediente, fechaReferencia);
  if (expediente.estado !== "en_tramite" && expediente.fechaNotificacion === null) {
    // Resuelta por el CD pero aún no notificada: para la EP el acto todavía no surte efecto (LPAG 16.1 y 24.1)
    return {
      textoEstado: "Resolución por notificar", tono: "informacion",
      queEstaPasando: "El Consejo Directivo ya resolvió. La Dirección de Regulación Económica le notificará la resolución por oficio en su casilla.",
      accion: null, plazo,
    };
  }
  if (expediente.estado !== "en_tramite") {
    const textoEstado = TEXTO_RESULTADO[expediente.resultado ?? ""] ?? "Concluida";
    return {
      textoEstado,
      tono: expediente.resultado === "denegado" || expediente.estado === "archivado" ? "alerta" : "exito",
      queEstaPasando: `Su solicitud fue resuelta el ${expediente.fechaConclusion?.split("-").reverse().join("/")}.`,
      accion: null,
      plazo,
    };
  }
  const pendiente = obtenerHitoPendiente(expediente);
  const codigoHito = pendiente?.codigoHito ?? "solicitud";
  let accion: AccionEps | null = null;
  if (pendiente && (codigoHito === "subsanacion_ep" || codigoHito === "informacion_ep")) {
    const plazoDias = pendiente.plazoReferencialDiasHabiles ?? (codigoHito === "subsanacion_ep" ? PLAZO_SUBSANACION_DIAS_HABILES : PLAZO_INFORMACION_MAXIMO_DIAS_HABILES);
    const venceEl = sumarDiasHabiles(pendiente.iniciadoEn, plazoDias);
    accion = {
      tipo: codigoHito === "subsanacion_ep" ? "subsanar" : "enviar_informacion",
      titulo: codigoHito === "subsanacion_ep" ? "Subsanar las observaciones a los requisitos" : "Enviar la información adicional solicitada",
      venceEl,
      diasHabilesRestantes: contarDiasHabiles(fechaReferencia, venceEl),
      puedePedirProrroga: codigoHito === "informacion_ep" && fechaReferencia <= venceEl, // una vez y antes del vencimiento
      base: codigoHito === "subsanacion_ep" ? "TUO LPAG art. 125.1" : "RGT art. 89.6",
    };
  }
  return {
    textoEstado: ETAPA_PARA_EPS[codigoHito] ?? "En trámite",
    tono: accion ? "accion" : plazo.situacion === "en_plazo" ? "informacion" : "alerta",
    queEstaPasando: QUE_PASA[codigoHito] ?? "La Sunass está revisando su expediente.",
    accion,
    plazo,
  };
}

/** La EP solo ve documentos públicos o restringidos a las partes (DS11, nivelAcceso). */
export function filtrarDocumentosParaEps(documentos: Documento[]): Documento[] {
  return documentos.filter((d) => d.nivelAcceso === "publico" || d.nivelAcceso === "restringido_partes");
}

/** Avance en lenguaje claro: agrupa los hitos internos en etapas que entiende la EP. */
export const ETAPAS_EPS = [
  { codigo: "recibida", texto: "Recibida", hitos: ["solicitud", "derivacion", "asignacion"] },
  { codigo: "requisitos", texto: "Requisitos", hitos: ["verificacion_tupa", "oficio_subsanacion", "subsanacion_ep"] },
  { codigo: "evaluacion", texto: "Evaluación", hitos: ["evaluacion", "oficio_informacion", "informacion_ep", "informe"] },
  { codigo: "revision", texto: "Revisión técnica y legal", hitos: ["visado_informe", "firma_informe_dre", "firma_informe_oaj"] },
  { codigo: "aprobacion", texto: "Aprobación interna", hitos: ["memo_gg", "elevacion_cd"] },
  { codigo: "resolucion", texto: "Resolución", hitos: ["resolucion_cd"] },
] as const;

export function generarNotificacionesEps(expedientes: ExpedienteFi[], fechaReferencia: string): NotificacionEps[] {
  const notificaciones: NotificacionEps[] = [];
  for (const expediente of expedientes) {
    const situacion = obtenerSituacionEps(expediente, fechaReferencia);
    const { plazo, accion } = situacion;
    const codigo = expediente.codigoExpediente;

    if (accion) {
      const esUrgente = accion.diasHabilesRestantes <= 2;
      notificaciones.push({
        codigo: `${codigo}-accion`, codigoExpediente: codigo, tono: esUrgente ? "alerta" : "accion",
        titulo: accion.diasHabilesRestantes < 0 ? `Plazo vencido: ${accion.titulo.toLowerCase()}` : accion.titulo,
        detalle: `Vence el ${accion.venceEl.split("-").reverse().join("/")}.` +
          (accion.tipo === "subsanar" ? " Si no subsana a tiempo, la solicitud se tendrá por no presentada (LPAG 125.4)." : "") +
          (accion.puedePedirProrroga ? " Puede pedir una prórroga una sola vez, antes del vencimiento." : ""),
        base: accion.base,
      });
    }
    if (plazo.situacion === "vencido") {
      notificaciones.push({
        codigo: `${codigo}-plazo`, codigoExpediente: codigo, tono: "alerta",
        titulo: "Venció el plazo legal de la Sunass para resolver",
        detalle: `El plazo de 30 días hábiles venció el ${plazo.fechaLimite.split("-").reverse().join("/")}. Si no se le notifica la decisión hasta el ${plazo.fechaLimiteNotificacion.split("-").reverse().join("/")}, opera el silencio administrativo positivo.`,
        base: "RGT art. 89.8; TUO LPAG arts. 24.1 y 188.1",
      });
    }
    if (plazo.situacion === "silencio_configurado") {
      notificaciones.push({
        codigo: `${codigo}-silencio`, codigoExpediente: codigo, tono: "alerta",
        titulo: "Su solicitud podría considerarse aprobada por silencio positivo",
        detalle: "No consta una notificación de la Sunass dentro del plazo legal más 5 días. Consulte con su área legal antes de actuar.",
        base: "RGT art. 89.8; TUO LPAG art. 188.1",
      });
    }
    if (expediente.fechaConclusion && expediente.fechaNotificacion !== null) {
      const desde = expediente.fechaNotificacion ?? expediente.fechaConclusion; // el plazo corre desde la notificación
      const diasDesdeResolucion = contarDiasHabiles(desde, fechaReferencia);
      if (diasDesdeResolucion >= 0 && diasDesdeResolucion <= PLAZO_RECONSIDERACION_DIAS_HABILES) {
        notificaciones.push({
          codigo: `${codigo}-resolucion`, codigoExpediente: codigo, tono: "informacion",
          titulo: `Resolución emitida: ${TEXTO_RESULTADO[expediente.resultado ?? ""] ?? "concluida"}`,
          detalle: `Si no está conforme, puede presentar reconsideración ante el Consejo Directivo dentro de ${PLAZO_RECONSIDERACION_DIAS_HABILES} días hábiles, con nueva prueba.`,
          base: "TUPA de la Sunass; TUO LPAG art. 207.2",
        });
      }
    }
  }
  return notificaciones;
}
