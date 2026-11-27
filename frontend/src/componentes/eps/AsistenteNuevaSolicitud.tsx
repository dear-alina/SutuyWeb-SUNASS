"use client";

import { useState } from "react";
import Link from "next/link";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import { FECHA_CORTE, type ExpedienteFi } from "@/demo/expedientes-demo";
import { sumarDiasHabiles } from "@/demo/calendario-demo";
import { agregarExpediente, generarCodigoDemo } from "@/demo/almacen-expedientes";
import { REQUISITOS_TUPA_FI } from "@/demo/requisitos-tupa";
import { formatearFecha } from "@/utilidades/formatear-fecha";

// Los 3 documentos que acompañan la solicitud según el TUPA (PA9000ED96). La solicitud es este mismo formulario.
// No hay filtro previo: la mesa de partes recibe aunque falte algo y deja constancia (TUO LPAG art. 125.1).
const DOCUMENTOS_TUPA = REQUISITOS_TUPA_FI.filter((r) => r.codigo !== "solicitud");

export function AsistenteNuevaSolicitud() {
  const { perfil } = usarSesion();
  const [asunto, setAsunto] = useState("");
  const [archivos, setArchivos] = useState<Record<string, string>>({});
  const [constancia, setConstancia] = useState<{ codigo: string; fecha: string; venceEl: string; faltantes: string[] } | null>(null);
  const faltantes = DOCUMENTOS_TUPA.filter((d) => !archivos[d.codigo]);

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!perfil?.codigoEps) return;
    const codigo = generarCodigoDemo();
    const fecha = FECHA_CORTE; // fecha de recepción en la demo
    const expediente: ExpedienteFi = {
      codigoExpediente: codigo, codigoEps: perfil.codigoEps, tipoProcedimiento: "uso_excepcional_fondo",
      fechaInicio: fecha, plazoMaximoDiasHabiles: 30, estado: "en_tramite", resultado: null, fechaConclusion: null,
      motivo: asunto || null, montoSolicitado: null,
      hitos: [
        { numero: 1, codigoHito: "solicitud", area: "EP", iniciadoEn: fecha, finalizadoEn: fecha, plazoReferencialDiasHabiles: null, cuentaPlazo: true, numeroDocumento: null },
        { numero: 2, codigoHito: "derivacion", area: "DRE", iniciadoEn: fecha, finalizadoEn: null, plazoReferencialDiasHabiles: 1, cuentaPlazo: true, numeroDocumento: null },
      ],
      documentos: [
        { codigoDocumento: `${codigo}-1`, tipoDocumento: "carta_ep", numeroDocumento: "Solicitud", fechaDocumento: fecha, asunto: asunto || "Solicitud de uso excepcional del fondo de inversiones", nivelAcceso: "restringido_partes", codigoRequisito: "solicitud" },
        ...DOCUMENTOS_TUPA.filter((d) => archivos[d.codigo]).map((d, i) => ({
          codigoDocumento: `${codigo}-${i + 2}`, tipoDocumento: "anexo" as const, numeroDocumento: `Anexo ${i + 1}`,
          fechaDocumento: fecha, asunto: `${d.texto} (${archivos[d.codigo]})`, nivelAcceso: "restringido_partes" as const, codigoRequisito: d.codigo,
        })),
      ],
    };
    agregarExpediente(expediente);
    setConstancia({ codigo, fecha, venceEl: sumarDiasHabiles(fecha, 30), faltantes: faltantes.map((d) => d.texto) });
  }

  if (constancia) {
    return (
      <section className="asistente" aria-labelledby="constancia">
        <h1 id="constancia">Solicitud enviada</h1>
        <div className="aviso aviso--exito" role="status">
          <p><b>Constancia de recepción {constancia.codigo}</b> · {formatearFecha(constancia.fecha)}</p>
          <p>Su solicitud ya está en el flujo de la Sunass. Puede seguir su avance en «Mis solicitudes». El plazo de 30 días hábiles vence el <b>{formatearFecha(constancia.venceEl)}</b>, salvo que la Sunass le pida subsanar o enviar información.</p>
        </div>
        {constancia.faltantes.length > 0 && (
          <div className="aviso aviso--alerta" role="note">
            <p><b>La constancia registra que no adjuntó:</b></p>
            <ul>{constancia.faltantes.map((f) => <li key={f}>{f}</li>)}</ul>
            <p>La Sunass le observará estos requisitos y tendrá 2 días hábiles para subsanarlos. Si no lo hace, la solicitud se considerará no presentada (TUO LPAG art. 125).</p>
          </div>
        )}
        <Link href="/eps/tramites" className="boton">Ver mis solicitudes</Link>
      </section>
    );
  }

  return (
    <section className="asistente" aria-labelledby="titulo-asistente">
      <Link href="/eps/tramites" className="enlace-volver"><span className="ms" aria-hidden="true">arrow_back</span> Volver a mis solicitudes</Link>
      <h1 id="titulo-asistente">Nueva solicitud: uso excepcional del fondo de inversiones</h1>
      <p className="asistente__base">RGT art. 89 · TUPA de la Sunass · plazo de 30 días hábiles · gratuito</p>

      <form className="asistente__paso asistente__campos" onSubmit={enviar}>
        <label className="campo">
          <span>Asunto de la solicitud</span>
          <input value={asunto} onChange={(e) => setAsunto(e.target.value)} placeholder="Ej.: Rotura de línea de conducción" />
        </label>

        <fieldset className="pregunta">
          <legend>Documentos que exige el TUPA (PDF) · {DOCUMENTOS_TUPA.length - faltantes.length} de {DOCUMENTOS_TUPA.length} adjuntos</legend>
          <ul className="requisitos">
            {DOCUMENTOS_TUPA.map((d, i) => (
              <li key={d.codigo} className={archivos[d.codigo] ? "requisitos__item requisitos__item--listo" : "requisitos__item"}>
                <span className="ms" aria-hidden="true">{archivos[d.codigo] ? "check_circle" : "upload_file"}</span>
                <label className="campo">
                  <span>{i + 1}. {d.texto}{archivos[d.codigo] ? ` · ${archivos[d.codigo]}` : ""}</span>
                  <input type="file" accept="application/pdf" onChange={(e) => setArchivos({ ...archivos, [d.codigo]: e.target.files?.[0]?.name ?? "" })} />
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        {faltantes.length > 0 && (
          <p className="aviso aviso--informacion" role="status">
            Falta{faltantes.length === 1 ? "" : "n"} {faltantes.length} documento{faltantes.length === 1 ? "" : "s"}. Puede enviar igual: la mesa de partes recibirá su solicitud y dejará constancia de lo que falta, y tendrá 2 días hábiles para subsanarlo (TUO LPAG art. 125.1).
          </p>
        )}

        <div className="asistente__botones">
          <button type="submit" className="boton">Enviar solicitud</button>
        </div>
      </form>
    </section>
  );
}
