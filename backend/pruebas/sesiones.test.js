import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COOKIE_ACCESO, COOKIE_RENOVACION } from "../src/compartido/sesion.js";
import { ORIGEN, cookieDe, crearEntorno } from "./ayudas.js";

const entorno = crearEntorno();
const { app } = entorno;
let sunass, admin, eps, rucEps02, rucEps05;

beforeAll(async () => {
  sunass = await entorno.crearUsuario({ rol: "sunass", area: "dre" });
  admin = await entorno.crearUsuario({ rol: "admin" });
  eps = await entorno.crearUsuario({ rol: "eps", area: "ep", codigoEps: "EPS02" });
  rucEps02 = await entorno.rucDe("EPS02");
  rucEps05 = await entorno.rucDe("EPS05");
});
afterAll(() => entorno.limpiar());

const cuerpo = (respuesta) => JSON.parse(respuesta.text || "{}");

describe("Inicio de sesión con correo y clave", () => {
  it("ingreso correcto de una persona de Sunass", async () => {
    const { respuesta } = await entorno.ingresar({ correo: sunass.correo });
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ rol: "sunass", area: "dre", codigoEps: null, correo: sunass.correo });
  });

  it("ingreso correcto de una EPS con su RUC", async () => {
    const { respuesta } = await entorno.ingresar({ correo: eps.correo, institucion: "eps", ruc: rucEps02 });
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ rol: "eps", codigoEps: "EPS02" });
  });

  it("RUC de otra EPS → 401 credenciales_invalidas", async () => {
    const { respuesta } = await entorno.ingresar({ correo: eps.correo, institucion: "eps", ruc: rucEps05 });
    expect(respuesta.status).toBe(401);
    expect(cuerpo(respuesta).codigo).toBe("credenciales_invalidas");
  });

  it("pestaña equivocada → 401 credenciales_invalidas", async () => {
    const { respuesta } = await entorno.ingresar({ correo: eps.correo, institucion: "sunass" });
    expect(respuesta.status).toBe(401);
    expect(cuerpo(respuesta).codigo).toBe("credenciales_invalidas");
  });

  it("clave incorrecta → 401 y sin cookies", async () => {
    const respuesta = await request(app)
      .post("/api/v1/sesiones")
      .set("Origin", ORIGEN)
      .send({ institucion: "sunass", usuario: sunass.correo, clave: "otra-clave-999" });
    expect(respuesta.status).toBe(401);
    expect(cuerpo(respuesta).codigo).toBe("credenciales_invalidas");
    expect(respuesta.headers["set-cookie"]).toBeUndefined();
  });

  it("solicitud pendiente → 403 acceso_pendiente", async () => {
    const pendiente = await entorno.crearUsuario({ conPerfil: false });
    await entorno.bd.consultar(
      `insert into public."solicitudesAcceso" ("usuarioId", "epsId", nombre, correo)
       values ($1, (select "epsId" from public.eps where "codigoEps" = 'EPS02'), 'Persona pendiente', $2)`,
      [pendiente.usuarioId, pendiente.correo],
    );
    const { respuesta } = await entorno.ingresar({ correo: pendiente.correo, institucion: "eps", ruc: rucEps02 });
    expect(respuesta.status).toBe(403);
    expect(cuerpo(respuesta).codigo).toBe("acceso_pendiente");
  });

  it("falta el RUC en la pestaña de la EPS → 422 en el campo ruc", async () => {
    const respuesta = await request(app)
      .post("/api/v1/sesiones")
      .set("Origin", ORIGEN)
      .send({ institucion: "eps", usuario: eps.correo, clave: "x" });
    expect(respuesta.status).toBe(422);
    expect(cuerpo(respuesta).errores.map((e) => e.campo)).toContain("ruc");
  });
});

describe("Sesión en cookies protegidas", () => {
  it("fija cookies HttpOnly, Secure y SameSite=Lax y el cuerpo no lleva tokens", async () => {
    const { respuesta } = await entorno.ingresar({ correo: sunass.correo });
    for (const nombre of [COOKIE_ACCESO, COOKIE_RENOVACION]) {
      const linea = cookieDe(respuesta, nombre);
      expect(linea).toMatch(/HttpOnly/);
      expect(linea).toMatch(/Secure/);
      expect(linea).toMatch(/SameSite=Lax/);
      expect(linea).toMatch(/Path=\/api/);
    }
    expect(respuesta.text).not.toMatch(/access_token|refresh_token|eyJ/);
  });

  it("sin cookie → 401", async () => {
    const respuesta = await request(app).get("/api/v1/perfil");
    expect(respuesta.status).toBe(401);
  });

  it("con el token de acceso vencido se renueva con el de renovación", async () => {
    const { respuesta } = await entorno.ingresar({ correo: sunass.correo });
    const renovacion = cookieDe(respuesta, COOKIE_RENOVACION).split(";")[0];
    const perfil = await request(app).get("/api/v1/perfil").set("Cookie", renovacion);
    expect(perfil.status).toBe(200);
    expect(cookieDe(perfil, COOKIE_ACCESO)).toBeDefined();
    expect(cookieDe(perfil, COOKIE_RENOVACION)).toBeDefined();
  });

  it("perfil desactivado → 401 y cookies borradas", async () => {
    const usuario = await entorno.crearUsuario({ rol: "sunass", area: "srt" });
    const { cookie } = await entorno.ingresar({ correo: usuario.correo });
    await entorno.bd.consultar(`update public.perfiles set activo = false where "usuarioId" = $1`, [usuario.usuarioId]);
    const perfil = await request(app).get("/api/v1/perfil").set("Cookie", cookie);
    expect(perfil.status).toBe(401);
    expect(cookieDe(perfil, COOKIE_ACCESO)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

describe("Perfil y cierre de sesión", () => {
  it("el perfil de un Admin trae todas las claves, con area y codigoEps en null", async () => {
    const { cookie } = await entorno.ingresar({ correo: admin.correo });
    const perfil = await request(app).get("/api/v1/perfil").set("Cookie", cookie);
    expect(perfil.status).toBe(200);
    expect(Object.keys(perfil.body).sort()).toEqual(
      ["area", "cargo", "codigoEps", "correo", "nombre", "nombreEps", "proveedor", "rol", "usuarioId"].sort(),
    );
    expect(perfil.body).toMatchObject({ rol: "admin", area: null, codigoEps: null });
  });

  it("cerrar sesión responde 204 y después el perfil responde 401", async () => {
    const { cookie } = await entorno.ingresar({ correo: sunass.correo });
    const cierre = await request(app).delete("/api/v1/sesiones/actual").set("Origin", ORIGEN).set("Cookie", cookie);
    expect(cierre.status).toBe(204);
    const soloRenovacion = cookie.split("; ").find((par) => par.startsWith(COOKIE_RENOVACION));
    const perfil = await request(app).get("/api/v1/perfil").set("Cookie", soloRenovacion);
    expect(perfil.status).toBe(401);
  });
});

describe("Microsoft reservado", () => {
  it.each(["/api/v1/sesiones/microsoft", "/api/v1/sesiones/microsoft/retorno"])("%s → 503", async (ruta) => {
    const respuesta = await request(app).get(ruta);
    expect(respuesta.status).toBe(503);
    expect(cuerpo(respuesta).codigo).toBe("proveedor_no_configurado");
  });
});
