"use client";

import { useEffect, useMemo, useState } from "react";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import { FECHA_CORTE } from "@/demo/expedientes-demo";
import { usarExpedientesSunass } from "@/demo/usar-expedientes";
import { analizarCsv, leerTextoArchivo } from "@/demo/lector-csv";
import {
  NOMBRE_PROCEDIMIENTO, construirPanelLocal, desdeExpedientesDemo, leerHitos, leerProcedimientos,
  type ExpedientePanel, type HitoPanel, type Observacion,
} from "@/demo/panel-gerencial";
import { ErrorDeApi } from "@/servicios/api/cliente-api";
import { obtenerPanelGerencial, type PanelGerencial, type Semaforo } from "@/servicios/api/panel-gerencial";
import { formatearFecha } from "@/utilidades/formatear-fecha";
import { EncabezadoSunass } from "@/componentes/sunass/EncabezadoSunass";

const SEMAFORO: Record<Semaforo, { texto: string; tono: string; icono: string }> = {
  silencio_positivo: { texto: "Silencio positivo", tono: "alerta", icono: "gpp_maybe" },
  vencido: { texto: "Plazo vencido", tono: "alerta", icono: "event_busy" },
  por_vencer: { texto: "Por vencer", tono: "accion", icono: "warning" },
  en_plazo: { texto: "En plazo", tono: "informacion", icono: "schedule" },
  resuelto_en_plazo: { texto: "Resuelto en plazo", tono: "exito", icono: "check_circle" },
  resuelto_fuera_de_plazo: { texto: "Resuelto fuera de plazo", tono: "alerta", icono: "history" },
  resuelto_sin_fecha: { texto: "Concluido sin fecha", tono: "neutro", icono: "help" },
  sin_plazo: { texto: "Sin plazo", tono: "neutro", icono: "remove" },
};
const NOMBRE_AREA: Record<string, string> = {
  dre: "DRE", srt: "SRT", equipo_srt: "Equipo SRT", oaj: "OAJ", gg: "GG", cd: "CD", du: "DU",
  ep: "EP", ep_e_interesados: "EP e interesados", inei: "INEI",
};
const nombreArea = (area: string | null) => (area ? NOMBRE_AREA[area] ?? area.toUpperCase() : "—");
const MAXIMO_FILAS = 50;

type Cargados = { expedientes: ExpedientePanel[]; hitos: HitoPanel[]; observaciones: Observacion[]; archivos: string[] } | null;

