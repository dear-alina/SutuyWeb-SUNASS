import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { leerConfig } from "../src/config.js";
import { ORIGEN, crearEntorno } from "./ayudas.js";
import { exigirLocal } from "./preparar.js";

const entorno = crearEntorno();
afterAll(() => entorno.limpiar());

describe("base del backend", () => {
  it("la configuración sin variables falla nombrando la variable faltante", () => {
    expect(() => leerConfig({})).toThrow(/SUPABASE_URL/);
  });

  it("las pruebas abortan si la base no es local", () => {
    expect(() => exigirLocal("DATABASE_URL", "postgresql://postgres:x@db.ejemplo.supabase.co:5432/postgres")).toThrow(/abortadas/);
  });

  it("la base local tiene las 20 EPS", async () => {
    const { rows } = await entorno.bd.consultar("select count(*)::int as n from public.eps");
    expect(rows[0].n).toBe(20);
  });

  it("una ruta inexistente responde 404 en problem+json", async () => {
    const respuesta = await request(entorno.app).get("/api/v1/no-existe");
    expect(respuesta.status).toBe(404);
    expect(respuesta.headers["content-type"]).toMatch(/application\/problem\+json/);
    const cuerpo = JSON.parse(respuesta.text);
    expect(cuerpo).toMatchObject({ status: 404, codigo: "ruta_no_encontrada", instance: "/api/v1/no-existe" });
    expect(cuerpo.trazaId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("un JSON mal formado responde 400 cuerpo_invalido", async () => {
    const respuesta = await request(entorno.app)
      .post("/api/v1/sesiones")
      .set("Origin", ORIGEN)
      .set("Content-Type", "application/json")
      .send('{"usuario": ');
    expect(respuesta.status).toBe(400);
    expect(JSON.parse(respuesta.text).codigo).toBe("cuerpo_invalido");
  });

  it("un campo desconocido responde 422 nombrando el campo", async () => {
    const respuesta = await request(entorno.app)
      .post("/api/v1/sesiones")
      .set("Origin", ORIGEN)
      .send({ institucion: "sunass", usuario: "a@prueba.test", clave: "x", esAdmin: true });
    expect(respuesta.status).toBe(422);
    const cuerpo = JSON.parse(respuesta.text);
    expect(cuerpo.codigo).toBe("validacion_fallida");
    expect(cuerpo.errores).toContainEqual({ campo: "esAdmin", mensaje: "Campo no permitido." });
  });
});
