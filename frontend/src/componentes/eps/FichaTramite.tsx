"use client";

import { useState } from "react";
import { FECHA_CORTE, type ExpedienteFi } from "@/demo/expedientes-demo";
import { actualizarExpediente } from "@/demo/almacen-expedientes";
import { responderPedido } from "@/demo/flujo-fi";
import { REQUISITOS_TUPA_FI } from "@/demo/requisitos-tupa";
import {
  ETAPAS_EPS, TEXTO_RESULTADO, filtrarDocumentosParaEps, obtenerHitoPendiente, obtenerInicioEtapa,
  obtenerUltimoMovimiento, type SituacionEps,
} from "@/demo/reglas-eps";
import { formatearFecha, textoDiasHabiles } from "@/utilidades/formatear-fecha";
import { IndicadorSilencio } from "./IndicadorSilencio";

const TIPO_DOCUMENTO: Record<string, string> = {
  carta_ep: "Carta de la EP", anexo: "Anexo", oficio: "Oficio", resolucion_consejo_directivo: "Resolución del Consejo Directivo",
};

function PanelQueDebeHacer({ expediente, situacion }: { expediente: ExpedienteFi; situacion: SituacionEps }) {
  const [mensaje, setMensaje] = useState("");
  const [archivos, setArchivos] = useState<Record<string, string>>({});
  const { accion } = situacion;
  const pedido = (expediente.pedidos ?? []).at(-1);

  if (!accion) {
    return (
      <section className="ficha__bloque" aria-labelledby="que-hacer">
        <h3 id="que-hacer">¿Debe hacer algo?</h3>
        {mensaje && <p className="aviso aviso--exito" role="status">{mensaje}</p>}
        <p>No. {situacion.queEstaPasando}</p>
      </section>
    );
  }

  // Lo que pide el oficio: en la subsanación, un PDF por cada requisito observado; en la información, uno solo
  const campos = accion.tipo === "subsanar" && pedido?.requisitos.length
    ? REQUISITOS_TUPA_FI.filter((r) => pedido.requisitos.includes(r.codigo)).map((r) => ({ codigo: r.codigo as string, texto: r.texto }))
    : [{ codigo: "informacion", texto: accion.tipo === "subsanar" ? "Documento de subsanación" : "Información adicional solicitada" }];

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const enviados = campos.map((c) => ({
      nombre: archivos[c.codigo], descripcion: c.texto, codigoRequisito: c.codigo === "informacion" ? undefined : c.codigo,
    }));
    actualizarExpediente(expediente.codigoExpediente, (e) => responderPedido(e, FECHA_CORTE, enviados));
    setMensaje(`${accion?.tipo === "subsanar" ? "Subsanación" : "Información"} enviada el ${formatearFecha(FECHA_CORTE)}. La Sunass continúa con la evaluación y su plazo vuelve a correr.`);
  }

  return (
    <section className="ficha__bloque ficha__bloque--accion" aria-labelledby="que-hacer">
      <h3 id="que-hacer">¿Debe hacer algo? Sí</h3>
      <p><b>{accion.titulo}</b> antes del <b>{formatearFecha(accion.venceEl)}</b> ({accion.diasHabilesRestantes >= 0 ? `faltan ${textoDiasHabiles(accion.diasHabilesRestantes)}` : "plazo vencido"}). <small>Base: {accion.base}.</small></p>
      {pedido && (
        <div className="pedido-sunass">
          <p><b>Lo que pide la Sunass</b>{pedido.numeroOficio ? ` · Oficio ${pedido.numeroOficio}` : ""}</p>
          {pedido.detalle && <p>{pedido.detalle}</p>}
        </div>
      )}
      <form className="ficha__formulario" onSubmit={enviar}>
        {campos.map((c) => (
          <label key={c.codigo} className="campo">
            <span>{c.texto} (PDF){archivos[c.codigo] ? ` · ${archivos[c.codigo]}` : ""}</span>
            <input type="file" accept="application/pdf" required onChange={(e) => setArchivos({ ...archivos, [c.codigo]: e.target.files?.[0]?.name ?? "" })} />
          </label>
        ))}
        <div className="ficha__botones">
          <button type="submit" className="boton">{accion.tipo === "subsanar" ? "Enviar subsanación" : "Enviar información"}</button>
          {accion.puedePedirProrroga && (
            <button type="button" className="boton boton--secundario" onClick={() => setMensaje("Pedido de prórroga enviado. Solo puede pedirse una vez y antes del vencimiento (RGT 89.6); la Sunass le responderá.")}>
              Pedir prórroga
            </button>
          )}
        </div>
      </form>
      {mensaje && <p className="aviso aviso--exito" role="status">{mensaje}</p>}
    </section>
  );
}

