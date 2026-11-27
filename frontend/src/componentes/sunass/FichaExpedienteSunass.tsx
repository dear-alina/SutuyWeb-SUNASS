"use client";

import { useState } from "react";
import { FECHA_CORTE, type ExpedienteFi } from "@/demo/expedientes-demo";
import { actualizarExpediente } from "@/demo/almacen-expedientes";
import { NOMBRE_AREA, PASOS_FI, asignarEquipo, completarPaso, emitirResolucion, esMismaArea, notificarResolucion, obtenerPaso } from "@/demo/flujo-fi";
import { ETAPAS_EPS, TEXTO_RESULTADO, obtenerHitoPendiente, obtenerInicioEtapa } from "@/demo/reglas-eps";
import { generarNumeroDocumento, obtenerTareaArea } from "@/demo/reglas-sunass";
import { revisarRequisitos } from "@/demo/requisitos-tupa";
import { ESPECIALISTAS_DEMO, TEXTO_ROL, calcularCarga, sugerirEquipo } from "@/demo/especialistas-demo";
import { contarDiasHabiles } from "@/demo/calendario-demo";
import { formatearFecha, textoDiasHabiles } from "@/utilidades/formatear-fecha";

const TIPO_DOCUMENTO: Record<string, string> = {
  carta_ep: "Carta de la EP", anexo: "Anexo", oficio: "Oficio", memorando: "Memorándum", informe: "Informe",
  resolucion_consejo_directivo: "Resolución del Consejo Directivo",
};
const NIVEL: Record<string, string> = { publico: "Público", restringido_partes: "Partes", interno: "Interno", reservado: "Reservado" };

const minusculaInicial = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

function nombreHito(codigoHito: string) {
  return obtenerPaso(codigoHito)?.accion ?? codigoHito.replaceAll("_", " ");
}

/** Mensaje de acción del área con su botón (o aviso de que no le toca). */
/** Paso de asignación (SRT): elegir especialistas con su rol. Sugerencia por menor carga de trabajo. */
function FormarEquipo({ expediente, todos, alTerminar }: { expediente: ExpedienteFi; todos: ExpedienteFi[]; alTerminar: (texto: string) => void }) {
  const carga = calcularCarga(todos);
  const [elegidos, setElegidos] = useState<string[]>(() => sugerirEquipo(carga));
  const [error, setError] = useState("");
  const sugeridos = sugerirEquipo(carga);

  function formar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const equipo = ESPECIALISTAS_DEMO.filter((e) => elegidos.includes(e.codigo)).map(({ codigo, nombre, rol }) => ({ codigo, nombre, rol }));
    if (!equipo.some((e) => e.rol === "verifica_tupa") || !equipo.some((e) => e.rol === "evalua_informa")) {
      setError("Elija al menos una persona que verifique el TUPA y una que evalúe e informe.");
      return;
    }
    actualizarExpediente(expediente.codigoExpediente, (e) => asignarEquipo(e, FECHA_CORTE, equipo));
    alTerminar(`Equipo formado: ${equipo.map((e) => e.nombre).join(", ")}. Pasa al equipo SRT para verificar los requisitos del TUPA.`);
  }

  return (
    <form className="accion-banner" onSubmit={formar}>
      <p className="accion-banner__titulo">Le toca a usted formar el equipo de especialistas</p>
      <fieldset className="equipo">
        <legend>Especialistas del equipo SRT · sugeridos por menor carga de trabajo</legend>
        {ESPECIALISTAS_DEMO.map((e) => {
          const marcado = elegidos.includes(e.codigo);
          return (
            <label key={e.codigo} className={marcado ? "equipo__opcion equipo__opcion--marcada" : "equipo__opcion"}>
              <input type="checkbox" checked={marcado} onChange={() => { setError(""); setElegidos(marcado ? elegidos.filter((c) => c !== e.codigo) : [...elegidos, e.codigo]); }} />
              <span>
                <b>{e.nombre}</b>{sugeridos.includes(e.codigo) && <span className="chip chip--informacion">Sugerido</span>}
                <small>{e.especialidad} · {minusculaInicial(TEXTO_ROL[e.rol])} · {carga[e.codigo] ?? 0} expediente{carga[e.codigo] === 1 ? "" : "s"} en curso</small>
              </span>
            </label>
          );
        })}
      </fieldset>
      {error && <p className="aviso aviso--alerta" role="alert">{error}</p>}
      <p><small>Integrantes ficticios de la demo: la composición real de los equipos está por confirmar. Base: flujograma del FI (asignación por la SRT).</small></p>
      <div className="ficha__botones">
        <button type="submit" className="boton"><span className="ms" aria-hidden="true">group_add</span> Formar equipo</button>
      </div>
    </form>
  );
}

