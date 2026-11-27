import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE, ORIGEN, crearEntorno } from "./ayudas.js";

const entorno = crearEntorno({ limites: { ingresos: 10, registros: 5 } });
const { app } = entorno;
let sunass;

beforeAll(async () => {
  sunass = await entorno.crearUsuario({ rol: "sunass", area: "dre" });
});
afterAll(() => entorno.limpiar());

const cuerpo = (respuesta) => JSON.parse(respuesta.text || "{}");
const datosIngreso = () => ({ institucion: "sunass", usuario: sunass.correo, clave: CLAVE });

describe("Protección contra CSRF", () => {
  it("POST /sesiones con un Origin ajeno → 403 y no inicia sesión", async () => {
    const respuesta = await request(app).post("/api/v1/sesiones").set("Origin", "https://sitio-ajeno.example").send(datosIngreso());
    expect(respuesta.status).toBe(403);
    expect(cuerpo(respuesta).codigo).toBe("origen_no_permitido");
    expect(respuesta.headers["set-cookie"]).toBeUndefined();
  });

  it("POST sin Origin ni Referer → 403", async () => {
    const respuesta = await request(app).post("/api/v1/sesiones").send(datosIngreso());
    expect(respuesta.status).toBe(403);
  });

  it("POST de formulario (no JSON) desde un origen permitido → 403", async () => {
    const respuesta = await request(app)
      .post("/api/v1/sesiones")
      .set("Origin", ORIGEN)
      .type("form")
      .send({ institucion: "sunass", usuario: sunass.correo, clave: CLAVE });
    expect(respuesta.status).toBe(403);
    expect(cuerpo(respuesta).codigo).toBe("tipo_contenido_no_permitido");
  });

  it("CORS solo autoriza el origen del frontend, con credenciales", async () => {
    const permitido = await request(app).options("/api/v1/sesiones").set("Origin", ORIGEN).set("Access-Control-Request-Method", "POST");
    expect(permitido.headers["access-control-allow-origin"]).toBe(ORIGEN);
    expect(permitido.headers["access-control-allow-credentials"]).toBe("true");
    const ajeno = await request(app).options("/api/v1/sesiones").set("Origin", "https://sitio-ajeno.example").set("Access-Control-Request-Method", "POST");
    expect(ajeno.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("Límite de intentos", () => {
  it("el intento 11 de inicio de sesión desde la misma IP → 429 demasiados_intentos", async () => {
    for (let intento = 1; intento <= 10; intento++) {
      const respuesta = await request(app).post("/api/v1/sesiones").set("Origin", ORIGEN).send({ ...datosIngreso(), clave: "incorrecta" });
      expect(respuesta.status).toBe(401);
    }
    const respuesta = await request(app).post("/api/v1/sesiones").set("Origin", ORIGEN).send(datosIngreso());
    expect(respuesta.status).toBe(429);
    expect(cuerpo(respuesta).codigo).toBe("demasiados_intentos");
  });

  it("el registro 6 desde la misma IP en una hora → 429", async () => {
    const solicitud = () =>
      request(app).post("/api/v1/solicitudes-acceso").set("Origin", ORIGEN).send({ ruc: "00000000000", nombre: "X", correo: entorno.correo(), clave: CLAVE });
    for (let intento = 1; intento <= 5; intento++) expect((await solicitud()).status).toBe(422);
    const respuesta = await solicitud();
    expect(respuesta.status).toBe(429);
    expect(cuerpo(respuesta).codigo).toBe("demasiados_intentos");
  });
});
