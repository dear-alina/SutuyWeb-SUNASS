import { Router } from "express";
import { Problema, errorDeCampo } from "../../compartido/problema.js";
import { limitarIntentos, validar } from "../../compartido/middleware.js";
import { requerirRol, requerirSesion } from "../../compartido/sesion.js";
import { esquemaIdSolicitud, esquemaListado, esquemaNuevaSolicitud, esquemaRechazo } from "./esquemas.js";

const COLUMNAS = `
  s."solicitudAccesoId", s.nombre, s.cargo, s.correo, s.estado, s."motivoRechazo",
  s."solicitadoEn", s."resueltoEn", e."codigoEps", e.nombre as "nombreEps"`;

const ORDEN = {
  solicitadoEn: `s."solicitadoEn" asc`,
  "-solicitadoEn": `s."solicitadoEn" desc`,
  nombre: `s.nombre asc`,
  "-nombre": `s.nombre desc`,
};

const solicitudPublica = (fila) => ({
  solicitudAccesoId: fila.solicitudAccesoId,
  nombre: fila.nombre,
  cargo: fila.cargo ?? null,
  correo: fila.correo,
  estado: fila.estado,
  codigoEps: fila.codigoEps,
  nombreEps: fila.nombreEps,
  motivoRechazo: fila.motivoRechazo ?? null,
  solicitadoEn: fila.solicitadoEn.toISOString(),
  resueltoEn: fila.resueltoEn ? fila.resueltoEn.toISOString() : null,
});

const noEncontrada = () =>
  new Problema(404, "solicitud_no_encontrada", "Solicitud no encontrada", "La solicitud de acceso no existe.");
const yaResuelta = () =>
  new Problema(409, "solicitud_resuelta", "Solicitud ya resuelta", "La solicitud ya fue aprobada o rechazada.");
const pendienteDuplicada = () =>
  new Problema(409, "solicitud_pendiente", "Solicitud pendiente", "Ya existe una solicitud pendiente para este correo.");

