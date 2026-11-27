import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CLAVE, ORIGEN, crearEntorno } from "./ayudas.js";

const entorno = crearEntorno();
const { app } = entorno;
let cookieAdmin, cookieEps, rucEps02;

const cuerpo = (respuesta) => JSON.parse(respuesta.text || "{}");
const solicitar = (datos) => request(app).post("/api/v1/solicitudes-acceso").set("Origin", ORIGEN).send(datos);
const nueva = (extra = {}) => ({ ruc: rucEps02, nombre: "Persona Solicitante", cargo: "Gerente", correo: entorno.correo("solicita"), clave: CLAVE, ...extra });

beforeAll(async () => {
  rucEps02 = await entorno.rucDe("EPS02");
  const admin = await entorno.crearUsuario({ rol: "admin" });
  const eps = await entorno.crearUsuario({ rol: "eps", area: "ep", codigoEps: "EPS02" });
  cookieAdmin = (await entorno.ingresar({ correo: admin.correo })).cookie;
  cookieEps = (await entorno.ingresar({ correo: eps.correo, institucion: "eps", ruc: rucEps02 })).cookie;
});
afterAll(() => entorno.limpiar());

describe("Solicitud de acceso de una EPS", () => {
  it("registro correcto → 201 pendiente y la cuenta aún no puede ingresar", async () => {
    const datos = nueva();
    const respuesta = await solicitar(datos);
    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({ estado: "pendiente" });
    expect(respuesta.body.solicitadoEn).toMatch(/Z$/);
    expect(respuesta.text).not.toContain(CLAVE);

    const { respuesta: ingreso } = await entorno.ingresar({ correo: datos.correo, institucion: "eps", ruc: rucEps02 });
    expect(ingreso.status).toBe(403);
    expect(cuerpo(ingreso).codigo).toBe("acceso_pendiente");
  });

  it("RUC desconocido → 422 en ruc y sin cuenta creada", async () => {
    const datos = nueva({ ruc: "99999999999" });
    const respuesta = await solicitar(datos);
    expect(respuesta.status).toBe(422);
    expect(cuerpo(respuesta).errores).toContainEqual({ campo: "ruc", mensaje: "El RUC no corresponde a ninguna EPS registrada." });
    const { rowCount } = await entorno.bd.consultar("select 1 from auth.users where email = $1", [datos.correo]);
    expect(rowCount).toBe(0);
  });

  it("segunda solicitud pendiente con el mismo correo → 409 solicitud_pendiente", async () => {
    const datos = nueva();
    expect((await solicitar(datos)).status).toBe(201);
    const segunda = await solicitar({ ...datos, correo: datos.correo.toUpperCase() });
    expect(segunda.status).toBe(409);
    expect(cuerpo(segunda).codigo).toBe("solicitud_pendiente");
  });

  it("correo que ya tiene cuenta → 409 correo_registrado", async () => {
    const existente = await entorno.crearUsuario({ rol: "sunass", area: "dre" });
    const respuesta = await solicitar(nueva({ correo: existente.correo }));
    expect(respuesta.status).toBe(409);
    expect(cuerpo(respuesta).codigo).toBe("correo_registrado");
  });

  it("clave corta → 422 en clave", async () => {
    const respuesta = await solicitar(nueva({ clave: "corta" }));
    expect(respuesta.status).toBe(422);
    expect(cuerpo(respuesta).errores.map((e) => e.campo)).toContain("clave");
  });
});

describe("Resolución de solicitudes por el Admin", () => {
  it("una EPS no puede listar solicitudes → 403", async () => {
    const respuesta = await request(app).get("/api/v1/solicitudes-acceso").set("Cookie", cookieEps);
    expect(respuesta.status).toBe(403);
  });

  it("el Admin lista con paginación y filtro por estado", async () => {
    const respuesta = await request(app).get("/api/v1/solicitudes-acceso?estado=pendiente&tamanoPagina=2").set("Cookie", cookieAdmin);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.paginacion).toMatchObject({ pagina: 1, tamanoPagina: 2 });
    expect(respuesta.body.datos.length).toBeLessThanOrEqual(2);
    expect(respuesta.body.datos.every((s) => s.estado === "pendiente")).toBe(true);
  });

  it("tamanoPagina=500 → 422", async () => {
    const respuesta = await request(app).get("/api/v1/solicitudes-acceso?tamanoPagina=500").set("Cookie", cookieAdmin);
    expect(respuesta.status).toBe(422);
    expect(cuerpo(respuesta).errores.map((e) => e.campo)).toContain("tamanoPagina");
  });

  it("aprobar y luego ingresar como EPS → 200 con rol eps; aprobar otra vez → 409", async () => {
    const datos = nueva();
    const { solicitudAccesoId } = (await solicitar(datos)).body;
    const aprobacion = await request(app)
      .post(`/api/v1/solicitudes-acceso/${solicitudAccesoId}/aprobacion`)
      .set("Origin", ORIGEN)
      .set("Cookie", cookieAdmin);
    expect(aprobacion.status).toBe(200);
    expect(aprobacion.body).toMatchObject({ estado: "aprobada", codigoEps: "EPS02" });

    const { respuesta } = await entorno.ingresar({ correo: datos.correo, institucion: "eps", ruc: rucEps02 });
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ rol: "eps", area: "ep", codigoEps: "EPS02", nombre: "Persona Solicitante", cargo: "Gerente" });

    const otraVez = await request(app)
      .post(`/api/v1/solicitudes-acceso/${solicitudAccesoId}/aprobacion`)
      .set("Origin", ORIGEN)
      .set("Cookie", cookieAdmin);
    expect(otraVez.status).toBe(409);
    expect(cuerpo(otraVez).codigo).toBe("solicitud_resuelta");
  });

  it("rechazo sin motivo → 422 en motivoRechazo", async () => {
    const { solicitudAccesoId } = (await solicitar(nueva())).body;
    const respuesta = await request(app)
      .post(`/api/v1/solicitudes-acceso/${solicitudAccesoId}/rechazo`)
      .set("Origin", ORIGEN)
      .set("Cookie", cookieAdmin)
      .send({ motivoRechazo: "  " });
    expect(respuesta.status).toBe(422);
    expect(cuerpo(respuesta).errores.map((e) => e.campo)).toContain("motivoRechazo");
  });

  it("rechazar → solicitud rechazada con motivo y la cuenta ya no puede ingresar", async () => {
    const datos = nueva();
    const { solicitudAccesoId } = (await solicitar(datos)).body;
    const respuesta = await request(app)
      .post(`/api/v1/solicitudes-acceso/${solicitudAccesoId}/rechazo`)
      .set("Origin", ORIGEN)
      .set("Cookie", cookieAdmin)
      .send({ motivoRechazo: "No pertenece a la EPS" });
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ estado: "rechazada", motivoRechazo: "No pertenece a la EPS" });

    const { rowCount } = await entorno.bd.consultar("select 1 from auth.users where email = $1", [datos.correo]);
    expect(rowCount).toBe(0);
    const { respuesta: ingreso } = await entorno.ingresar({ correo: datos.correo, institucion: "eps", ruc: rucEps02 });
    expect(ingreso.status).toBe(401);
  });

  it("aprobar una solicitud inexistente → 404", async () => {
    const respuesta = await request(app)
      .post("/api/v1/solicitudes-acceso/00000000-0000-4000-8000-000000000000/aprobacion")
      .set("Origin", ORIGEN)
      .set("Cookie", cookieAdmin);
    expect(respuesta.status).toBe(404);
    expect(cuerpo(respuesta).codigo).toBe("solicitud_no_encontrada");
  });
});
