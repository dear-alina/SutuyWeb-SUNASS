// Errores en formato RFC 9457 (problem+json).
import { ZodError } from "zod";

export class Problema extends Error {
  constructor(status, codigo, titulo, detalle, errores) {
    super(detalle ?? titulo);
    this.status = status;
    this.codigo = codigo;
    this.titulo = titulo;
    this.detalle = detalle;
    this.errores = errores;
  }
}

export const credencialesInvalidas = () =>
  new Problema(401, "credenciales_invalidas", "Credenciales inválidas", "El usuario o la clave no son correctos.");

export const sesionRequerida = () =>
  new Problema(401, "sesion_requerida", "Sesión requerida", "Inicie sesión para continuar.");

/** Error de validación (422) con un solo campo. */
export const errorDeCampo = (campo, mensaje) =>
  new Problema(422, "validacion_fallida", "La solicitud no es válida", "Revise los campos indicados.", [{ campo, mensaje }]);

/** Errores de Zod → errores[{campo, mensaje}]. */
export function erroresDeZod(error, prefijo) {
  return error.issues.flatMap((problema) => {
    if (problema.code === "unrecognized_keys") {
      return problema.keys.map((clave) => ({ campo: clave, mensaje: "Campo no permitido." }));
    }
    const ruta = problema.path.join(".");
    return [{ campo: ruta || prefijo, mensaje: problema.message }];
  });
}

export function enviarProblema(req, res, { status, codigo, titulo, detalle, errores }) {
  const cuerpo = {
    type: `urn:sutuyweb:error:${codigo}`,
    title: titulo,
    status,
    detail: detalle ?? titulo,
    instance: req.originalUrl.split("?")[0],
    codigo,
    trazaId: req.trazaId,
  };
  if (errores) cuerpo.errores = errores;
  res.status(status).type("application/problem+json").send(JSON.stringify(cuerpo));
}

/** Manejador final de errores. */
export function manejarErrores(error, req, res, _siguiente) {
  if (error instanceof Problema) {
    return enviarProblema(req, res, {
      status: error.status,
      codigo: error.codigo,
      titulo: error.titulo,
      detalle: error.detalle,
      errores: error.errores,
    });
  }
  if (error instanceof ZodError) {
    return enviarProblema(req, res, {
      status: 422,
      codigo: "validacion_fallida",
      titulo: "La solicitud no es válida",
      detalle: "Revise los campos indicados.",
      errores: erroresDeZod(error, "cuerpo"),
    });
  }
  if (error?.type === "entity.parse.failed") {
    return enviarProblema(req, res, {
      status: 400,
      codigo: "cuerpo_invalido",
      titulo: "Cuerpo mal formado",
      detalle: "El cuerpo de la petición no es un JSON válido.",
    });
  }
  if (error?.type === "entity.too.large") {
    return enviarProblema(req, res, {
      status: 413,
      codigo: "cuerpo_demasiado_grande",
      titulo: "Cuerpo demasiado grande",
      detalle: "El cuerpo de la petición supera el tamaño permitido.",
    });
  }
  console.error(`[${req.trazaId}]`, error);
  return enviarProblema(req, res, {
    status: 500,
    codigo: "error_interno",
    titulo: "Error interno",
    detalle: "Ocurrió un error inesperado. Intente de nuevo.",
  });
}
