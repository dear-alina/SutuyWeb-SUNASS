import { z } from "../../compartido/zod.js";
import { registro, respuestaJson, respuestaProblema } from "../../compartido/esquemas-comunes.js";

export const TIPOS_PROCEDIMIENTO = [
  "cambio_programa_inversiones", "reajuste_ipm", "reporte_periodico",
  "revision_periodica", "uso_excepcional_fondo", "verificacion_incremento",
];

const AREAS = ["ep", "ep_e_interesados", "dre", "srt", "equipo_srt", "oaj", "du", "gg", "cd", "inei"];
const SEMAFOROS = ["silencio_positivo", "vencido", "por_vencer", "en_plazo", "resuelto_en_plazo", "resuelto_fuera_de_plazo", "resuelto_sin_fecha", "sin_plazo"];

/** Fecha de hoy en Lima (AAAA-MM-DD). */
export const hoyEnLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());

export const esquemaConsultaPanel = z.strictObject({
  fechaCorte: z.iso.date("Use el formato AAAA-MM-DD.").optional().openapi({ example: "2026-09-30", description: "Por defecto, hoy en Lima." }),
  diasAlerta: z.coerce.number().int().min(1).max(30).default(5).openapi({ description: "Días hábiles de anticipación para «por vencer». Criterio de gestión, no normativo." }),
  tipoProcedimiento: z.enum(TIPOS_PROCEDIMIENTO).optional(),
});

const fecha = z.iso.date();

const esquemaVencimiento = registro.register(
  "VencimientoPanel",
  z.object({
    codigoExpediente: z.string(),
    codigoEps: z.string(),
    tipoProcedimiento: z.enum(TIPOS_PROCEDIMIENTO),
    areaActual: z.enum(AREAS).nullable(),
    hitoActual: z.string().nullable(),
    plazoMaximoDiasHabiles: z.number().int(),
    fechaLimite: fecha,
    fechaLimiteNotificacion: fecha.nullable().openapi({ description: "Solo en procedimientos con silencio positivo." }),
    diaDelPlazo: z.number().int(),
    diasRestantes: z.number().int().openapi({ description: "Negativo si el plazo venció." }),
    diasSuspension: z.number().int(),
    semaforo: z.enum(SEMAFOROS),
  }),
);

export const esquemaPanel = registro.register(
  "PanelGerencial",
  z.object({
    fechaCorte: fecha,
    diasAlerta: z.number().int(),
    tipoProcedimiento: z.enum(TIPOS_PROCEDIMIENTO).nullable(),
    indicadores: z.object({
      enTramite: z.number().int(),
      porVencer: z.number().int(),
      plazoVencido: z.number().int(),
      silencioPositivo: z.number().int(),
      resueltosEnPlazo: z.number().int(),
      resueltosConPlazo: z.number().int(),
      porcentajeResueltosEnPlazo: z.number().int().nullable(),
    }),
    vencimientos: z.array(esquemaVencimiento),
    tiempoPorArea: z.array(z.object({
      area: z.enum(AREAS),
      promedioDiasHabiles: z.number(),
      maximoDiasHabiles: z.number().int(),
      cantidadPasos: z.number().int(),
    })),
    pasosFueraDePlazo: z.array(z.object({
      codigoExpediente: z.string(),
      codigoHito: z.string(),
      responsable: z.enum(AREAS),
      diasHabiles: z.number().int(),
      plazoDiasHabiles: z.number().int(),
      estaEnCurso: z.boolean(),
    })),
    calidadDatos: z.array(z.object({
      codigoExpediente: z.string(),
      regla: z.enum(["concluido_sin_fecha", "hito_termina_antes_de_iniciar"]),
      detalle: z.string(),
    })),
  }),
);

registro.registerPath({
  method: "get",
  path: "/api/v1/panel-gerencial",
  summary: "Panel gerencial de plazos (Sunass)",
  description:
    "Indicadores, vencimientos, tiempo por área, pasos fuera de su plazo propio y calidad de datos, calculados en días hábiles a la fecha de corte. " +
    "Los expedientes iniciados después de la fecha de corte no se incluyen; los concluidos después se tratan como en trámite.",
  request: { query: esquemaConsultaPanel },
  responses: {
    200: respuestaJson("Panel calculado a la fecha de corte.", esquemaPanel),
    401: respuestaProblema("sesion_requerida"),
    403: respuestaProblema("acceso_denegado"),
    422: respuestaProblema("validacion_fallida"),
  },
});
