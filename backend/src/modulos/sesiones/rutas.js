import { Router } from "express";
import { Problema, credencialesInvalidas } from "../../compartido/problema.js";
import { limitarIntentos, validar } from "../../compartido/middleware.js";
import { borrarCookies, fijarCookies, leerPerfil, perfilPublico, requerirSesion } from "../../compartido/sesion.js";
import { esquemaIngreso } from "./esquemas.js";

/** Sesiones y perfil. */
export function rutasSesiones(contexto, { limiteIngresos }) {
  const { config, bd, supabase } = contexto;
  const rutas = Router();
  const conSesion = requerirSesion(contexto);

  rutas.post(
    "/sesiones",
    limitarIntentos({ ventanaMs: 15 * 60 * 1000, limite: limiteIngresos }),
    validar({ body: esquemaIngreso }),
    async (req, res) => {
      const { institucion, usuario, clave, ruc } = req.valido.body;
      const { data, error } = await supabase.publico().auth.signInWithPassword({ email: usuario, password: clave });
      if (error || !data?.session) throw credencialesInvalidas();

      // Cierra la sesión de Supabase si el ingreso no procede.
      const descartar = () => supabase.secreto.auth.admin.signOut(data.session.access_token).catch(() => {});

      const perfil = await leerPerfil(bd, data.user.id);
      if (!perfil || !perfil.activo) {
        await descartar();
        if (!perfil && (await tieneSolicitudPendiente(bd, data.user.id))) {
          throw new Problema(403, "acceso_pendiente", "Acceso pendiente", "Su solicitud de acceso aún no ha sido aprobada por el administrador.");
        }
        throw credencialesInvalidas();
      }

      const coincide =
        institucion === "eps" ? perfil.rol === "eps" && perfil.ruc === ruc : perfil.rol === "sunass" || perfil.rol === "admin";
      if (!coincide) {
        await descartar();
        throw credencialesInvalidas();
      }

      fijarCookies(res, config, data.session);
      res.json(perfilPublico(perfil));
    },
  );

  rutas.delete("/sesiones/actual", conSesion, async (req, res) => {
    if (req.tokenAcceso) await supabase.secreto.auth.admin.signOut(req.tokenAcceso).catch(() => {});
    borrarCookies(res, config);
    res.status(204).end();
  });

  const proveedorNoConfigurado = () => {
    throw new Problema(503, "proveedor_no_configurado", "Proveedor no configurado", "El acceso con Microsoft aún no está disponible.");
  };
  rutas.get("/sesiones/microsoft", proveedorNoConfigurado);
  rutas.get("/sesiones/microsoft/retorno", proveedorNoConfigurado);

  rutas.get("/perfil", conSesion, (req, res) => {
    res.json(perfilPublico(req.perfil));
  });

  return rutas;
}

async function tieneSolicitudPendiente(bd, usuarioId) {
  const { rowCount } = await bd.consultar(
    `select 1 from public."solicitudesAcceso" where "usuarioId" = $1 and estado = 'pendiente'`,
    [usuarioId],
  );
  return rowCount > 0;
}
