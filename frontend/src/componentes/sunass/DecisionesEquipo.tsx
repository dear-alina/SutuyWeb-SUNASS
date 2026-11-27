"use client";

import { useState } from "react";
import { FECHA_CORTE, type ExpedienteFi } from "@/demo/expedientes-demo";
import { actualizarExpediente } from "@/demo/almacen-expedientes";
import { completarPaso, firmarOficioPedido, registrarPedido } from "@/demo/flujo-fi";
import { REQUISITOS_TUPA_FI, revisarRequisitos } from "@/demo/requisitos-tupa";
import { generarNumeroDocumento } from "@/demo/reglas-sunass";
import { PLAZO_INFORMACION_MAXIMO_DIAS_HABILES, PLAZO_SUBSANACION_DIAS_HABILES } from "@/demo/reglas-eps";

type Props = { expediente: ExpedienteFi; alTerminar: (texto: string) => void };

/**
 * Equipo SRT · Verificar los requisitos del TUPA.
 * Cumple → evaluación. No cumple → la SRT firma el oficio de subsanación (TUO LPAG art. 125.1: 2 días hábiles).
 * El equipo registra la decisión; quien firma el oficio es la SRT (flujograma del FI).
 */
export function VerificarRequisitos({ expediente, alTerminar }: Props) {
  const requisitos = revisarRequisitos(expediente.documentos);
  const faltantes = requisitos.filter((r) => !r.documento).map((r) => r.codigo as string);
  const [decision, setDecision] = useState<"cumple" | "no_cumple" | null>(faltantes.length ? "no_cumple" : null);
  const [observados, setObservados] = useState<string[]>(faltantes);
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState("");

  function registrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!decision) { setError("Elija si la solicitud cumple o no los requisitos."); return; }
    if (decision === "cumple") {
      if (faltantes.length) { setError("Hay requisitos sin documento: no puede marcarse como «Cumple»."); return; }
      actualizarExpediente(expediente.codigoExpediente, (e) => completarPaso(e, FECHA_CORTE));
      alTerminar("Requisitos conformes. Sigue la evaluación del caso.");
      return;
    }
    if (observados.length === 0) { setError("Marque al menos un requisito observado."); return; }
    actualizarExpediente(expediente.codigoExpediente, (e) =>
      registrarPedido(e, FECHA_CORTE, { tipo: "subsanacion", requisitos: observados, detalle, plazoDiasHabiles: PLAZO_SUBSANACION_DIAS_HABILES }));
    alTerminar("Observaciones registradas. Pasa a la SRT para revisar y firmar el oficio de subsanación.");
  }

  return (
    <form className="accion-banner" onSubmit={registrar}>
      <p className="accion-banner__titulo">Le toca a usted verificar los requisitos del TUPA</p>
      <fieldset className="equipo">
        <legend>¿La solicitud cumple los requisitos del TUPA? ({requisitos.length - faltantes.length} de {requisitos.length} con documento)</legend>
        <label className={decision === "cumple" ? "equipo__opcion equipo__opcion--marcada" : "equipo__opcion"}>
          <input type="radio" name="decision" checked={decision === "cumple"} onChange={() => { setError(""); setDecision("cumple"); }} />
          <span><b>Cumple</b><small>Sigue: evaluar el caso fortuito o de fuerza mayor</small></span>
        </label>
        <label className={decision === "no_cumple" ? "equipo__opcion equipo__opcion--marcada" : "equipo__opcion"}>
          <input type="radio" name="decision" checked={decision === "no_cumple"} onChange={() => { setError(""); setDecision("no_cumple"); }} />
          <span><b>No cumple</b><small>Sigue: la SRT firma el oficio de subsanación; la EP tiene {PLAZO_SUBSANACION_DIAS_HABILES} días hábiles (TUO LPAG art. 125.1)</small></span>
        </label>
      </fieldset>

      {decision === "no_cumple" && (
        <fieldset className="equipo">
          <legend>Requisitos observados</legend>
          {REQUISITOS_TUPA_FI.map((r) => {
            const marcado = observados.includes(r.codigo);
            const sinDocumento = faltantes.includes(r.codigo);
            return (
              <label key={r.codigo} className={marcado ? "equipo__opcion equipo__opcion--marcada" : "equipo__opcion"}>
                <input type="checkbox" checked={marcado} onChange={() => setObservados(marcado ? observados.filter((c) => c !== r.codigo) : [...observados, r.codigo])} />
                <span><b>{r.texto}</b><small>{sinDocumento ? "No presentado" : "Presentado: marque si está incompleto o no corresponde"}</small></span>
              </label>
            );
          })}
          <label className="campo">
            <span>Detalle de la observación (aparecerá en el oficio)</span>
            <textarea rows={3} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Ej.: el informe no indica el evento de fuerza mayor ni su fecha" />
          </label>
        </fieldset>
      )}

      {error && <p className="aviso aviso--alerta" role="alert">{error}</p>}
      <p><small>Base: TUPA de la Sunass (PA9000ED96); TUO LPAG art. 125. Si la EP no subsana a tiempo, la solicitud se considera no presentada (art. 125.4).</small></p>
      <div className="ficha__botones">
        <button type="submit" className="boton"><span className="ms" aria-hidden="true">fact_check</span> Registrar verificación</button>
      </div>
    </form>
  );
}

/**
 * Equipo SRT · Evaluar el caso.
 * Suficiente → elaborar el informe. Falta información → la SRT firma el oficio (RGT 89.6: hasta 10 días hábiles, una prórroga).
 */