export default function PanelGerencialPagina() {
  const { esDemoSinBackend } = usarSesion();
  const { expedientes: expedientesDemo } = usarExpedientesSunass();
  const [cargados, setCargados] = useState<Cargados>(null);
  const [fechaCorte, setFechaCorte] = useState(FECHA_CORTE);
  const [diasAlerta, setDiasAlerta] = useState(5);
  const [tipo, setTipo] = useState("todos");
  const [error, setError] = useState("");
  const [panelApi, setPanelApi] = useState<PanelGerencial | null>(null);
  const [estaCargando, setEstaCargando] = useState(false);
  const tipoProcedimiento = tipo === "todos" ? null : tipo;

  // Modo demo sin backend: datos de la bandeja o de los CSV cargados, calculados en el navegador
  const base = useMemo(() => cargados ?? { ...desdeExpedientesDemo(expedientesDemo), observaciones: [] as Observacion[], archivos: [] as string[] }, [cargados, expedientesDemo]);
  const panelLocal = useMemo(
    () => (esDemoSinBackend ? construirPanelLocal(base, { fechaCorte, diasAlerta, tipoProcedimiento }) : null),
    [esDemoSinBackend, base, fechaCorte, diasAlerta, tipoProcedimiento],
  );

  // Con backend: GET /api/v1/panel-gerencial
  useEffect(() => {
    if (esDemoSinBackend) return;
    let vigente = true;
    setEstaCargando(true);
    setError("");
    const espera = setTimeout(() => {
      obtenerPanelGerencial({ fechaCorte, diasAlerta, tipoProcedimiento })
        .then((p) => { if (vigente) setPanelApi(p); })
        .catch((e) => { if (vigente) setError(e instanceof ErrorDeApi ? e.message : "No se pudo obtener el panel."); })
        .finally(() => { if (vigente) setEstaCargando(false); });
    }, 300); // espera a que la persona termine de escribir
    return () => { vigente = false; clearTimeout(espera); };
  }, [esDemoSinBackend, fechaCorte, diasAlerta, tipoProcedimiento]);

  const panel = esDemoSinBackend ? panelLocal : panelApi;

  async function cargar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    const datos = new FormData(evento.currentTarget);
    const archivoProc = datos.get("procedimientos") as File | null;
    const archivoHitos = datos.get("hitos") as File | null;
    if (!archivoProc || archivoProc.size === 0) { setError("Elija el archivo de procedimientos (ds02_procedimientos)."); return; }
    try {
      const proc = leerProcedimientos(analizarCsv(await leerTextoArchivo(archivoProc)));
      if (proc.expedientes.length === 0) { setError("El archivo no tiene filas válidas o no tiene las columnas id_expediente y fecha_inicio."); return; }
      const hit = archivoHitos && archivoHitos.size > 0 ? leerHitos(analizarCsv(await leerTextoArchivo(archivoHitos))) : { hitos: [], observaciones: [] };
      setCargados({
        expedientes: proc.expedientes, hitos: hit.hitos, observaciones: [...proc.observaciones, ...hit.observaciones],
        archivos: [archivoProc.name, ...(archivoHitos && archivoHitos.size > 0 ? [archivoHitos.name] : [])],
      });
    } catch {
      setError("No se pudo leer el archivo. Verifique que sea un CSV separado por comas.");
    }
  }

  const tipos = esDemoSinBackend ? [...new Set(base.expedientes.map((e) => e.tipoProcedimiento))].sort() : Object.keys(NOMBRE_PROCEDIMIENTO);
  const maximoTiempo = Math.max(1, ...(panel?.tiempoPorArea ?? []).map((t) => t.promedioDiasHabiles));
  const observacionesLectura = esDemoSinBackend ? base.observaciones : [];
  const fuente = !esDemoSinBackend ? "base de datos de SutuyWeb" : cargados ? cargados.archivos.join(" + ") : "expedientes de la demo (bandeja)";

  return (
    <div className="eps">
      <EncabezadoSunass />
      <main className="panel">
        <header className="panel__titulo">
          <h1>Panel gerencial de plazos</h1>
          <p>Fechas calculadas en días hábiles según el TUPA de la Sunass, el RGT y el TUO de la LPAG. Fuente: {fuente}.</p>
        </header>

        <section className="panel__bloque" aria-labelledby="carga">
          <h2 id="carga">{esDemoSinBackend ? "Datos y parámetros" : "Parámetros"}</h2>
          {esDemoSinBackend && (
            <>
              <form className="panel__controles" onSubmit={cargar}>
                <label className="campo"><span>Procedimientos (CSV, formato ds02_procedimientos)</span><input type="file" name="procedimientos" accept=".csv,text/csv" /></label>
                <label className="campo"><span>Hitos (CSV opcional, formato ds02_hitos_procedimientos)</span><input type="file" name="hitos" accept=".csv,text/csv" /></label>
                <div className="panel__botones">
                  <button type="submit" className="boton">Cargar y calcular</button>
                  {cargados && <button type="button" className="boton boton--secundario" onClick={() => setCargados(null)}>Volver a la demo</button>}
                </div>
              </form>
              <p className="actualizacion"><span className="ms" aria-hidden="true">lock</span>Modo demo: los archivos se procesan en este navegador; no se envían a ningún servidor.</p>
            </>
          )}
          <div className="panel__controles panel__controles--fila" role="group" aria-label="Parámetros del cálculo">
            <label className="campo"><span>Fecha de corte</span><input type="date" value={fechaCorte} onChange={(e) => e.target.value && setFechaCorte(e.target.value)} /></label>
            <label className="campo"><span>Alerta «por vencer» (días hábiles)</span><input type="number" min={1} max={30} value={diasAlerta} onChange={(e) => setDiasAlerta(Math.min(30, Math.max(1, Number(e.target.value) || 1)))} /></label>
            <label className="campo"><span>Procedimiento</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="todos">Todos</option>
                {tipos.map((t) => <option key={t} value={t}>{NOMBRE_PROCEDIMIENTO[t] ?? t}</option>)}
              </select>
            </label>
          </div>
          {error && <p className="aviso aviso--alerta" role="alert">{error}</p>}
          {estaCargando && <p className="actualizacion" role="status">Calculando…</p>}
        </section>

        {panel && (
          <>
            <section aria-labelledby="indicadores">
              <h2 id="indicadores" className="sr-only">Indicadores</h2>
              <ul className="indicadores">
                <li className="indicador"><span>En trámite</span><b>{panel.indicadores.enTramite}</b><small>al {formatearFecha(panel.fechaCorte)}</small></li>
                <li className="indicador indicador--accion"><span><span className="ms" aria-hidden="true">warning</span> Por vencer</span><b>{panel.indicadores.porVencer}</b><small>vencen en {panel.diasAlerta} d.h. o menos</small></li>
                <li className="indicador indicador--alerta"><span><span className="ms" aria-hidden="true">event_busy</span> Plazo vencido</span><b>{panel.indicadores.plazoVencido}</b><small>sin resolución dentro del plazo</small></li>
                <li className="indicador indicador--alerta"><span><span className="ms" aria-hidden="true">gpp_maybe</span> Silencio positivo</span><b>{panel.indicadores.silencioPositivo}</b><small>FI sin notificar en plazo + 5 días</small></li>
                <li className="indicador"><span>Resueltos en plazo</span><b>{panel.indicadores.porcentajeResueltosEnPlazo == null ? "—" : `${panel.indicadores.porcentajeResueltosEnPlazo} %`}</b><small>{panel.indicadores.resueltosEnPlazo} de {panel.indicadores.resueltosConPlazo} con plazo legal</small></li>
              </ul>
            </section>

            <section className="panel__bloque" aria-labelledby="vencimientos">
              <h2 id="vencimientos">Calendario de vencimientos (en trámite)</h2>
              {panel.vencimientos.length === 0 ? <p className="sunass__vacio">No hay expedientes en trámite con plazo legal en esta selección.</p> : (
                <div className="tabla-envoltura">
                  <table className="tabla">
                    <caption>Ordenado por días hábiles restantes. Fecha límite = inicio + plazo + días de suspensión. Límite para notificar = fecha límite + 5 días (LPAG 24.1).</caption>
                    <thead><tr>
                      <th scope="col">Expediente</th><th scope="col">Procedimiento</th><th scope="col">Dónde está</th><th scope="col">Día</th>
                      <th scope="col">Fecha límite</th><th scope="col">Límite para notificar</th><th scope="col">Restan</th><th scope="col">Situación</th>
                    </tr></thead>
                    <tbody>
                      {panel.vencimientos.slice(0, MAXIMO_FILAS).map((v) => (
                        <tr key={v.codigoExpediente}>
                          <td><b>{v.codigoExpediente}</b><br />{v.codigoEps}</td>
                          <td>{NOMBRE_PROCEDIMIENTO[v.tipoProcedimiento] ?? v.tipoProcedimiento}</td>
                          <td>{nombreArea(v.areaActual)}{v.hitoActual ? <><br /><small>{v.hitoActual.replaceAll("_", " ")}</small></> : null}</td>
                          <td>{v.diaDelPlazo} / {v.plazoMaximoDiasHabiles}{v.diasSuspension ? <><br /><small>+{v.diasSuspension} susp.</small></> : null}</td>
                          <td>{formatearFecha(v.fechaLimite)}</td>
                          <td>{v.fechaLimiteNotificacion ? formatearFecha(v.fechaLimiteNotificacion) : <small>no aplica silencio</small>}</td>
                          <td>{v.diasRestantes >= 0 ? `${v.diasRestantes} d.h.` : `${Math.abs(v.diasRestantes)} d.h. de retraso`}</td>
                          <td><span className={`chip chip--${SEMAFORO[v.semaforo].tono}`}><span className="ms" aria-hidden="true">{SEMAFORO[v.semaforo].icono}</span> {SEMAFORO[v.semaforo].texto}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {panel.vencimientos.length > MAXIMO_FILAS && <p className="actualizacion">Se muestran los {MAXIMO_FILAS} más urgentes de {panel.vencimientos.length}.</p>}
            </section>

            <div className="panel__dos">
              <section className="panel__bloque" aria-labelledby="cuello">
                <h2 id="cuello">¿Dónde se demora? Días hábiles promedio por área</h2>
                {panel.tiempoPorArea.length === 0 ? <p className="sunass__vacio">Sin hitos para calcular el tiempo por área.</p> : (
                  <>
                    <ul className="barras">
                      {panel.tiempoPorArea.map((t) => (
                        <li key={t.area} className="barras__fila" title={`${nombreArea(t.area)}: promedio ${t.promedioDiasHabiles.toFixed(1)} d.h., máximo ${t.maximoDiasHabiles} d.h., ${t.cantidadPasos} pasos`}>
                          <span className="barras__etiqueta">{nombreArea(t.area)}</span>
                          <span className="barras__pista"><span className="barras__barra" style={{ width: `${(100 * t.promedioDiasHabiles) / maximoTiempo}%` }} /></span>
                          <span className="barras__valor">{t.promedioDiasHabiles.toFixed(1)}</span>
                        </li>
                      ))}
                    </ul>
                    <details className="ficha__ayuda">
                      <summary>Ver como tabla</summary>
                      <table className="tabla">
                        <thead><tr><th scope="col">Área</th><th scope="col">Promedio (d.h.)</th><th scope="col">Máximo</th><th scope="col">Pasos</th></tr></thead>
                        <tbody>{panel.tiempoPorArea.map((t) => <tr key={t.area}><td>{nombreArea(t.area)}</td><td>{t.promedioDiasHabiles.toFixed(1)}</td><td>{t.maximoDiasHabiles}</td><td>{t.cantidadPasos}</td></tr>)}</tbody>
                      </table>
                    </details>
                    <p className="actualizacion">Incluye pasos en curso hasta la fecha de corte. No incluye a la EP ni los días que no cuentan para la Sunass.</p>
                  </>
                )}
              </section>

              <section className="panel__bloque" aria-labelledby="pasos">
                <h2 id="pasos">Pasos que superaron su plazo propio</h2>
                <p className="actualizacion">Plazo propio de cada paso: hoja Hitos (en el FI: derivación de la DRE 1 d.h.; subsanación de la EP 2 d.h.; información de la EP hasta 10 d.h.).</p>
                {panel.pasosFueraDePlazo.length === 0 ? <p className="sunass__vacio">Ningún paso superó su plazo propio.</p> : (
                  <div className="tabla-envoltura">
                    <table className="tabla">
                      <thead><tr><th scope="col">Expediente</th><th scope="col">Paso</th><th scope="col">Tardó</th></tr></thead>
                      <tbody>
                        {panel.pasosFueraDePlazo.slice(0, MAXIMO_FILAS).map((f) => (
                          <tr key={`${f.codigoExpediente}-${f.codigoHito}-${f.diasHabiles}`}>
                            <td>{f.codigoExpediente}</td>
                            <td>{f.codigoHito.replaceAll("_", " ")} <small>({nombreArea(f.responsable)})</small></td>
                            <td className="dias--alto">{f.diasHabiles} de {f.plazoDiasHabiles} d.h.{f.estaEnCurso ? " · en curso" : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <section className="panel__bloque" aria-labelledby="calidad">
              <h2 id="calidad">Calidad de los datos</h2>
              <p>{panel.calidadDatos.length + observacionesLectura.length === 0 ? "Sin observaciones." : `${panel.calidadDatos.length + observacionesLectura.length} observaciones.`}</p>
              {panel.calidadDatos.length + observacionesLectura.length > 0 && (
                <div className="tabla-envoltura">
                  <table className="tabla">
                    <thead><tr><th scope="col">Expediente</th><th scope="col">Observación</th></tr></thead>
                    <tbody>
                      {panel.calidadDatos.slice(0, MAXIMO_FILAS).map((o, i) => <tr key={`c-${i}`}><td>{o.codigoExpediente}</td><td>{o.detalle}</td></tr>)}
                      {observacionesLectura.slice(0, MAXIMO_FILAS).map((o, i) => <tr key={`o-${i}`}><td>Fila {o.fila} · {o.codigo}</td><td>{o.texto}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="actualizacion">Calendario: lunes a viernes sin feriados nacionales{esDemoSinBackend ? "" : " ni los días no laborables registrados"}; el día 1 es el hábil siguiente al inicio (TUO LPAG art. 134.1).{esDemoSinBackend ? " En el modo demo no incluye días no laborables por decreto." : ""}</p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