function BloqueAccion({ expediente, area, todos }: { expediente: ExpedienteFi; area: string | null; todos: ExpedienteFi[] }) {
  const [hecho, setHecho] = useState("");
  const tarea = obtenerTareaArea(expediente, area);
  const codigo = expediente.codigoExpediente;

  if (hecho) return <p className="accion-banner accion-banner--hecho" role="status"><span className="ms" aria-hidden="true">check_circle</span> {hecho} El panel de la EP ya muestra el cambio.</p>;
  if (!tarea) {
    const pendiente = obtenerHitoPendiente(expediente);
    return (
      <div className="accion-banner accion-banner--neutro">
        <p className="accion-banner__titulo">{pendiente ? `Está en ${NOMBRE_AREA[pendiente.area] ?? pendiente.area}` : "Expediente concluido y notificado"}</p>
        {pendiente && <p>{nombreHito(pendiente.codigoHito)}. No requiere acción de su área.</p>}
      </div>
    );
  }

  if (tarea.tipo === "notificar") {
    return (
      <div className="accion-banner">
        <p className="accion-banner__titulo">Le toca a usted notificar la resolución a la EP</p>
        <p>El Consejo Directivo resolvió: {TEXTO_RESULTADO[expediente.resultado ?? ""]}. Notifique por oficio la resolución y el informe que forma parte de ella. <small>Base: TUO LPAG art. 24.1.</small></p>
        <div className="ficha__botones">
          <button type="button" className="boton" onClick={() => {
            const numero = generarNumeroDocumento(expediente, "oficio");
            actualizarExpediente(codigo, (e) => notificarResolucion(e, FECHA_CORTE, numero));
            setHecho(`Notificado con el oficio ${numero}.`);
          }}><span className="ms" aria-hidden="true">send</span> Firmar oficio y notificar</button>
        </div>
      </div>
    );
  }

  const paso = obtenerPaso(tarea.hito.codigoHito)!;
  if (paso.codigoHito === "asignacion") {
    return <FormarEquipo expediente={expediente} todos={todos} alTerminar={setHecho} />;
  }
  const esCoautoria = paso.codigoHito === "firma_informe_dre" || paso.codigoHito === "firma_informe_oaj";
  return (
    <div className="accion-banner">
      <p className="accion-banner__titulo">Le toca a usted: {paso.accion.charAt(0).toLowerCase() + paso.accion.slice(1)}</p>
      {esCoautoria && (
        <p>El informe técnico-legal es de responsabilidad conjunta de la DRE y la OAJ. {paso.codigoHito === "firma_informe_dre" ? "Después de su firma pasa a la OAJ." : "Ya lo firmó la DRE; después de su firma vuelve a la DRE para elevarlo a la Gerencia General."}</p>
      )}
      <p><small>Base: {paso.base}.</small></p>
      <div className="ficha__botones">
        {tarea.tipo === "resolver" ? (
          ([["aprobado", "Aprobar"], ["aprobado_parcial", "Aprobar en parte"], ["denegado", "Denegar"]] as const).map(([resultado, texto]) => (
            <button key={resultado} type="button" className={resultado === "aprobado" ? "boton" : "boton boton--secundario"} onClick={() => {
              const numero = generarNumeroDocumento(expediente, "rcd");
              actualizarExpediente(codigo, (e) => emitirResolucion(e, FECHA_CORTE, resultado, numero));
              setHecho(`Resolución emitida: ${TEXTO_RESULTADO[resultado]}. Pasa a la DRE para notificarla.`);
            }}>{texto}</button>
          ))
        ) : (
          <button type="button" className="boton" onClick={() => {
            actualizarExpediente(codigo, (e) => completarPaso(e, FECHA_CORTE));
            const siguiente = PASOS_FI[PASOS_FI.findIndex((p) => p.codigoHito === paso.codigoHito) + 1];
            setHecho(`Listo. Pasa a ${NOMBRE_AREA[siguiente?.area ?? ""] ?? "la siguiente área"}.`);
          }}><span className="ms" aria-hidden="true">arrow_forward</span> {paso.boton}</button>
        )}
      </div>
    </div>
  );
}

