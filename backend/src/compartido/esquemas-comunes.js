// Esquemas compartidos y registro de OpenAPI.
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod.js";

export const registro = new OpenAPIRegistry();

export const esquemaProblema = registro.register(
  "Problema",
  z
    .object({
      type: z.string(),
      title: z.string(),
      status: z.number().int(),
      detail: z.string(),
      instance: z.string(),
      codigo: z.string().openapi({ example: "validacion_fallida" }),
      trazaId: z.uuid(),
      errores: z.array(z.object({ campo: z.string(), mensaje: z.string() })).optional(),
    })
    .openapi({ description: "Error en formato RFC 9457 (application/problem+json)." }),
);

export const esquemaPaginacion = registro.register(
  "Paginacion",
  z.object({
    pagina: z.number().int(),
    tamanoPagina: z.number().int(),
    total: z.number().int(),
    totalPaginas: z.number().int(),
  }),
);

/** Respuesta de error para registerPath. */
export function respuestaProblema(descripcion) {
  return { description: descripcion, content: { "application/problem+json": { schema: esquemaProblema } } };
}

export function respuestaJson(descripcion, esquema) {
  return { description: descripcion, content: { "application/json": { schema: esquema } } };
}
