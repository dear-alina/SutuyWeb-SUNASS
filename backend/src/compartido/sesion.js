// Sesión en cookies HttpOnly; los tokens nunca van en el cuerpo.
import { Problema, sesionRequerida } from "./problema.js";

export const COOKIE_ACCESO = "sw_acceso";
export const COOKIE_RENOVACION = "sw_renovacion";
const VIDA_RENOVACION_MS = 30 * 24 * 60 * 60 * 1000;

function opcionesCookie(config) {
  return { httpOnly: true, secure: config.COOKIE_SEGURA, sameSite: "lax", path: "/api" };
}

export function fijarCookies(res, config, sesion) {
  const opciones = opcionesCookie(config);
  res.cookie(COOKIE_ACCESO, sesion.access_token, { ...opciones, maxAge: sesion.expires_in * 1000 });
  res.cookie(COOKIE_RENOVACION, sesion.refresh_token, { ...opciones, maxAge: VIDA_RENOVACION_MS });
}

export function borrarCookies(res, config) {
  const opciones = opcionesCookie(config);
  res.clearCookie(COOKIE_ACCESO, opciones);
  res.clearCookie(COOKIE_RENOVACION, opciones);
}

const SQL_PERFIL = `
  select p."usuarioId", p.nombre, p.cargo, p.rol, p.area, p.proveedor, p.activo,
         u.email as correo, e."codigoEps", e.nombre as "nombreEps", e.ruc
  from public.perfiles p
  join auth.users u on u.id = p."usuarioId"
  left join public.eps e on e."epsId" = p."epsId"
  where p."usuarioId" = $1`;

/** Perfil con su EPS, o null. */
export async function leerPerfil(bd, usuarioId) {
  const { rows } = await bd.consultar(SQL_PERFIL, [usuarioId]);
  return rows[0] ?? null;
}

/** Perfil que se devuelve al frontend. */
export function perfilPublico(perfil) {
  return {
    usuarioId: perfil.usuarioId,
    nombre: perfil.nombre,
    cargo: perfil.cargo ?? null,
    correo: perfil.correo ?? null,
    rol: perfil.rol,
    area: perfil.area ?? null,
    codigoEps: perfil.codigoEps ?? null,
    nombreEps: perfil.nombreEps ?? null,
    proveedor: perfil.proveedor,
  };
}

/** Exige sesión y perfil activo; renueva el token si venció. */
export function requerirSesion({ config, bd, supabase }) {
  return async (req, res, siguiente) => {
    const acceso = req.cookies?.[COOKIE_ACCESO];
    const renovacion = req.cookies?.[COOKIE_RENOVACION];
    let usuarioId = null;
    let tokenAcceso = null;

    if (acceso) {
      const { data, error } = await supabase.publico().auth.getClaims(acceso);
      if (!error && data?.claims?.sub) {
        usuarioId = data.claims.sub;
        tokenAcceso = acceso;
      }
    }

    if (!usuarioId && renovacion) {
      const { data, error } = await supabase.publico().auth.refreshSession({ refresh_token: renovacion });
      if (!error && data?.session) {
        fijarCookies(res, config, data.session);
        usuarioId = data.session.user.id;
        tokenAcceso = data.session.access_token;
      }
    }

    if (!usuarioId) {
      borrarCookies(res, config);
      throw sesionRequerida();
    }

    const perfil = await leerPerfil(bd, usuarioId);
    if (!perfil || !perfil.activo) {
      borrarCookies(res, config);
      throw sesionRequerida();
    }

    req.perfil = perfil;
    req.tokenAcceso = tokenAcceso;
    siguiente();
  };
}

/** Exige uno de los roles indicados. */
export function requerirRol(...roles) {
  return (req, _res, siguiente) => {
    if (!roles.includes(req.perfil?.rol)) {
      throw new Problema(403, "acceso_denegado", "Acceso denegado", "Su perfil no tiene permiso para esta acción.");
    }
    siguiente();
  };
}
