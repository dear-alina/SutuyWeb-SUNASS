"use client";

import { useState } from "react";
import type { ExpedienteFi } from "@/demo/expedientes-demo";
import {
  ETAPAS_EPS, TEXTO_RESULTADO, filtrarDocumentosParaEps, obtenerHitoPendiente, obtenerInicioEtapa,
  obtenerUltimoMovimiento, type SituacionEps,
} from "@/demo/reglas-eps";
import { formatearFecha, textoDiasHabiles } from "@/utilidades/formatear-fecha";
import { IndicadorSilencio } from "./IndicadorSilencio";

const TIPO_DOCUMENTO: Record<string, string> = {
  carta_ep: "Carta de la EP", anexo: "Anexo", oficio: "Oficio", resolucion_consejo_directivo: "Resolución del Consejo Directivo",
};

function PanelQueDebeHacer({ situacion }: { situacion: SituacionEps }) {
  const [mensaje, setMensaje] = useState("");
  const { accion } = situacion;
  if (!accion) {
    return (
      <section className="ficha__bloque" aria-labelledby="que-hacer">
        <h3 id="que-hacer">¿Debe hacer algo?</h3>
        <p>No. {situacion.queEstaPasando}</p>
      </section>
    );
  }
  return (
    <section className="ficha__bloque ficha__bloque--accion" aria-labelledby="que-hacer">
      <h3 id="que-hacer">¿Debe hacer algo? Sí</h3>
      <p><b>{accion.titulo}</b> antes del <b>{formatearFecha(accion.venceEl)}</b> ({accion.diasHabilesRestantes >= 0 ? `faltan ${textoDiasHabiles(accion.diasHabilesRestantes)}` : "plazo vencido"}). <small>Base: {accion.base}.</small></p>
      <form className="ficha__formulario" onSubmit={(e) => { e.preventDefault(); setMensaje("Documento enviado. Recibirá una constancia de recepción."); }}>
        <label className="campo">
          <span>Adjuntar documento (PDF)</span>
          <input type="file" accept="application/pdf" required />
        </label>
        <div className="ficha__botones">
          <button type="submit" className="boton">{accion.tipo === "subsanar" ? "Enviar subsanación" : "Enviar información"}</button>
          {accion.puedePedirProrroga && (
            <button type="button" className="boton boton--secundario" onClick={() => setMensaje("Pedido de prórroga enviado. Solo puede pedirse una vez y antes del vencimiento (RGT 89.6).")}>
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

      <PanelQueDebeHacer situacion={situacion} />
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