/** Las mismas 6 etapas que ve la EP; la revisión técnica y legal (DRE + OAJ) y la aprobación interna (GG) son visibles. */
function Etapas({ expediente }: { expediente: ExpedienteFi }) {
  const pendiente = obtenerHitoPendiente(expediente);
  const porNotificar = expediente.estado !== "en_tramite" && expediente.fechaNotificacion === null;
  const indiceActual = pendiente
    ? ETAPAS_EPS.findIndex((e) => (e.hitos as readonly string[]).includes(pendiente.codigoHito))
    : porNotificar ? ETAPAS_EPS.length - 1 : ETAPAS_EPS.length;
  return (
    <ol className="etapas" aria-label="Etapas del procedimiento">
      {ETAPAS_EPS.map((etapa, i) => {
        const estado = i < indiceActual ? "hecha" : i === indiceActual ? "actual" : "pendiente";
        const inicio = obtenerInicioEtapa(expediente, etapa.hitos);
        return (
          <li key={etapa.codigo} className={`etapas__paso etapas__paso--${estado}`} aria-current={estado === "actual" ? "step" : undefined}>
            <span className="etapas__marca" aria-hidden="true">{estado === "hecha" ? "✓" : i + 1}</span>
            <span className="etapas__texto">
              {etapa.texto}{etapa.codigo === "resolucion" && porNotificar ? " · por notificar" : ""}
              <span className="sr-only"> ({estado === "hecha" ? "completada" : estado === "actual" ? "etapa actual" : "pendiente"})</span>
            </span>
            {inicio && estado !== "pendiente" && <small>{formatearFecha(inicio)}</small>}
          </li>
        );
      })}
    </ol>
  );
}

/** Los 4 requisitos del TUPA y si llegó un documento para cada uno. Solo lo ve el equipo SRT, que es quien los verifica. */
function RequisitosPresentados({ expediente }: { expediente: ExpedienteFi }) {
  const requisitos = revisarRequisitos(expediente.documentos);
  const faltan = requisitos.filter((r) => !r.documento).length;
  return (
    <section className={faltan ? "requisitos-tupa requisitos-tupa--faltan" : "requisitos-tupa"} aria-labelledby="requisitos-tupa">
      <h3 id="requisitos-tupa">Requisitos del TUPA · {requisitos.length - faltan} de {requisitos.length} presentados</h3>
      <ul>
        {requisitos.map((r) => (
          <li key={r.codigo}>
            <span className="ms" aria-hidden="true">{r.documento ? "check_circle" : "cancel"}</span>
            <span>{r.texto}<small>{r.documento ? ` · ${r.documento.numeroDocumento}` : " · no presentado"}</small></span>
          </li>
        ))}
      </ul>
      <p><small>Paso «Verificar los requisitos del TUPA» del equipo SRT (flujograma del FI). Si falta algo, se observa y la EP tiene 2 días hábiles para subsanar (TUO LPAG art. 125.1); si no subsana, la solicitud se considera no presentada (art. 125.4).</small></p>
    </section>
  );
}

