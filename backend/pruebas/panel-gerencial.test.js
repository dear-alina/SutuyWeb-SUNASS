// GET /api/v1/panel-gerencial contra Supabase local.
// Crea expedientes propios con códigos del año 2099 para no chocar con el seed, y los borra al terminar.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearEntorno } from "./ayudas.js";

const entorno = crearEntorno();
const { app, bd } = entorno;
const RUTA = "/api/v1/panel-gerencial";
let cookieSunass;
let cookieEps;

async function crearExpediente(codigo, tipo, { estado = "en_tramite", fechaInicio, plazo, fechaConclusion = null }, hitos) {
  const { rows } = await bd.consultar(
    `insert into public.expedientes ("codigoExpediente", "epsId", "tipoProcedimiento", estado, "fechaInicio", "plazoMaximoDiasHabiles", "fechaConclusion")
     select $1, "epsId", $2, $3, $4::date, $5, $6::date from public.eps where "codigoEps" = 'EPS07'
     returning "expedienteId"`,
    [codigo, tipo, estado, fechaInicio, plazo, fechaConclusion],
  );
  for (const [numero, codigoHito, responsable, iniciadoEn, finalizadoEn, extra = {}] of hitos) {
    await bd.consultar(
      `insert into public.hitos ("expedienteId", numero, "codigoHito", responsable, "iniciadoEn", "finalizadoEn", "plazoReferencialDiasHabiles", "cuentaPlazo")
       values ($1, $2, $3, $4, $5::date, $6::date, $7, $8)`,
      [rows[0].expedienteId, numero, codigoHito, responsable, iniciadoEn, finalizadoEn, extra.plazo ?? null, extra.cuentaPlazo ?? true],
    );
  }
}

beforeAll(async () => {
  await bd.consultar(`delete from public.expedientes where "codigoExpediente" like '%-2099-%'`);
  // En trámite: inició el 01/09/2099 con 30 d.h.; la EP tardó 2 d.h. en subsanar.
  await crearExpediente("UFI-2099-0001", "uso_excepcional_fondo", { fechaInicio: "2099-09-01", plazo: 30 }, [
    [1, "solicitud", "ep", "2099-09-01", "2099-09-01"],
    [2, "derivacion", "dre", "2099-09-01", "2099-09-04", { plazo: 1 }],
    [3, "subsanacion_ep", "ep", "2099-09-07", "2099-09-09", { plazo: 2, cuentaPlazo: false }],
    [4, "evaluacion", "equipo_srt", "2099-09-09", null],
  ]);
  // Concluido después de la fecha de corte usada en las pruebas: al corte seguía en trámite.
  await crearExpediente("CPI-2099-0001", "cambio_programa_inversiones", { estado: "concluido", fechaInicio: "2099-08-03", plazo: 30, fechaConclusion: "2099-10-30" }, [
    [1, "revision", "srt", "2099-08-03", "2099-10-30"],
  ]);
  // Iniciado después del corte: no debe aparecer.
  await crearExpediente("UFI-2099-0002", "uso_excepcional_fondo", { fechaInicio: "2099-12-01", plazo: 30 }, []);

  const sunass = await entorno.crearUsuario({ rol: "sunass", area: "dre" });
  cookieSunass = (await entorno.ingresar({ correo: sunass.correo })).cookie;
  const eps = await entorno.crearUsuario({ rol: "eps", area: "ep", codigoEps: "EPS07" });
  cookieEps = (await entorno.ingresar({ correo: eps.correo, institucion: "eps", ruc: await entorno.rucDe("EPS07") })).cookie;
});

afterAll(async () => {
  await bd.consultar(`delete from public.expedientes where "codigoExpediente" like '%-2099-%'`);
  await entorno.limpiar();
});

const consultar = (cookie, consulta = {}) => request(app).get(RUTA).query(consulta).set("Cookie", cookie ?? "");

describe("GET /api/v1/panel-gerencial", () => {
  it("exige sesión", async () => {
    const respuesta = await consultar(null);
    expect(respuesta.status).toBe(401);
  });

  it("no lo ve una EPS", async () => {
    const respuesta = await consultar(cookieEps);
    expect(respuesta.status).toBe(403);
    expect(respuesta.body.codigo).toBe("acceso_denegado");
  });

  it("valida la fecha de corte y el margen de alerta", async () => {
    const respuesta = await consultar(cookieSunass, { fechaCorte: "30/09/2099", diasAlerta: 99 });
    expect(respuesta.status).toBe(422);
    expect(respuesta.body.errores.map((e) => e.campo).sort()).toEqual(["query.diasAlerta", "query.fechaCorte"].sort());
  });

  it("calcula la fecha límite con la suspensión y muestra dónde está el expediente", async () => {
    const respuesta = await consultar(cookieSunass, { fechaCorte: "2099-09-30", tipoProcedimiento: "uso_excepcional_fondo" });
    expect(respuesta.status).toBe(200);
    const fila = respuesta.body.vencimientos.find((v) => v.codigoExpediente === "UFI-2099-0001");
    expect(fila).toMatchObject({ areaActual: "equipo_srt", hitoActual: "evaluacion", diasSuspension: 2, semaforo: "en_plazo" });
    expect(fila.fechaLimiteNotificacion).not.toBeNull();
    expect(respuesta.body.vencimientos.some((v) => v.codigoExpediente === "UFI-2099-0002")).toBe(false);
    expect(respuesta.body.pasosFueraDePlazo).toContainEqual(expect.objectContaining({ codigoExpediente: "UFI-2099-0001", codigoHito: "derivacion", plazoDiasHabiles: 1 }));
  });

  it("ve como en trámite lo que concluyó después de la fecha de corte", async () => {
    const respuesta = await consultar(cookieSunass, { fechaCorte: "2099-09-30", tipoProcedimiento: "cambio_programa_inversiones" });
    const fila = respuesta.body.vencimientos.find((v) => v.codigoExpediente === "CPI-2099-0001");
    expect(fila).toMatchObject({ semaforo: "vencido", fechaLimiteNotificacion: null });
  });

  it("toma en cuenta los días no laborables registrados", async () => {
    const antes = await consultar(cookieSunass, { fechaCorte: "2099-09-30", tipoProcedimiento: "uso_excepcional_fondo" });
    const limiteAntes = antes.body.vencimientos.find((v) => v.codigoExpediente === "UFI-2099-0001").fechaLimite;
    await bd.consultar(`insert into public."diasNoHabiles" (fecha, tipo, descripcion) values ('2099-09-15', 'dia_no_laborable', 'Prueba')`);
    try {
      const despues = await consultar(cookieSunass, { fechaCorte: "2099-09-30", tipoProcedimiento: "uso_excepcional_fondo" });
      const limiteDespues = despues.body.vencimientos.find((v) => v.codigoExpediente === "UFI-2099-0001").fechaLimite;
      expect(limiteDespues > limiteAntes).toBe(true);
    } finally {
      await bd.consultar(`delete from public."diasNoHabiles" where fecha = '2099-09-15'`);
    }
  });
});
