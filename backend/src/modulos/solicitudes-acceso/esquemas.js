import { z } from "../../compartido/zod.js";
import { esquemaPaginacion, registro, respuestaJson, respuestaProblema } from "../../compartido/esquemas-comunes.js";
import { esquemaRuc } from "../sesiones/esquemas.js";

const texto = (maximo) => z.string().trim().min(1, "Este campo es obligatorio.").max(maximo);

export const esquemaNuevaSolicitud = registro.register(
  "NuevaSolicitudAcceso",
  z.strictObject({
    ruc: esquemaRuc.openapi({ example: "99000000002" }),
    nombre: texto(120),
    cargo: z.string().trim().max(120).nullish().transform((valor) => valor || null),
    correo: z.email("Ingrese un correo válido.").transform((valor) => valor.toLowerCase()),
    clave: z.string().min(8, "La clave debe tener al menos 8 caracteres.").max(72),
  }),
);

export const esquemaSolicitud = registro.register(
  "SolicitudAcceso",
  z.object({
    solicitudAccesoId: z.uuid(),
    nombre: z.string(),
    cargo: z.string().nullable(),
    correo: z.string(),
    estado: z.enum(["pendiente", "aprobada", "rechazada"]),
    codigoEps: z.string(),
    nombreEps: z.string(),
    motivoRechazo: z.string().nullable(),
    solicitadoEn: z.iso.datetime(),
    resueltoEn: z.iso.datetime().nullable(),
  }),
);

export const esquemaSolicitudCreada = registro.register(
  "SolicitudAccesoCreada",
  z.object({ solicitudAccesoId: z.uuid(), estado: z.literal("pendiente"), solicitadoEn: z.iso.datetime() }),
);

export const esquemaListado = z.strictObject({
  estado: z.enum(["pendiente", "aprobada", "rechazada"]).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanoPagina: z.coerce.number().int().min(1).max(100).default(20),
  orden: z.enum(["solicitadoEn", "-solicitadoEn", "nombre", "-nombre"]).default("-solicitadoEn"),
});

export const esquemaIdSolicitud = z.strictObject({ solicitudAccesoId: z.uuid("Identificador inválido.") });

export const esquemaRechazo = registro.register(
  "RechazoSolicitud",
  z.strictObject({ motivoRechazo: texto(500) }),
);

const esquemaPaginaSolicitudes = registro.register(
  "PaginaSolicitudesAcceso",
  z.object({ datos: z.array(esquemaSolicitud), paginacion: esquemaPaginacion }),
);

registro.registerPath({
  method: "post",
  path: "/api/v1/solicitudes-acceso",
  summary: "Solicitar acceso como EPS (público)",
  request: { body: { content: { "application/json": { schema: esquemaNuevaSolicitud } } } },
  responses: {
    201: respuestaJson("Solicitud creada, pendiente de aprobación.", esquemaSolicitudCreada),
    409: respuestaProblema("solicitud_pendiente o correo_registrado"),
    422: respuestaProblema("validacion_fallida"),
    429: respuestaProblema("demasiados_intentos"),
  },
});

registro.registerPath({
  method: "get",
  path: "/api/v1/solicitudes-acceso",
  summary: "Listar solicitudes de acceso (Admin)",
  request: { query: esquemaListado },
  responses: {
    200: respuestaJson("Página de solicitudes.", esquemaPaginaSolicitudes),
    401: respuestaProblema("sesion_requerida"),
    403: respuestaProblema("acceso_denegado"),
    422: respuestaProblema("validacion_fallida"),
  },
});

registro.registerPath({
  method: "post",
  path: "/api/v1/solicitudes-acceso/{solicitudAccesoId}/aprobacion",
  summary: "Aprobar una solicitud (Admin)",
  request: { params: esquemaIdSolicitud },
  responses: {
    200: respuestaJson("Solicitud aprobada; se creó el perfil eps.", esquemaSolicitud),
    403: respuestaProblema("acceso_denegado"),
    404: respuestaProblema("solicitud_no_encontrada"),
    409: respuestaProblema("solicitud_resuelta"),
  },
});

registro.registerPath({
  method: "post",
  path: "/api/v1/solicitudes-acceso/{solicitudAccesoId}/rechazo",
  summary: "Rechazar una solicitud (Admin)",
  request: { params: esquemaIdSolicitud, body: { content: { "application/json": { schema: esquemaRechazo } } } },
  responses: {
    200: respuestaJson("Solicitud rechazada; se eliminó la cuenta de Auth.", esquemaSolicitud),
    403: respuestaProblema("acceso_denegado"),
    404: respuestaProblema("solicitud_no_encontrada"),
    409: respuestaProblema("solicitud_resuelta"),
    422: respuestaProblema("validacion_fallida"),
  },
});
