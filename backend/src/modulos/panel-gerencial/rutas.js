import { Router } from "express";
import { validar } from "../../compartido/middleware.js";
import { requerirRol, requerirSesion } from "../../compartido/sesion.js";
import { crearCalendario } from "./calendario.js";
import { construirPanel } from "./calculos.js";
import { esquemaConsultaPanel, hoyEnLima } from "./esquemas.js";

// Las fechas salen de la base como texto AAAA-MM-DD: así no las altera la zona horaria del servidor.
const SQL_EXPEDIENTES = `
  select e."codigoExpediente", eps."codigoEps", e."tipoProcedimiento", e.estado, e."plazoMaximoDiasHabiles", e.resultado,
         to_char(e."fechaInicio", 'YYYY-MM-DD')     as "fechaInicio",
         to_char(e."fechaConclusion", 'YYYY-MM-DD') as "fechaConclusion"
  from public.expedientes e
  join public.eps eps on eps."epsId" = e."epsId"
  where e."fechaInicio" <= $1::date
    and ($2::text is null or e."tipoProcedimiento" = $2)
  order by e."codigoExpediente"`;

const SQL_HITOS = `
  select e."codigoExpediente", h.numero, h."codigoHito", h.responsable, h."cuentaPlazo", h."plazoReferencialDiasHabiles",
         to_char(h."iniciadoEn", 'YYYY-MM-DD')   as "iniciadoEn",
         to_char(h."finalizadoEn", 'YYYY-MM-DD') as "finalizadoEn"
  from public.hitos h
  join public.expedientes e on e."expedienteId" = h."expedienteId"
  where h."iniciadoEn" <= $1::date
    and e."fechaInicio" <= $1::date
    and ($2::text is null or e."tipoProcedimiento" = $2)`;

const SQL_DIAS_NO_HABILES = `select to_char(fecha, 'YYYY-MM-DD') as fecha from public."diasNoHabiles"`;

/** Ve los datos como estaban en la fecha de corte: lo que terminó después, seguía en curso. */
function alCorte(fechaCorte, expedientes, hitos) {
  return {
    expedientes: expedientes.map((e) =>
      e.fechaConclusion && e.fechaConclusion > fechaCorte ? { ...e, estado: "en_tramite", fechaConclusion: null, resultado: null } : e,
    ),
    hitos: hitos.map((h) => (h.finalizadoEn && h.finalizadoEn > fechaCorte ? { ...h, finalizadoEn: null } : h)),
  };
}

/** Panel gerencial de plazos para las áreas de Sunass. */
export function rutasPanelGerencial(contexto) {
  const { bd } = contexto;
  const rutas = Router();

  rutas.get(
    "/panel-gerencial",
    requerirSesion(contexto),
    requerirRol("sunass", "admin"),
    validar({ query: esquemaConsultaPanel }),
    async (req, res) => {
      const { diasAlerta, tipoProcedimiento = null } = req.valido.query;
      const fechaCorte = req.valido.query.fechaCorte ?? hoyEnLima();

      const [expedientes, hitos, diasNoHabiles] = await Promise.all([
        bd.consultar(SQL_EXPEDIENTES, [fechaCorte, tipoProcedimiento]),
        bd.consultar(SQL_HITOS, [fechaCorte, tipoProcedimiento]),
        bd.consultar(SQL_DIAS_NO_HABILES),
      ]);

      const datos = alCorte(fechaCorte, expedientes.rows, hitos.rows);
      const calendario = crearCalendario(diasNoHabiles.rows.map((d) => d.fecha));
      res.json({ ...construirPanel({ ...datos, fechaCorte, diasAlerta, calendario }), tipoProcedimiento });
    },
  );

  return rutas;
}