function LineaTiempo({ expediente }: { expediente: ExpedienteFi }) {
  const pendiente = obtenerHitoPendiente(expediente);
  const indiceActual = pendiente ? ETAPAS_EPS.findIndex((e) => (e.hitos as readonly string[]).includes(pendiente.codigoHito)) : ETAPAS_EPS.length;
  const tuvoSubsanacion = expediente.hitos.some((h) => h.codigoHito === "subsanacion_ep");
  const tuvoRequerimiento = expediente.hitos.some((h) => h.codigoHito === "informacion_ep");
  return (
    <section className="ficha__bloque" aria-labelledby="avance">
      <h3 id="avance">¿En qué etapa está?</h3>
      <ol className="avance">
        {ETAPAS_EPS.map((etapa, indice) => {
          const estado = indice < indiceActual ? "hecha" : indice === indiceActual ? "actual" : "pendiente";
          const inicio = obtenerInicioEtapa(expediente, etapa.hitos);
          return (
            <li key={etapa.codigo} className={`avance__paso avance__paso--${estado}`}>
              <span className="avance__marca" aria-hidden="true">{estado === "hecha" ? "✓" : indice + 1}</span>
              <span className="avance__texto">
                <span>
                  {etapa.texto}
                  <span className="sr-only"> ({estado === "hecha" ? "completada" : estado === "actual" ? "etapa actual" : "pendiente"})</span>
                  {etapa.codigo === "requisitos" && tuvoSubsanacion && <small> · con subsanación</small>}
                  {etapa.codigo === "evaluacion" && tuvoRequerimiento && <small> · con pedido de información</small>}
                </span>
                {inicio && estado !== "pendiente" && <small>desde el {formatearFecha(inicio)}</small>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function FichaTramite({ expediente, situacion, fechaReferencia }: { expediente: ExpedienteFi; situacion: SituacionEps; fechaReferencia: string }) {
  const documentos = filtrarDocumentosParaEps(expediente.documentos);
  return (
    <article className="ficha" aria-labelledby="ficha-titulo">
      <header className="ficha__cabecera">
        <p className="ficha__codigo">{expediente.codigoExpediente} · RGT art. 89 · TUPA de la Sunass</p>
        <h2 id="ficha-titulo">Uso excepcional del fondo de inversiones</h2>
        <p>
          <span className={`chip chip--${situacion.tono}`}>{situacion.textoEstado}</span>
          {expediente.resultado && <span className="sr-only">Resultado: {TEXTO_RESULTADO[expediente.resultado]}</span>}
        </p>
        <p className="ficha__resumen">
          Presentada el {formatearFecha(expediente.fechaInicio)} · último movimiento el {formatearFecha(obtenerUltimoMovimiento(expediente))}
          {expediente.motivo ? ` · ${expediente.motivo}` : ""}
        </p>
      </header>

      <PanelQueDebeHacer key={expediente.codigoExpediente} expediente={expediente} situacion={situacion} />
      <LineaTiempo expediente={expediente} />
      <IndicadorSilencio expediente={expediente} situacion={situacion} fechaReferencia={fechaReferencia} />

      <section className="ficha__bloque" aria-labelledby="documentos">
        <h3 id="documentos">Documentos</h3>
        {documentos.length === 0 ? (
          <p>Todavía no hay documentos disponibles para usted en este trámite.</p>
        ) : (
          <ul className="documentos">
            {documentos.map((d) => (
              <li key={d.codigoDocumento}>
                <span className="ms" aria-hidden="true">description</span>
                <span><b>{TIPO_DOCUMENTO[d.tipoDocumento]} {d.numeroDocumento}</b><small>{d.asunto} · {formatearFecha(d.fechaDocumento)}</small></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
