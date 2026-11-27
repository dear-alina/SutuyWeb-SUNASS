"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import type { ExpedienteFi } from "@/demo/expedientes-demo";
import { PUNTOS_INDISPENSABLES } from "@/demo/puntos-indispensables";
import {
  ErrorCopiloto, consultarDocumentosIndexados, evaluarRequisitos, listarDecisiones, preguntarAlExpediente, registrarDecision,
  type DecisionCopiloto, type DecisionRegistrada, type PasajeCopiloto, type RespuestaPregunta, type ResultadoCopiloto,
} from "@/servicios/copiloto/cliente-copiloto";
import { nombrarPersona, obtenerIdPersona } from "@/servicios/copiloto/persona";
import { obtenerHitoPendiente } from "@/demo/reglas-eps";

// El copiloto nunca dice «cumple»: solo si encontró evidencia y si la cita está verificada.
function describirEstado(r: ResultadoCopiloto) {
  if (r.estado === "evidencia_encontrada") return { texto: "Encontrado", tono: "encontrado", marca: r.esVerificada ? "cita verificada" : "confirmar a mano" };
  if (r.estado === "evidencia_parcial") return { texto: "Parcial", tono: "parcial", marca: "confirmar a mano" };
  if (r.estado === "no_hallada") return { texto: "No encontrado", tono: "no-encontrado", marca: "sin evidencia" };
  return { texto: "No determinable", tono: "parcial", marca: "revisar a mano" };
}

const TEXTO_DECISION: Record<DecisionCopiloto, string> = {
  revisado: "Revisado", no_es_correcto: "Marcado como incorrecto", confirma_falta: "Falta confirmada", si_esta_en_expediente: "Sí está en el expediente",
};

type Fragmento = { documento: string; pagina: number | null; texto: string; etiqueta: string };