/** Solicitudes de acceso de las EPS. */
export function rutasSolicitudesAcceso(contexto, { limiteRegistros }) {
  const { bd, supabase } = contexto;
  const rutas = Router();
  const soloAdmin = [requerirSesion(contexto), requerirRol("admin")];

  rutas.post(
    "/solicitudes-acceso",
    limitarIntentos({ ventanaMs: 60 * 60 * 1000, limite: limiteRegistros }),
    validar({ body: esquemaNuevaSolicitud }),
    async (req, res) => {
      const { ruc, nombre, cargo, correo, clave } = req.valido.body;

      const eps = await bd.consultar(`select "epsId" from public.eps where ruc = $1`, [ruc]);
      if (!eps.rowCount) throw errorDeCampo("ruc", "El RUC no corresponde a ninguna EPS registrada.");

      const pendiente = await bd.consultar(
        `select 1 from public."solicitudesAcceso" where lower(correo) = $1 and estado = 'pendiente'`,
        [correo],
      );
      if (pendiente.rowCount) throw pendienteDuplicada();

      const { data, error } = await supabase.secreto.auth.admin.createUser({ email: correo, password: clave, email_confirm: true });
      if (error) {
        if (error.code === "email_exists" || /already (been )?registered/i.test(error.message)) {
          throw new Problema(409, "correo_registrado", "Correo registrado", "Ya existe una cuenta con este correo.");
        }
        if (error.code === "weak_password") throw errorDeCampo("clave", "La clave es demasiado débil. Use una más larga o variada.");
        throw error;
      }

      const usuarioId = data.user.id;
      try {
        const { rows } = await bd.consultar(
          `insert into public."solicitudesAcceso" ("usuarioId", "epsId", nombre, cargo, correo)
           values ($1, $2, $3, $4, $5)
           returning "solicitudAccesoId", estado, "solicitadoEn"`,
          [usuarioId, eps.rows[0].epsId, nombre, cargo, correo],
        );
        const fila = rows[0];
        res.status(201).json({ solicitudAccesoId: fila.solicitudAccesoId, estado: fila.estado, solicitadoEn: fila.solicitadoEn.toISOString() });
      } catch (errorInsercion) {
        // No dejar cuentas sin solicitud.
        const { error: errorBorrado } = await supabase.secreto.auth.admin.deleteUser(usuarioId);
        if (errorBorrado) console.error(`[${req.trazaId}] no se pudo borrar la cuenta ${usuarioId}:`, errorBorrado.message);
        if (errorInsercion.code === "23505") throw pendienteDuplicada();
        throw errorInsercion;
      }
    },
  );

  rutas.get("/solicitudes-acceso", ...soloAdmin, validar({ query: esquemaListado }), async (req, res) => {
    const { estado, pagina, tamanoPagina, orden } = req.valido.query;
    const filtro = estado ? `where s.estado = $1` : "";
    const valores = estado ? [estado] : [];
    const desplazamiento = (pagina - 1) * tamanoPagina;

    const [{ rows }, conteo] = await Promise.all([
      bd.consultar(
        `select ${COLUMNAS} from public."solicitudesAcceso" s join public.eps e on e."epsId" = s."epsId"
         ${filtro} order by ${ORDEN[orden]}, s."solicitudAccesoId"
         limit ${tamanoPagina} offset ${desplazamiento}`,
        valores,
      ),
      bd.consultar(`select count(*)::int as total from public."solicitudesAcceso" s ${filtro}`, valores),
    ]);
    const total = conteo.rows[0].total;
    res.json({
      datos: rows.map(solicitudPublica),
      paginacion: { pagina, tamanoPagina, total, totalPaginas: Math.ceil(total / tamanoPagina) },
    });
  });

  rutas.post(
    "/solicitudes-acceso/:solicitudAccesoId/aprobacion",
    ...soloAdmin,
    validar({ params: esquemaIdSolicitud }),
    async (req, res) => {
      const { solicitudAccesoId } = req.valido.params;
      const solicitud = await bd.enTransaccion(async (cliente) => {
        const { rows } = await cliente.query(
          `select "usuarioId", "epsId", nombre, cargo, estado from public."solicitudesAcceso"
           where "solicitudAccesoId" = $1 for update`,
          [solicitudAccesoId],
        );
        if (!rows.length) throw noEncontrada();
        const actual = rows[0];
        if (actual.estado !== "pendiente" || !actual.usuarioId) throw yaResuelta();

        await cliente.query(
          `insert into public.perfiles ("usuarioId", nombre, cargo, rol, area, "epsId", proveedor)
           values ($1, $2, $3, 'eps', 'ep', $4, 'correo')`,
          [actual.usuarioId, actual.nombre, actual.cargo, actual.epsId],
        );
        await cliente.query(
          `update public."solicitudesAcceso"
           set estado = 'aprobada', "resueltoEn" = now(), "resueltoPorId" = $2
           where "solicitudAccesoId" = $1`,
          [solicitudAccesoId, req.perfil.usuarioId],
        );
        return leerSolicitud(cliente, solicitudAccesoId);
      });
      res.json(solicitudPublica(solicitud));
    },
  );

  rutas.post(
    "/solicitudes-acceso/:solicitudAccesoId/rechazo",
    ...soloAdmin,
    validar({ params: esquemaIdSolicitud, body: esquemaRechazo }),
    async (req, res) => {
      const { solicitudAccesoId } = req.valido.params;
      const { motivoRechazo } = req.valido.body;
      const { solicitud, usuarioId } = await bd.enTransaccion(async (cliente) => {
        const { rows } = await cliente.query(
          `select "usuarioId", estado from public."solicitudesAcceso" where "solicitudAccesoId" = $1 for update`,
          [solicitudAccesoId],
        );
        if (!rows.length) throw noEncontrada();
        if (rows[0].estado !== "pendiente") throw yaResuelta();
        await cliente.query(
          `update public."solicitudesAcceso"
           set estado = 'rechazada', "motivoRechazo" = $2, "resueltoEn" = now(), "resueltoPorId" = $3
           where "solicitudAccesoId" = $1`,
          [solicitudAccesoId, motivoRechazo, req.perfil.usuarioId],
        );
        return { solicitud: await leerSolicitud(cliente, solicitudAccesoId), usuarioId: rows[0].usuarioId };
      });

      // Borra la cuenta rechazada.
      if (usuarioId) {
        const { error } = await supabase.secreto.auth.admin.deleteUser(usuarioId);
        if (error) console.error(`[${req.trazaId}] no se pudo borrar la cuenta rechazada ${usuarioId}:`, error.message);
      }
      res.json(solicitudPublica(solicitud));
    },
  );

  return rutas;
}

async function leerSolicitud(cliente, solicitudAccesoId) {
  const { rows } = await cliente.query(
    `select ${COLUMNAS} from public."solicitudesAcceso" s join public.eps e on e."epsId" = s."epsId"
     where s."solicitudAccesoId" = $1`,
    [solicitudAccesoId],
  );
  return rows[0];
}
