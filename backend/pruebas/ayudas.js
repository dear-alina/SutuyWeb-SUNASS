// Ayudas para las pruebas: app, usuarios de prueba y cookies.
import { randomUUID } from "node:crypto";
import request from "supertest";
import { crearApp } from "../src/app.js";
import { leerConfig } from "../src/config.js";

export const ORIGEN = "http://localhost:3000";
export const CLAVE = "Clave-de-prueba-123";

export function crearEntorno(opciones = { limites: { ingresos: 1000, registros: 1000 } }) {
  const config = leerConfig();
  const app = crearApp(config, opciones);
  const { bd, supabase } = app.locals.contexto;
  const creados = [];

  const correo = (prefijo = "persona") => `${prefijo}.${randomUUID().slice(0, 8)}@prueba.test`;

  /** Crea una cuenta de Auth y, si se indica, su perfil. Se borra en limpiar(). */
  async function crearUsuario({ rol, area = null, codigoEps = null, activo = true, conPerfil = true } = {}) {
    const email = correo(rol ?? "sinperfil");
    const { data, error } = await supabase.secreto.auth.admin.createUser({ email, password: CLAVE, email_confirm: true });
    if (error) throw error;
    const usuarioId = data.user.id;
    creados.push(usuarioId);
    if (conPerfil) {
      await bd.consultar(
        `insert into public.perfiles ("usuarioId", nombre, rol, area, "epsId", activo)
         values ($1, $2, $3, $4, (select "epsId" from public.eps where "codigoEps" = $5), $6)`,
        [usuarioId, `Persona ${rol}`, rol, area, codigoEps, activo],
      );
    }
    return { usuarioId, correo: email };
  }

  /** Inicia sesión y devuelve la respuesta y el encabezado Cookie para las siguientes peticiones. */
  async function ingresar({ correo: usuario, institucion = "sunass", ruc }) {
    const cuerpo = { institucion, usuario, clave: CLAVE, ...(ruc ? { ruc } : {}) };
    const respuesta = await request(app).post("/api/v1/sesiones").set("Origin", ORIGEN).send(cuerpo);
    return { respuesta, cookie: encabezadoCookie(respuesta) };
  }

  async function rucDe(codigoEps) {
    const { rows } = await bd.consultar(`select ruc from public.eps where "codigoEps" = $1`, [codigoEps]);
    return rows[0].ruc;
  }

  async function limpiar() {
    await bd.consultar(`delete from public."solicitudesAcceso" where correo like '%@prueba.test'`);
    for (const usuarioId of creados) await supabase.secreto.auth.admin.deleteUser(usuarioId);
    // Cuentas creadas por el propio backend en las pruebas de registro
    const { rows } = await bd.consultar(`select id from auth.users where email like '%@prueba.test'`);
    for (const { id } of rows) await supabase.secreto.auth.admin.deleteUser(id);
    await bd.cerrar();
  }

  return { app, bd, supabase, correo, crearUsuario, ingresar, rucDe, limpiar };
}

/** Convierte Set-Cookie en un encabezado Cookie (supertest no reenvía cookies Secure por http). */
export function encabezadoCookie(respuesta) {
  const cookies = respuesta.headers["set-cookie"] ?? [];
  return cookies.map((linea) => linea.split(";")[0]).filter((par) => !par.endsWith("=")).join("; ");
}

export function cookieDe(respuesta, nombre) {
  return (respuesta.headers["set-cookie"] ?? []).find((linea) => linea.startsWith(`${nombre}=`));
}
