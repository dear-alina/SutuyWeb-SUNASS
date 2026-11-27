// Carga los CSV del sprint (datos sintéticos del concurso) en la base LOCAL para probar el panel gerencial.
// Uso: npm run cargar-datos-sprint -- <ds02_procedimientos.csv> <ds02_hitos_procedimientos.csv>
// Los CSV no se versionan: se pasan por ruta. Solo funciona contra localhost.
import { readFileSync } from "node:fs";
import { crearBd } from "../src/compartido/bd.js";

const AREAS = { "ep": "ep", "ep e interesados": "ep_e_interesados", "dre": "dre", "srt": "srt", "equipo srt": "equipo_srt", "oaj": "oaj", "du": "du", "gg": "gg", "cd": "cd", "inei": "inei" };

function exigirLocal(url) {
  const host = new URL(url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Carga cancelada: DATABASE_URL apunta a "${host}". Este script solo carga datos en la base local.`);
  }
}

/** UTF-8 y, si no es válido, Windows-1252 (algunos CSV del concurso vienen así). */
function leerTexto(ruta) {
  const bytes = readFileSync(ruta);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function separarLinea(linea) {
  const campos = [];
  let actual = "", entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (entreComillas) {
      if (c === '"' && linea[i + 1] === '"') { actual += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else actual += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ",") { campos.push(actual); actual = ""; }
    else actual += c;
  }
  campos.push(actual);
  return campos.map((x) => x.trim());
}

/** CSV a objetos. Admite el «;» final y las filas que vienen enteras entre comillas. */
function leerCsv(ruta) {
  const lineas = leerTexto(ruta).replace(/^﻿/, "").split(/\r?\n/).map((l) => l.replace(/;+\s*$/, "")).filter((l) => l.trim());
  const columnas = separarLinea(lineas[0]);
  return lineas.slice(1).map((linea) => {
    let valores = separarLinea(linea);
    if (valores.length === 1 && columnas.length > 1) valores = separarLinea(valores[0]);
    return Object.fromEntries(columnas.map((c, i) => [c, valores[i] ?? ""]));
  });
}

const vacioANulo = (v) => (v === undefined || v === "" ? null : v);

async function cargar([rutaProcedimientos, rutaHitos]) {
  if (!rutaProcedimientos || !rutaHitos) throw new Error("Indique las rutas de ds02_procedimientos.csv y ds02_hitos_procedimientos.csv.");
  exigirLocal(process.env.DATABASE_URL);
  const procedimientos = leerCsv(rutaProcedimientos);
  const hitos = leerCsv(rutaHitos);
  const bd = crearBd(process.env.DATABASE_URL);

  try {
    await bd.enTransaccion(async (cliente) => {
      for (const p of procedimientos) {
        await cliente.query(
          `insert into public.expedientes ("codigoExpediente", "epsId", "tipoProcedimiento", estado, "fechaInicio", "plazoMaximoDiasHabiles", "montoSolicitado", resultado, "fechaConclusion")
           select $1, "epsId", $3, $4, $5::date, $6::integer, $7::numeric, $8, $9::date from public.eps where "codigoEps" = $2
           on conflict ("codigoExpediente") do update set
             estado = excluded.estado, "fechaInicio" = excluded."fechaInicio", "plazoMaximoDiasHabiles" = excluded."plazoMaximoDiasHabiles",
             "montoSolicitado" = excluded."montoSolicitado", resultado = excluded.resultado, "fechaConclusion" = excluded."fechaConclusion"`,
          [p.id_expediente, p.cod_eps, p.tipo_procedimiento, p.estado, p.fecha_inicio, vacioANulo(p.plazo_maximo_dh),
            vacioANulo(p.monto_solicitado), vacioANulo(p.resultado), vacioANulo(p.fecha_conclusion)],
        );
      }
      const codigos = [...new Set(hitos.map((h) => h.id_expediente))];
      await cliente.query(
        `delete from public.hitos where "expedienteId" in (select "expedienteId" from public.expedientes where "codigoExpediente" = any($1))`,
        [codigos],
      );
      for (const h of hitos) {
        const area = AREAS[h.responsable.toLowerCase()];
        if (!area) throw new Error(`Responsable desconocido en ${h.id_expediente}, hito ${h.nro_hito}: «${h.responsable}».`);
        await cliente.query(
          `insert into public.hitos ("expedienteId", numero, etapa, "codigoHito", descripcion, responsable, "iniciadoEn", "finalizadoEn", "plazoReferencialDiasHabiles", "cuentaPlazo", "numeroDocumento")
           select "expedienteId", $2::integer, $3, $4, $5, $6, $7::date, $8::date, $9::integer, $10::boolean, $11 from public.expedientes where "codigoExpediente" = $1`,
          [h.id_expediente, h.nro_hito, vacioANulo(h.etapa), h.hito, vacioANulo(h.descripcion), area, h.fecha_inicio,
            vacioANulo(h.fecha_fin), vacioANulo(h.plazo_referencial_dh), (h.cuenta_plazo || "True").toLowerCase() !== "false", vacioANulo(h.documento)],
        );
      }
    });
    console.log(`Cargados ${procedimientos.length} expedientes y ${hitos.length} hitos en la base local.`);
  } finally {
    await bd.cerrar();
  }
}

cargar(process.argv.slice(2)).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