export function FichaExpedienteSunass({ expediente, nombreEps, area, todos }: { expediente: ExpedienteFi; nombreEps: string; area: string | null; todos: ExpedienteFi[] }) {
  const movimientos = expediente.hitos.length + (expediente.estado !== "en_tramite" ? 1 : 0);
  return (
    <article className="ficha-dre" aria-labelledby="ficha-titulo">
      <header>
        <h2 id="ficha-titulo" className="ficha-dre__titulo"><span className="ficha-dre__codigo">{expediente.codigoExpediente}</span> {nombreEps}</h2>
        <p className="ficha__resumen">Uso excepcional del fondo de inversiones · RGT art. 89 · presentada el {formatearFecha(expediente.fechaInicio)}{expediente.motivo ? ` · ${expediente.motivo}` : ""}</p>
      </header>

      {expediente.equipoAsignado && expediente.equipoAsignado.length > 0 && (
        <p className="equipo-asignado">
          <span className="ms" aria-hidden="true">groups</span>
          <span><b>Equipo asignado:</b> {expediente.equipoAsignado.map((e) => `${e.nombre} (${minusculaInicial(TEXTO_ROL[e.rol])})`).join(" · ")}</span>
        </p>
      )}
      <BloqueAccion key={expediente.codigoExpediente} expediente={expediente} area={area} todos={todos} />
      <Etapas expediente={expediente} />
      {/* Según el flujograma, los requisitos los verifica el equipo SRT (paso verificacion_tupa); la DRE solo deriva */}
      {expediente.estado === "en_tramite" && esMismaArea("equipo_srt", area) && <RequisitosPresentados expediente={expediente} />}

      <details className="historial">
        <summary>Historial · {movimientos} movimientos</summary>
        <ol className="recorrido">
          {expediente.hitos.map((h) => {
            const dias = contarDiasHabiles(h.iniciadoEn, h.finalizadoEn ?? FECHA_CORTE);
            return (
              <li key={h.numero} className={h.finalizadoEn ? "" : "recorrido__pendiente"}>
                <span className="ms" aria-hidden="true">{h.finalizadoEn ? "check_circle" : "pending"}</span>
                <span><b>{NOMBRE_AREA[h.area] ?? h.area}</b><small>{nombreHito(h.codigoHito)}{h.numeroDocumento ? ` · ${h.numeroDocumento}` : ""}{h.codigoHito === "asignacion" && h.finalizadoEn && expediente.equipoAsignado?.length ? ` · ${expediente.equipoAsignado.map((e) => e.nombre).join(", ")}` : ""}</small></span>
                <span>{formatearFecha(h.iniciadoEn)}{h.finalizadoEn ? ` → ${formatearFecha(h.finalizadoEn)}` : " · pendiente"}<small>{textoDiasHabiles(Math.max(0, dias))}{h.plazoReferencialDiasHabiles != null ? ` · meta ${h.plazoReferencialDiasHabiles} d.h.` : ""}{h.cuentaPlazo ? "" : " · no cuenta para la Sunass"}</small></span>
              </li>
            );
          })}
          {expediente.estado !== "en_tramite" && (
            <li className={expediente.fechaNotificacion === null ? "recorrido__pendiente" : ""}>
              <span className="ms" aria-hidden="true">{expediente.fechaNotificacion === null ? "pending" : "check_circle"}</span>
              <span><b>{NOMBRE_AREA.DRE}</b><small>Notificar la resolución a la EP (LPAG 24.1)</small></span>
              <span>{expediente.fechaNotificacion === null ? "pendiente" : formatearFecha(expediente.fechaNotificacion ?? expediente.fechaConclusion)}</span>
            </li>
          )}
        </ol>
      </details>

      <section aria-labelledby="documentos" className="ficha-dre__documentos">
        <h3 id="documentos">Documentos · {expediente.documentos.length}</h3>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead><tr><th scope="col">Documento</th><th scope="col">Asunto</th><th scope="col">Fecha</th><th scope="col">Acceso</th></tr></thead>
            <tbody>
              {expediente.documentos.map((d) => (
                <tr key={d.codigoDocumento}>
                  <td><span className="ms" aria-hidden="true">description</span> <b>{TIPO_DOCUMENTO[d.tipoDocumento] ?? d.tipoDocumento}</b><br />{d.numeroDocumento}</td>
                  <td>{d.asunto}</td>
                  <td>{formatearFecha(d.fechaDocumento)}</td>
                  <td>{NIVEL[d.nivelAcceso] ?? d.nivelAcceso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
