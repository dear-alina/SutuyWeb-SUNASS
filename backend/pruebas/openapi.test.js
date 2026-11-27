import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generarDocumentoOpenApi, textoOpenApi } from "../src/openapi.js";

const CAMEL = /^[a-z][a-zA-Z0-9]*$/;
// Campos definidos por RFC 9457 (contrato-api, «Rutas versionadas y nombres de los campos»).
const EXCEPCIONES_RFC9457 = new Set(["type", "title", "status", "detail", "instance"]);

function nombresDePropiedades(nodo, nombres = []) {
  if (Array.isArray(nodo)) nodo.forEach((hijo) => nombresDePropiedades(hijo, nombres));
  else if (nodo && typeof nodo === "object") {
    if (nodo.properties) nombres.push(...Object.keys(nodo.properties));
    if (nodo.in && nodo.name) nombres.push(nodo.name);
    Object.values(nodo).forEach((hijo) => nombresDePropiedades(hijo, nombres));
  }
  return nombres;
}

describe("Contrato publicado en OpenAPI", () => {
  it("backend/openapi.json coincide con el generado desde los esquemas", () => {
    const versionado = readFileSync(new URL("../openapi.json", import.meta.url), "utf8").replace(/\r\n/g, "\n");
    expect(versionado).toBe(textoOpenApi());
  });

  it("todas las propiedades y parámetros están en camelCase", () => {
    const nombres = nombresDePropiedades(generarDocumentoOpenApi()).filter((n) => !EXCEPCIONES_RFC9457.has(n));
    expect(nombres.length).toBeGreaterThan(20);
    expect(nombres.filter((n) => !CAMEL.test(n))).toEqual([]);
  });

  it("documenta las rutas de sesión y de solicitudes", () => {
    const rutas = Object.keys(generarDocumentoOpenApi().paths);
    expect(rutas).toEqual(
      expect.arrayContaining([
        "/api/v1/sesiones",
        "/api/v1/sesiones/actual",
        "/api/v1/perfil",
        "/api/v1/solicitudes-acceso",
        "/api/v1/solicitudes-acceso/{solicitudAccesoId}/aprobacion",
        "/api/v1/solicitudes-acceso/{solicitudAccesoId}/rechazo",
      ]),
    );
  });
});
