import { randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { Problema, enviarProblema, erroresDeZod } from "./problema.js";

/** Asigna un trazaId a cada petición. */
export function trazar(req, res, siguiente) {
  req.trazaId = randomUUID();
  res.set("X-Traza-Id", req.trazaId);
  siguiente();
}

/** Valida body, params y query; el resultado queda en req.valido. */
export function validar({ body, params, query } = {}) {
  return (req, _res, siguiente) => {
    const errores = [];
    req.valido = {};
    for (const [parte, esquema] of Object.entries({ body, params, query })) {
      if (!esquema) continue;
      const resultado = esquema.safeParse(req[parte] ?? {});
      if (resultado.success) req.valido[parte] = resultado.data;
      else errores.push(...erroresDeZod(resultado.error, parte));
    }
    if (errores.length) {
      throw new Problema(422, "validacion_fallida", "La solicitud no es válida", "Revise los campos indicados.", errores);
    }
    siguiente();
  };
}

const METODOS_QUE_MODIFICAN = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function origenDe(req) {
  const origen = req.get("origin");
  if (origen) return origen;
  const referente = req.get("referer");
  if (!referente) return null;
  try {
    return new URL(referente).origin;
  } catch {
    return null;
  }
}

/** CSRF: origen permitido y cuerpo JSON en métodos que modifican. */
export function protegerCsrf(origenesPermitidos) {
  return (req, _res, siguiente) => {
    if (!METODOS_QUE_MODIFICAN.has(req.method)) return siguiente();
    if (!origenesPermitidos.includes(origenDe(req))) {
      throw new Problema(403, "origen_no_permitido", "Origen no permitido", "La petición no proviene de un origen autorizado.");
    }
    const tieneCuerpo = Number(req.get("content-length") ?? 0) > 0 || req.get("transfer-encoding");
    if (tieneCuerpo && !req.is("application/json")) {
      throw new Problema(403, "tipo_contenido_no_permitido", "Tipo de contenido no permitido", "El cuerpo debe enviarse como application/json.");
    }
    siguiente();
  };
}

/** Límite de intentos por IP. */
export function limitarIntentos({ ventanaMs, limite }) {
  return rateLimit({
    windowMs: ventanaMs,
    limit: limite,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) =>
      enviarProblema(req, res, {
        status: 429,
        codigo: "demasiados_intentos",
        titulo: "Demasiados intentos",
        detalle: "Hizo demasiados intentos. Espere unos minutos e intente de nuevo.",
      }),
  });
}
