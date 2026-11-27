"use client";

import { useState } from "react";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import { obtenerIdPersona } from "@/servicios/copiloto/persona";
import {
  ErrorCopiloto, consultarDocumentosIndexados, evaluarRequisitos, registrarDecision,
  type DecisionCopiloto, type RequisitoParaCopiloto, type RespuestaEvaluacion, type ResultadoCopiloto,
} from "@/servicios/copiloto/cliente-copiloto";

const ESTADO: Record<string, { texto: string; tono: string; icono: string }> = {
  evidencia_encontrada: { texto: "Evidencia encontrada", tono: "exito", icono: "task_alt" },
  evidencia_parcial: { texto: "Evidencia parcial", tono: "accion", icono: "rule" },
  no_hallada: { texto: "No hallada", tono: "alerta", icono: "search_off" },
  no_determinable: { texto: "No determinable", tono: "neutro", icono: "help" },
};

type Props = {
  codigoExpediente: string;
  titulo: string;
  requisitos: RequisitoParaCopiloto[];
  plazoDiasHabiles?: number;
  aviso?: string;
  alUsarBorrador?: (borrador: string) => void;
};

/**
 * Revisión asistida con el copiloto (RAG con verificación de citas).
 * El copiloto nunca dice «cumple»: sugiere evidencia con su cita, documento y página. Decide el especialista.
 */
export function RevisionCopiloto({ codigoExpediente, titulo, requisitos, plazoDiasHabiles, aviso, alUsarBorrador }: Props) {
  const { perfil } = usarSesion();
  const [estado, setEstado] = useState<"inicio" | "cargando" | "listo" | "sin_documentos" | "error">("inicio");
  const [respuesta, setRespuesta] = useState<RespuestaEvaluacion | null>(null);
  const [error, setError] = useState("");
  const [decisiones, setDecisiones] = useState<Record<string, string>>({});

  async function revisar() {
    setEstado("cargando");
    setError("");
    try {
      const { documentos } = await consultarDocumentosIndexados();
      if (!documentos.some((d) => d.startsWith(codigoExpediente))) {
        setEstado("sin_documentos");
        return;
      }
      setRespuesta(await evaluarRequisitos(codigoExpediente, requisitos, plazoDiasHabiles));
      setEstado("listo");
    } catch (e) {
      setError(e instanceof ErrorCopiloto ? e.message : "El copiloto no pudo responder.");
      setEstado("error");
    }
  }

  async function decidir(r: ResultadoCopiloto, esCorrecto: boolean) {
    const noHallada = r.estado === "no_hallada";
    const decision: DecisionCopiloto = esCorrecto ? (noHallada ? "confirma_falta" : "revisado") : (noHallada ? "si_esta_en_expediente" : "no_es_correcto");
    try {
      await registrarDecision({
        codigoExpediente, codigoRequisito: r.codigoRequisito, decision, registradoPorId: obtenerIdPersona(perfil),
        estadoSugerido: r.estado, codigoFragmento: r.codigoFragmento,
      });
      setDecisiones({ ...decisiones, [r.codigoRequisito]: esCorrecto ? "Marcó la sugerencia como correcta" : "Marcó la sugerencia como incorrecta" });
    } catch (e) {
      setDecisiones({ ...decisiones, [r.codigoRequisito]: e instanceof ErrorCopiloto ? `No se registró: ${e.message}` : "No se registró la decisión." });
    }
  }

  return (
    <section className="copiloto" aria-labelledby={`copiloto-${titulo}`}>
      <div className="copiloto__cabecera">
        <h4 id={`copiloto-${titulo}`}><span className="ms" aria-hidden="true">smart_toy</span> {titulo}</h4>
        {estado !== "cargando" && (
          <button type="button" className="boton boton--secundario" onClick={revisar}>
            {estado === "inicio" ? "Revisar con el copiloto" : "Volver a revisar"}
          </button>
        )}
      </div>
      <p className="copiloto__aviso">Sugerencias automáticas con cita del documento. El copiloto no decide: la verificación y la decisión son del equipo SRT.{aviso ? ` ${aviso}` : ""}</p>

      {estado === "cargando" && <p role="status">Revisando los documentos del expediente…</p>}
      {estado === "error" && <p className="aviso aviso--alerta" role="alert">{error}</p>}
      {estado === "sin_documentos" && (
        <p className="aviso aviso--informacion" role="status">
          El copiloto no tiene documentos indexados de {codigoExpediente}. En la demo solo tiene el texto de los expedientes del concurso (por ejemplo, UFI-2026-0001); las solicitudes creadas en este navegador no traen PDF reales.
        </p>
      )}

      {estado === "listo" && respuesta && (
        <>
          <ul className="copiloto__lista">
            {respuesta.resultados.map((r) => {
              const e = ESTADO[r.estado] ?? { texto: r.estado, tono: "neutro", icono: "help" };
              return (
                <li key={r.codigoRequisito} className="copiloto__item">
                  <p className="copiloto__punto">
                    <span className={`chip chip--${e.tono}`}><span className="ms" aria-hidden="true">{e.icono}</span> {e.texto}</span>
                    <b>{r.punto}</b>
                  </p>
                  {r.cita ? (
                    <blockquote className="copiloto__cita">
                      «{r.cita}»
                      <footer>{r.documento}{r.pagina ? `, página ${r.pagina}` : ""}{r.esVerificada ? " · cita verificada" : ""}</footer>
                    </blockquote>
                  ) : null}
                  <p className="copiloto__motivo">{r.motivo}{r.debeRevisarse ? " Revise el documento antes de decidir." : ""}{r.alerta ? ` ${r.alerta}` : ""}</p>
                  {decisiones[r.codigoRequisito] ? (
                    <p className="copiloto__decision" role="status"><span className="ms" aria-hidden="true">how_to_reg</span> {decisiones[r.codigoRequisito]}</p>
                  ) : (
                    <div className="ficha__botones">
                      <button type="button" className="boton boton--secundario" onClick={() => decidir(r, true)}>Correcto</button>
                      <button type="button" className="boton boton--secundario" onClick={() => decidir(r, false)}>No es correcto</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {respuesta.borrador && alUsarBorrador && (
            <details className="copiloto__borrador">
              <summary>Ver borrador de observaciones del copiloto</summary>
              <pre>{respuesta.borrador}</pre>
              <button type="button" className="boton boton--secundario" onClick={() => alUsarBorrador(respuesta.borrador ?? "")}>
                Usar como detalle de la observación
              </button>
            </details>
          )}
          <p className="copiloto__aviso">Modelo: {respuesta.modelo}. Documentos ficticios de la hackatón.</p>
        </>
      )}
    </section>
  );
}
