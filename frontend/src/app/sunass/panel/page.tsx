"use client";

import { useMemo, useState } from "react";
import { FECHA_CORTE } from "@/demo/expedientes-demo";
import { usarExpedientesSunass } from "@/demo/usar-expedientes";
import { analizarCsv, leerTextoArchivo } from "@/demo/lector-csv";
import {
  NOMBRE_PROCEDIMIENTO, buscarPasosFueraDePlazo, calcularPlazo, calcularTiempoPorArea, desdeExpedientesDemo, leerHitos, leerProcedimientos,
  type ExpedientePanel, type HitoPanel, type Observacion, type Semaforo,
} from "@/demo/panel-gerencial";
import { formatearFecha } from "@/utilidades/formatear-fecha";
import { EncabezadoSunass } from "@/componentes/sunass/EncabezadoSunass";

const SEMAFORO: Record<Semaforo, { texto: string; tono: string; icono: string }> = {
  silencio: { texto: "Silencio positivo", tono: "alerta", icono: "gpp_maybe" },
  vencido: { texto: "Plazo vencido", tono: "alerta", icono: "event_busy" },
  riesgo: { texto: "Por vencer", tono: "accion", icono: "warning" },
  en_plazo: { texto: "En plazo", tono: "informacion", icono: "schedule" },
  resuelto_en_plazo: { texto: "Resuelto en plazo", tono: "exito", icono: "check_circle" },
  resuelto_fuera: { texto: "Resuelto fuera de plazo", tono: "alerta", icono: "history" },
  sin_plazo: { texto: "Sin plazo en el archivo", tono: "neutro", icono: "remove" },
};
const MAXIMO_FILAS = 50;

type Cargados = { expedientes: ExpedientePanel[]; hitos: HitoPanel[]; observaciones: Observacion[]; archivos: string[] } | null;