export function EvaluarConCopiloto({ expediente, nombreEps }: { expediente: ExpedienteFi; nombreEps: string }) {
  const { perfil } = usarSesion();
  const idPersona = obtenerIdPersona(perfil);
  const codigo = expediente.codigoExpediente;
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin_documentos" | "error">("cargando");
  const [error, setError] = useState("");
  const [resultados, setResultados] = useState<ResultadoCopiloto[]>([]);
  const [modelo, setModelo] = useState("");
  const [decisiones, setDecisiones] = useState<Record<string, DecisionRegistrada>>({});
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [panel, setPanel] = useState<"documento" | "preguntar">("documento");
  const [fragmentoPregunta, setFragmentoPregunta] = useState<Fragmento | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const { documentos } = await consultarDocumentosIndexados();
        if (!documentos.some((d) => d.startsWith(codigo))) { if (vigente) setEstado("sin_documentos"); return; }
        const [evaluacion, previas] = await Promise.all([
          evaluarRequisitos(codigo, PUNTOS_INDISPENSABLES.map((p) => ({ codigoRequisito: p.codigo, texto: p.texto, palabrasClave: p.palabrasClave }))),
          listarDecisiones(codigo).catch(() => [] as DecisionRegistrada[]),
        ]);
        if (!vigente) return;
        setResultados(evaluacion.resultados);
        setModelo(evaluacion.modelo);
        // La última decisión registrada de cada punto
        setDecisiones(Object.fromEntries(previas.filter((d) => d.codigoRequisito).map((d) => [d.codigoRequisito as string, d])));
        setSeleccionado(evaluacion.resultados.find((r) => r.cita)?.codigoRequisito ?? null);
        setEstado("listo");
      } catch (e) {
        if (!vigente) return;
        setError(e instanceof ErrorCopiloto ? e.message : "El copiloto no pudo responder.");
        setEstado("error");
      }
    })();
    return () => { vigente = false; };
  }, [codigo]);

  async function decidir(r: ResultadoCopiloto, esCorrecto: boolean) {
    const noHallada = r.estado === "no_hallada";
    const decision: DecisionCopiloto = esCorrecto ? (noHallada ? "confirma_falta" : "revisado") : (noHallada ? "si_esta_en_expediente" : "no_es_correcto");
    try {
      const registrada = await registrarDecision({ codigoExpediente: codigo, codigoRequisito: r.codigoRequisito, decision, registradoPorId: idPersona, estadoSugerido: r.estado, codigoFragmento: r.codigoFragmento });
      setDecisiones({ ...decisiones, [r.codigoRequisito]: { codigoExpediente: codigo, codigoRequisito: r.codigoRequisito, decision, registradoPorId: idPersona, estadoSugerido: r.estado, registradoEn: registrada.registradoEn } });
    } catch (e) {
      setError(e instanceof ErrorCopiloto ? `No se registró la decisión: ${e.message}` : "No se registró la decisión.");
    }
  }

  const revisadosPorUsted = resultados.filter((r) => decisiones[r.codigoRequisito]?.registradoPorId === idPersona).length;
  const elegido = resultados.find((r) => r.codigoRequisito === seleccionado);
  const puntoElegido = PUNTOS_INDISPENSABLES.find((p) => p.codigo === seleccionado);
  const fragmento: Fragmento | null = panel === "preguntar" && fragmentoPregunta
    ? fragmentoPregunta
    : elegido?.cita ? { documento: elegido.documento ?? "Documento", pagina: elegido.pagina, texto: elegido.cita, etiqueta: puntoElegido?.texto ?? elegido.punto } : null;
  const pendiente = obtenerHitoPendiente(expediente);
  const esInforme = pendiente?.codigoHito === "firma_informe_dre" || pendiente?.codigoHito === "firma_informe_oaj";

  return (
    <main className="copiloto-vista">
      <div className="copiloto-vista__titulo">
        <div>
          <Link href="/sunass/expedientes" className="enlace-volver"><span className="ms" aria-hidden="true">arrow_back</span> Volver a expedientes</Link>
          <h1>{esInforme ? "Evaluar informe con copiloto" : "Revisar expediente con copiloto"}</h1>
          <p>{codigo} · {nombreEps}</p>
        </div>
        <div className="copiloto-vista__acciones">
          <span className="chip chip--informacion">IA · usted decide</span>
          <button type="button" className="boton" aria-pressed={panel === "preguntar"} onClick={() => setPanel(panel === "preguntar" ? "documento" : "preguntar")}>
            <span className="ms" aria-hidden="true">{panel === "preguntar" ? "description" : "forum"}</span> {panel === "preguntar" ? "Ver documento" : "Preguntar al expediente"}
          </button>
        </div>
      </div>

      {estado === "cargando" && <p role="status" className="aviso aviso--informacion">El copiloto está revisando los documentos del expediente…</p>}
      {estado === "error" && <p role="alert" className="aviso aviso--alerta">{error} Verifique que el copiloto esté encendido.</p>}
      {estado === "sin_documentos" && (
        <p role="status" className="aviso aviso--informacion">
          El copiloto no tiene documentos indexados de {codigo}. En la demo solo tiene el texto de los expedientes del concurso (por ejemplo, UFI-2026-0001, UFI-2024-0001 y UFI-2025-0001).
        </p>
      )}

      {estado === "listo" && (
        <div className="copiloto-vista__cuerpo">
          <section className="indispensable" aria-labelledby="lo-indispensable">
            <div className="indispensable__cabecera">
              <h2 id="lo-indispensable">Lo indispensable</h2>
              <p>{revisadosPorUsted} de {resultados.length} revisados por usted</p>
              <div className="barra-tiempo barra-tiempo--bien" role="meter" aria-label="Puntos revisados por usted" aria-valuemin={0} aria-valuemax={resultados.length} aria-valuenow={revisadosPorUsted}>
                <span style={{ width: `${(100 * revisadosPorUsted) / Math.max(1, resultados.length)}%` }} />
              </div>
            </div>
            {error && <p role="alert" className="aviso aviso--alerta">{error}</p>}
            <ul className="indispensable__lista">
              {resultados.map((r) => {
                const e = describirEstado(r);
                const punto = PUNTOS_INDISPENSABLES.find((p) => p.codigo === r.codigoRequisito);
                const decision = decisiones[r.codigoRequisito];
                const noHallada = r.estado === "no_hallada";
                return (
                  <li key={r.codigoRequisito} className={`punto punto--${e.tono}`} aria-current={seleccionado === r.codigoRequisito}>
                    <button type="button" className="punto__abrir" onClick={() => { setSeleccionado(r.codigoRequisito); setPanel("documento"); }}>
                      <span className="punto__estado">{e.texto}</span>
                      <span className="punto__titulo">{punto?.texto ?? r.punto}</span>
                    </button>
                    <div className="punto__etiquetas">
                      <span className="punto__etiqueta">{r.documento ? `${r.documento.replace(/\.txt$/, "")}${r.pagina ? ` · pág. ${r.pagina}` : ""}` : "Expediente completo"}</span>
                      <span className={`punto__etiqueta punto__etiqueta--${e.tono}`}>{e.marca}</span>
                      {decision && <span className="punto__etiqueta punto__etiqueta--encontrado">{decision.registradoPorId === idPersona ? "Revisado por usted" : "Revisado"}</span>}
                    </div>
                    {punto && <small className="punto__base">Base: {punto.base}</small>}
                    {decision ? (
                      <p className="punto__registro"><span className="ms" aria-hidden="true">check</span> {TEXTO_DECISION[decision.decision]} · registrado por {decision.registradoPorId === idPersona ? "usted" : nombrarPersona(decision.registradoPorId)}</p>
                    ) : (
                      <div className="punto__botones">
                        <button type="button" className="boton" onClick={() => decidir(r, true)}>{noHallada ? "Confirmar que falta" : "Marcar revisado"}</button>
                        <button type="button" className="boton boton--secundario" onClick={() => decidir(r, false)}>{noHallada ? "Sí está en el expediente" : "No es correcto"}</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="copiloto__aviso">La IA puede omitir o interpretar mal. Su revisión es la decisión final. Modelo: {modelo}.</p>
          </section>

          <section className="visor" aria-label={panel === "preguntar" ? "Preguntar al expediente" : "Documento citado"}>
            {panel === "preguntar" && <PreguntarAlExpediente codigo={codigo} alVerPasaje={(p) => setFragmentoPregunta({ documento: p.documento, pagina: p.pagina, texto: p.texto, etiqueta: "Pasaje de la respuesta" })} />}
            {fragmento ? (
              <>
                <div className="visor__barra">
                  <span className="ms" aria-hidden="true">description</span>
                  <span className="visor__nombre"><b>{fragmento.documento.replace(/\.txt$/, "")}</b><small>{fragmento.pagina ? `Página ${fragmento.pagina}` : "Página no indicada"}</small></span>
                  <button type="button" className="visor__zoom" aria-label="Reducir texto" onClick={() => setZoom(Math.max(80, zoom - 10))}>−</button>
                  <span aria-live="polite">{zoom} %</span>
                  <button type="button" className="visor__zoom" aria-label="Ampliar texto" onClick={() => setZoom(Math.min(160, zoom + 10))}>+</button>
                </div>
                <div className="visor__hoja" style={{ fontSize: `${zoom}%` }}>
                  <p className="visor__rotulo">Texto extraído del documento</p>
                  <mark className="visor__resaltado">{fragmento.texto}</mark>
                  {fragmento.pagina && <p className="visor__pagina">{fragmento.pagina}</p>}
                </div>
                <p className="visor__pie"><span aria-hidden="true">❞</span> {fragmento.documento.replace(/\.txt$/, "")}{fragmento.pagina ? ` · pág. ${fragmento.pagina}` : ""} · {fragmento.etiqueta}</p>
              </>
            ) : panel === "documento" ? (
              <p className="sunass__vacio">{elegido ? "El copiloto no encontró un pasaje para este punto. Revise el expediente completo y confirme si falta." : "Elija un punto para ver el pasaje citado."}</p>
            ) : null}
            <p className="copiloto__aviso">Documento ilustrativo · datos de demostración.</p>
          </section>
        </div>
      )}
    </main>
  );
}

function PreguntarAlExpediente({ codigo, alVerPasaje }: { codigo: string; alVerPasaje: (p: PasajeCopiloto) => void }) {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState<RespuestaPregunta | null>(null);
  const [estado, setEstado] = useState<"inicio" | "cargando" | "error">("inicio");
  const [error, setError] = useState("");

  async function preguntar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("cargando");
    try {
      const r = await preguntarAlExpediente(codigo, pregunta);
      setRespuesta(r);
      setEstado("inicio");
      if (r.pasajes[0]) alVerPasaje(r.pasajes[0]);
    } catch (e) {
      setError(e instanceof ErrorCopiloto ? e.message : "El copiloto no pudo responder.");
      setEstado("error");
    }
  }

  return (
    <div className="preguntar">
      <form onSubmit={preguntar} className="preguntar__formulario">
        <label className="campo">
          <span>Pregunta sobre {codigo}</span>
          <input value={pregunta} onChange={(e) => setPregunta(e.target.value)} maxLength={500} placeholder="Ej.: ¿Cuál es el monto solicitado y por qué motivo?" required minLength={3} />
        </label>
        <button type="submit" className="boton" disabled={estado === "cargando"}>{estado === "cargando" ? "Buscando…" : "Preguntar"}</button>
      </form>
      {estado === "error" && <p role="alert" className="aviso aviso--alerta">{error}</p>}
      {respuesta && (
        <div className="preguntar__respuesta" role="status">
          <p>{respuesta.respuesta}</p>
          {respuesta.cita && <blockquote className="copiloto__cita">«{respuesta.cita}»<footer>{respuesta.esVerificada ? "Cita verificada en el documento" : "Cita no verificada: confírmela"}</footer></blockquote>}
          <p className="copiloto__aviso"><b>Incertidumbre {respuesta.incertidumbre.nivel}.</b> {respuesta.incertidumbre.advertencia}</p>
          {respuesta.pasajes.length > 0 && (
            <ul className="preguntar__pasajes">
              {respuesta.pasajes.slice(0, 4).map((p) => (
                <li key={p.codigoFragmento}>
                  <button type="button" className="enlace-boton" onClick={() => alVerPasaje(p)}>{p.documento.replace(/\.txt$/, "")} · pág. {p.pagina}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
