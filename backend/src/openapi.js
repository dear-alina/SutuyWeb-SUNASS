// Genera OpenAPI 3.1 desde los esquemas Zod.
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registro } from "./compartido/esquemas-comunes.js";
import "./modulos/sesiones/esquemas.js";
import "./modulos/solicitudes-acceso/esquemas.js";

export function generarDocumentoOpenApi() {
  const generador = new OpenApiGeneratorV31(registro.definitions, { sortComponents: "alphabetically" });
  return generador.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "API de SutuyWeb",
      version: "1.0.0",
      description: "Sesiones, perfil y solicitudes de acceso. La sesión viaja en cookies HttpOnly; los errores, en application/problem+json.",
    },
    servers: [{ url: "http://localhost:4000", description: "Desarrollo local" }],
  });
}

/** Contenido de backend/openapi.json. */
export function textoOpenApi() {
  return `${JSON.stringify(generarDocumentoOpenApi(), null, 2)}\n`;
}