export default function PanelGerencial() {
  const { expedientes: expedientesDemo } = usarExpedientesSunass();
  const [cargados, setCargados] = useState<Cargados>(null);
  const [fechaCorte, setFechaCorte] = useState(FECHA_CORTE);
  const [diasAlerta, setDiasAlerta] = useState(5);
  const [tipo, setTipo] = useState("todos");
  const [error, setError] = useState("");

  const base = useMemo(() => cargados ?? { ...desdeExpedientesDemo(expedientesDemo), observaciones: [], archivos: [] }, [cargados, expedientesDemo]);

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
        expedientes: proc.expedientes, hitos: hit.hitos,
        observaciones: [...proc.observaciones, ...hit.observaciones],
        archivos: [archivoProc.name, ...(archivoHitos && archivoHitos.size > 0 ? [archivoHitos.name] : [])],
      });
    } catch {
      setError("No se pudo leer el archivo. Verifique que sea un CSV separado por comas.");
    }
  }

  const tipos = useMemo(() => [...new Set(base.expedientes.map((e) => e.tipoProcedimiento))].sort(), [base]);
  const filtrados = useMemo(() => base.expedientes.filter((e) => tipo === "todos" || e.tipoProcedimiento === tipo), [base, tipo]);
  const codigos = useMemo(() => new Set(filtrados.map((e) => e.codigoExpediente)), [filtrados]);
  const calculados = useMemo(() => filtrados.map((e) => ({ e, p: calcularPlazo(e, fechaCorte, diasAlerta) })), [filtrados, fechaCorte, diasAlerta]);

  const enTramite = calculados.filter((x) => x.e.estado === "en_tramite");
  const vencimientos = enTramite.filter((x) => x.p.fechaLimite).sort((a, b) => (a.p.diasRestantes ?? 0) - (b.p.diasRestantes ?? 0));
  const contar = (s: Semaforo) => calculados.filter((x) => x.p.semaforo === s).length;
  const resueltosConPlazo = calculados.filter((x) => x.p.semaforo === "resuelto_en_plazo" || x.p.semaforo === "resuelto_fuera");
  const porcentajeEnPlazo = resueltosConPlazo.length ? Math.round((100 * contar("resuelto_en_plazo")) / resueltosConPlazo.length) : null;

  const tiempos = useMemo(() => calcularTiempoPorArea(base.hitos, fechaCorte, codigos), [base, fechaCorte, codigos]);
  const maximoTiempo = Math.max(1, ...tiempos.map((t) => t.promedio));
  const fueraDePlazo = useMemo(() => buscarPasosFueraDePlazo(base.hitos, fechaCorte, codigos), [base, fechaCorte, codigos]);
  const discrepancias = calculados.filter((x) => x.p.difiereDeLaDeclarada);

  return (
    <div className="eps">
      <EncabezadoSunass />
      <main className="panel">
        <header className="panel__titulo">
          <h1>Panel gerencial de plazos</h1>
          <p>Fechas calculadas en días hábiles según el TUPA de la Sunass, el RGT y el TUO de la LPAG. Fuente: {cargados ? cargados.archivos.join(" + ") : "expedientes de la demo (bandeja)"}.</p>
        </header>

        <section className="panel__bloque" aria-labelledby="carga">
          <h2 id="carga">Datos y parámetros</h2>
          <form className="panel__controles" onSubmit={cargar}>
            <label className="campo"><span>Procedimientos (CSV, formato ds02_procedimientos)</span><input type="file" name="procedimientos" accept=".csv,text/csv" /></label>
            <label className="campo"><span>Hitos (CSV opcional, formato ds02_hitos_procedimientos)</span><input type="file" name="hitos" accept=".csv,text/csv" /></label>
            <div className="panel__botones">
              <button type="submit" className="boton">Cargar y calcular</button>
              {cargados && <button type="button" className="boton boton--secundario" onClick={() => setCargados(null)}>Volver a la demo</button>}
            </div>
          </form>
          {error && <p className="aviso aviso--alerta" role="alert">{error}</p>}
          <p className="actualizacion"><span className="ms" aria-hidden="true">lock</span>Los archivos se procesan en este navegador; no se envían a ningún servidor.</p>
          <div className="panel__controles panel__controles--fila" role="group" aria-label="Parámetros del cálculo">
            <label className="campo"><span>Fecha de corte</span><input type="date" value={fechaCorte} onChange={(e) => e.target.value && setFechaCorte(e.target.value)} /></label>
            <label className="campo"><span>Alerta «por vencer» (días hábiles)</span><input type="number" min={1} max={30} value={diasAlerta} onChange={(e) => setDiasAlerta(Math.max(1, Number(e.target.value) || 1))} /></label>
            <label className="campo"><span>Procedimiento</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="todos">Todos ({base.expedientes.length})</option>
                {tipos.map((t) => <option key={t} value={t}>{NOMBRE_PROCEDIMIENTO[t] ?? t}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section aria-labelledby="indicadores">
          <h2 id="indicadores" className="sr-only">Indicadores</h2>
          <ul className="indicadores">
            <li className="indicador"><span>En trámite</span><b>{enTramite.length}</b><small>al {formatearFecha(fechaCorte)}</small></li>
            <li className="indicador indicador--accion"><span><span className="ms" aria-hidden="true">warning</span> Por vencer</span><b>{contar("riesgo")}</b><small>vencen en {diasAlerta} d.h. o menos</small></li>
            <li className="indicador indicador--alerta"><span><span className="ms" aria-hidden="true">event_busy</span> Plazo vencido</span><b>{contar("vencido")}</b><small>sin resolución dentro del plazo</small></li>
            <li className="indicador indicador--alerta"><span><span className="ms" aria-hidden="true">gpp_maybe</span> Silencio positivo</span><b>{contar("silencio")}</b><small>FI sin notificar en plazo + 5 días</small></li>
            <li className="indicador"><span>Resueltos en plazo</span><b>{porcentajeEnPlazo == null ? "—" : `${porcentajeEnPlazo} %`}</b><small>{contar("resuelto_en_plazo")} de {resueltosConPlazo.length} con plazo legal</small></li>
          </ul>
        </section>

        <section className="panel__bloque" aria-labelledby="vencimientos">
          <h2 id="vencimientos">Calendario de vencimientos (en trámite)</h2>
          {vencimientos.length === 0 ? <p className="sunass__vacio">No hay expedientes en trámite con plazo legal en esta selección.</p> : (
            <div className="tabla-envoltura">
              <table className="tabla">
                <caption>Ordenado por días hábiles restantes. Fecha límite = inicio + plazo + días de suspensión. Límite para notificar = fecha límite + 5 días (LPAG 24.1).</caption>
                <thead><tr>
                  <th scope="col">Expediente</th><th scope="col">Procedimiento</th><th scope="col">Dónde está</th><th scope="col">Día</th>
                  <th scope="col">Fecha límite</th><th scope="col">Límite para notificar</th><th scope="col">Restan</th><th scope="col">Situación</th>
                </tr></thead>
                <tbody>
                  {vencimientos.slice(0, MAXIMO_FILAS).map(({ e, p }) => (
                    <tr key={e.codigoExpediente}>
                      <td><b>{e.codigoExpediente}</b><br />{e.codigoEps}</td>
                      <td>{NOMBRE_PROCEDIMIENTO[e.tipoProcedimiento] ?? e.tipoProcedimiento}</td>
                      <td>{e.responsableActual ?? "—"}{e.hitoActual ? <><br /><small>{e.hitoActual.replaceAll("_", " ")}</small></> : null}</td>
                      <td>{p.diaDelPlazo} / {e.plazoMaximoDiasHabiles}{e.diasSuspension ? <><br /><small>+{e.diasSuspension} susp.</small></> : null}</td>
                      <td>{formatearFecha(p.fechaLimite)}</td>
                      <td>{p.fechaLimiteNotificacion ? formatearFecha(p.fechaLimiteNotificacion) : <small>no aplica silencio</small>}</td>
                      <td>{p.diasRestantes != null && p.diasRestantes >= 0 ? `${p.diasRestantes} d.h.` : `${Math.abs(p.diasRestantes ?? 0)} d.h. de retraso`}</td>
                      <td><span className={`chip chip--${SEMAFORO[p.semaforo].tono}`}><span className="ms" aria-hidden="true">{SEMAFORO[p.semaforo].icono}</span> {SEMAFORO[p.semaforo].texto}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {vencimientos.length > MAXIMO_FILAS && <p className="actualizacion">Se muestran los {MAXIMO_FILAS} más urgentes de {vencimientos.length}.</p>}
        </section>

        <div className="panel__dos">
          <section className="panel__bloque" aria-labelledby="cuello">
            <h2 id="cuello">¿Dónde se demora? Días hábiles promedio por área</h2>
            {tiempos.length === 0 ? <p className="sunass__vacio">Cargue el archivo de hitos para ver el tiempo por área.</p> : (
              <>
                <ul className="barras">
                  {tiempos.map((t) => (
                    <li key={t.area} className="barras__fila" title={`${t.area}: promedio ${t.promedio.toFixed(1)} d.h., máximo ${t.maximo} d.h., ${t.pasos} pasos`}>
                      <span className="barras__etiqueta">{t.area}</span>
                      <span className="barras__pista"><span className="barras__barra" style={{ width: `${(100 * t.promedio) / maximoTiempo}%` }} /></span>
                      <span className="barras__valor">{t.promedio.toFixed(1)}</span>
                    </li>
                  ))}
                </ul>
                <details className="ficha__ayuda">
                  <summary>Ver como tabla</summary>
                  <table className="tabla">
                    <thead><tr><th scope="col">Área</th><th scope="col">Promedio (d.h.)</th><th scope="col">Máximo</th><th scope="col">Pasos</th></tr></thead>
                    <tbody>{tiempos.map((t) => <tr key={t.area}><td>{t.area}</td><td>{t.promedio.toFixed(1)}</td><td>{t.maximo}</td><td>{t.pasos}</td></tr>)}</tbody>
                  </table>
                </details>
                <p className="actualizacion">Incluye pasos en curso hasta la fecha de corte. No incluye a la EP ni los días que no cuentan para la Sunass.</p>
              </>
            )}
          </section>

          <section className="panel__bloque" aria-labelledby="pasos">
            <h2 id="pasos">Pasos que superaron su plazo propio</h2>
            <p className="actualizacion">Plazo propio de cada paso: columna plazo_referencial_dh de la hoja Hitos (en el FI: derivación de la DRE 1 d.h.; subsanación de la EP 2 d.h.; información de la EP hasta 10 d.h.).</p>
            {fueraDePlazo.length === 0 ? <p className="sunass__vacio">Ningún paso superó su plazo propio.</p> : (
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead><tr><th scope="col">Expediente</th><th scope="col">Paso</th><th scope="col">Tardó</th></tr></thead>
                  <tbody>
                    {fueraDePlazo.slice(0, MAXIMO_FILAS).map((f) => (
                      <tr key={`${f.codigoExpediente}-${f.codigoHito}`}>
                        <td>{f.codigoExpediente}</td>
                        <td>{f.codigoHito.replaceAll("_", " ")} <small>({f.responsable})</small></td>
                        <td className="dias--alto">{f.dias} de {f.plazo} d.h.{f.enCurso ? " · en curso" : ""}</td>
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
          <p>
            {base.observaciones.length === 0 ? "Sin observaciones de lectura." : `${base.observaciones.length} observaciones de lectura.`}{" "}
            {cargados ? (discrepancias.length === 0 ? "Todas las fechas límite del archivo coinciden con las calculadas." : `${discrepancias.length} fechas límite del archivo no coinciden con las calculadas.`) : ""}
          </p>
          {(base.observaciones.length > 0 || discrepancias.length > 0) && (
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead><tr><th scope="col">Fila / expediente</th><th scope="col">Observación</th></tr></thead>
                <tbody>
                  {discrepancias.slice(0, MAXIMO_FILAS).map(({ e, p }) => (
                    <tr key={`d-${e.codigoExpediente}`}><td>{e.codigoExpediente}</td><td>El archivo dice {formatearFecha(e.fechaLimiteDeclarada)}; el cálculo da {formatearFecha(p.fechaLimite)}. Revise los días de suspensión o los feriados.</td></tr>
                  ))}
                  {base.observaciones.slice(0, MAXIMO_FILAS).map((o, i) => (
                    <tr key={`o-${i}`}><td>Fila {o.fila} · {o.codigo}</td><td>{o.texto}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="actualizacion">Calendario: lunes a viernes sin feriados nacionales; el día 1 es el hábil siguiente al inicio (TUO LPAG art. 134.1). No incluye feriados regionales ni días no laborables por decreto.</p>
        </section>
      </main>
    </div>
  );
}
