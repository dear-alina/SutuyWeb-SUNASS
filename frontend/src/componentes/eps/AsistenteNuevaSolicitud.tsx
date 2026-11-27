"use client";

import { useState } from "react";
import Link from "next/link";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import { FECHA_CORTE, type ExpedienteFi } from "@/demo/expedientes-demo";
import { sumarDiasHabiles } from "@/demo/calendario-demo";
import { agregarExpediente, generarCodigoDemo } from "@/demo/almacen-expedientes";
import { formatearFecha } from "@/utilidades/formatear-fecha";

// Documentos que acompañan la solicitud según el TUPA de la Sunass (PA9000ED96).
// La EP los adjunta; quien verifica los requisitos es el equipo de la Sunass, no este formulario.
const DOCUMENTOS_TUPA = [
  { codigo: "informe", texto: "Informe sobre la propuesta de uso excepcional (caso fortuito o de fuerza mayor)" },
  { codigo: "sustento", texto: "Documentos que sustentan la propuesta" },
  { codigo: "propuesta", texto: "Propuesta de devolución o de exoneración de la devolución" },
] as const;

export function AsistenteNuevaSolicitud() {
  const { perfil } = usarSesion();
  const [asunto, setAsunto] = useState("");
  const [archivos, setArchivos] = useState<Record<string, string>>({});
  const [constancia, setConstancia] = useState<{ codigo: string; fecha: string; venceEl: string } | null>(null);

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
        { codigoDocumento: `${codigo}-1`, tipoDocumento: "carta_ep", numeroDocumento: "Solicitud", fechaDocumento: fecha, asunto: asunto || "Solicitud de uso excepcional del fondo de inversiones", nivelAcceso: "restringido_partes" },
        ...DOCUMENTOS_TUPA.filter((d) => archivos[d.codigo]).map((d, i) => ({
          codigoDocumento: `${codigo}-${i + 2}`, tipoDocumento: "anexo" as const, numeroDocumento: `Anexo ${i + 1}`,
          fechaDocumento: fecha, asunto: `${d.texto} (${archivos[d.codigo]})`, nivelAcceso: "restringido_partes" as const,
        })),
      ],
    };
    agregarExpediente(expediente);
    setConstancia({ codigo, fecha, venceEl: sumarDiasHabiles(fecha, 30) });
  }

  if (constancia) {
    return (
      <section className="asistente" aria-labelledby="constancia">
        <h1 id="constancia">Solicitud enviada</h1>
        <div className="aviso aviso--exito" role="status">
          <p><b>Constancia de recepción {constancia.codigo}</b> · {formatearFecha(constancia.fecha)}</p>
          <p>Su solicitud ya está en el flujo de la Sunass. Puede seguir su avance en «Mis solicitudes». El plazo de 30 días hábiles vence el <b>{formatearFecha(constancia.venceEl)}</b>, salvo que la Sunass le pida subsanar o enviar información.</p>
        </div>
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
          <legend>Documentos que adjunta (PDF)</legend>
          <ul className="requisitos">
            {DOCUMENTOS_TUPA.map((d) => (
              <li key={d.codigo} className={archivos[d.codigo] ? "requisitos__item requisitos__item--listo" : "requisitos__item"}>
                <span className="ms" aria-hidden="true">{archivos[d.codigo] ? "check_circle" : "upload_file"}</span>
                <label className="campo">
                  <span>{d.texto}{archivos[d.codigo] ? ` · ${archivos[d.codigo]}` : ""}</span>
                  <input type="file" accept="application/pdf" onChange={(e) => setArchivos({ ...archivos, [d.codigo]: e.target.files?.[0]?.name ?? "" })} />
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="asistente__botones">
          <button type="submit" className="boton">Enviar solicitud</button>
        </div>
      </form>
    </section>
  );
}