export function EvaluarCaso({ expediente, alTerminar }: Props) {
  const [decision, setDecision] = useState<"suficiente" | "falta" | null>(null);
  const [detalle, setDetalle] = useState("");
  const [plazo, setPlazo] = useState(PLAZO_INFORMACION_MAXIMO_DIAS_HABILES);
  const [error, setError] = useState("");
  const yaSePidio = (expediente.pedidos ?? []).some((p) => p.tipo === "informacion");

  function registrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!decision) { setError("Elija si la información es suficiente."); return; }
    if (decision === "suficiente") {
      actualizarExpediente(expediente.codigoExpediente, (e) => completarPaso(e, FECHA_CORTE));
      alTerminar("Evaluación concluida. Sigue la elaboración del informe técnico-legal y del proyecto de resolución.");
      return;
    }
    if (!detalle.trim()) { setError("Indique qué información necesita."); return; }
    actualizarExpediente(expediente.codigoExpediente, (e) =>
      registrarPedido(e, FECHA_CORTE, { tipo: "informacion", requisitos: [], detalle: detalle.trim(), plazoDiasHabiles: plazo }));
    alTerminar("Pedido registrado. Pasa a la SRT para revisar y firmar el oficio de información adicional.");
  }

  return (
    <form className="accion-banner" onSubmit={registrar}>
      <p className="accion-banner__titulo">Le toca a usted evaluar el caso fortuito o de fuerza mayor y el uso propuesto</p>
      <fieldset className="equipo">
        <legend>¿La información presentada es suficiente para evaluar?</legend>
        <label className={decision === "suficiente" ? "equipo__opcion equipo__opcion--marcada" : "equipo__opcion"}>
          <input type="radio" name="evaluacion" checked={decision === "suficiente"} onChange={() => { setError(""); setDecision("suficiente"); }} />
          <span><b>Sí, es suficiente</b><small>Sigue: elaborar el informe técnico-legal y el proyecto de resolución (RGT 89.3)</small></span>
        </label>
        <label className={decision === "falta" ? "equipo__opcion equipo__opcion--marcada" : "equipo__opcion"}>
          <input type="radio" name="evaluacion" checked={decision === "falta"} onChange={() => { setError(""); setDecision("falta"); }} />
          <span><b>Falta información</b><small>Sigue: la SRT firma el oficio; la EP responde en un plazo de hasta {PLAZO_INFORMACION_MAXIMO_DIAS_HABILES} días hábiles (RGT 89.6)</small></span>
        </label>
      </fieldset>

      {decision === "falta" && (
        <fieldset className="equipo">
          <legend>Pedido de información adicional{yaSePidio ? " (ya hubo un pedido anterior)" : ""}</legend>
          <label className="campo">
            <span>Qué información necesita</span>
            <textarea rows={3} value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="Ej.: presupuesto detallado de la reparación y fotografías del daño" />
          </label>
          <label className="campo">
            <span>Plazo para la EP (días hábiles, máximo {PLAZO_INFORMACION_MAXIMO_DIAS_HABILES})</span>
            <input type="number" min={1} max={PLAZO_INFORMACION_MAXIMO_DIAS_HABILES} value={plazo}
              onChange={(e) => setPlazo(Math.min(PLAZO_INFORMACION_MAXIMO_DIAS_HABILES, Math.max(1, Number(e.target.value) || 1)))} />
          </label>
        </fieldset>
      )}

      {error && <p className="aviso aviso--alerta" role="alert">{error}</p>}
      <p><small>Base: RGT art. 89.6. Mientras la EP responde, el plazo de la Sunass se suspende (TUO LPAG art. 125.5).</small></p>
      <div className="ficha__botones">
        <button type="submit" className="boton"><span className="ms" aria-hidden="true">fact_check</span> Registrar evaluación</button>
      </div>
    </form>
  );
}

/** SRT · Revisar y firmar el oficio de subsanación o de información adicional; se notifica a la EP en su casilla. */
export function FirmarOficioPedido({ expediente, alTerminar }: Props) {
  const pedido = (expediente.pedidos ?? []).at(-1);
  if (!pedido) return null;
  const esSubsanacion = pedido.tipo === "subsanacion";
  const textos = REQUISITOS_TUPA_FI.filter((r) => pedido.requisitos.includes(r.codigo)).map((r) => r.texto);

  return (
    <div className="accion-banner">
      <p className="accion-banner__titulo">Le toca a usted revisar y firmar el oficio de {esSubsanacion ? "subsanación de requisitos" : "información adicional"}</p>
      <div className="oficio-borrador">
        <p><b>Borrador del oficio</b> · preparado con lo que registró el equipo SRT</p>
        {esSubsanacion && textos.length > 0 && <ul>{textos.map((t) => <li key={t}>{t}</li>)}</ul>}
        {pedido.detalle && <p>{pedido.detalle}</p>}
        <p>Plazo para la EP: <b>{pedido.plazoDiasHabiles} días hábiles</b> desde la notificación.{esSubsanacion ? " Si no subsana, la solicitud se considerará no presentada." : " Puede pedir una prórroga una sola vez, antes del vencimiento."}</p>
      </div>
      <p><small>Base: {esSubsanacion ? "TUO LPAG arts. 125.1 y 125.4" : "RGT art. 89.6"}. Al firmar, el oficio se notifica en la casilla de la EP y su plazo empieza a correr; el de la Sunass se suspende.</small></p>
      <div className="ficha__botones">
        <button type="button" className="boton" onClick={() => {
          const numero = generarNumeroDocumento(expediente, "oficio", "SRT");
          actualizarExpediente(expediente.codigoExpediente, (e) => firmarOficioPedido(e, FECHA_CORTE, numero));
          alTerminar(`Oficio ${numero} firmado y notificado a la EP.`);
        }}><span className="ms" aria-hidden="true">signature</span> Firmar oficio y notificar</button>
      </div>
    </div>
  );
}
