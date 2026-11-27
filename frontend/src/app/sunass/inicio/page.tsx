"use client";

import { useEffect, useMemo, useState } from "react";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import { FECHA_CORTE } from "@/demo/expedientes-demo";
import { USUARIOS_DEMO } from "@/demo/usuarios-demo";
import { usarExpedientesSunass } from "@/demo/usar-expedientes";
import { TEXTO_RESULTADO, calcularPlazoSunass, obtenerHitoPendiente } from "@/demo/reglas-eps";
import { obtenerTareaArea } from "@/demo/reglas-sunass";
import { contarDiasHabiles } from "@/demo/calendario-demo";
import { EncabezadoSunass } from "@/componentes/sunass/EncabezadoSunass";
import { FichaExpedienteSunass } from "@/componentes/sunass/FichaExpedienteSunass";
import { TarjetasTiempo } from "@/componentes/sunass/TarjetasTiempo";

const nombreEps = (codigoEps: string) => USUARIOS_DEMO.find((u) => u.codigoEps === codigoEps)?.nombre ?? codigoEps;
type Orden = "prioridad" | "recientes";

export default function PaginaInicioSunass() {
  const { perfil } = usarSesion();
  const { expedientes, actualizadoEn } = usarExpedientesSunass();
  const [codigoSeleccionado, setCodigoSeleccionado] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>("prioridad");
  const [verConcluidos, setVerConcluidos] = useState(false);
  const area = perfil?.area ?? null;

  const filas = useMemo(() => expedientes.map((e) => {
    const tarea = obtenerTareaArea(e, area);
    const plazo = calcularPlazoSunass(e, FECHA_CORTE);
    return {
      e, tarea,
      // Pendiente de su área = en trámite o resuelto sin notificar
      estaAbierto: e.estado === "en_tramite" || e.fechaNotificacion === null,
      diasRestantes: contarDiasHabiles(FECHA_CORTE, plazo.fechaLimite),
    };
  }), [expedientes, area]);

  const abiertos = useMemo(() => filas.filter((f) => f.estaAbierto).sort((a, b) =>
    orden === "recientes"
      ? b.e.fechaInicio.localeCompare(a.e.fechaInicio)
      : Number(!!b.tarea) - Number(!!a.tarea) || a.diasRestantes - b.diasRestantes, // primero lo suyo, luego lo que vence antes
  ), [filas, orden]);
  const concluidos = filas.filter((f) => !f.estaAbierto);
  const cantidadSuya = filas.filter((f) => f.tarea).length;
  const lista = verConcluidos ? concluidos : abiertos;

  // Abre el primero que le toca y lo mantiene abierto aunque, tras la acción, ya no sea suyo
  useEffect(() => {
    if (!codigoSeleccionado && abiertos[0]) setCodigoSeleccionado(abiertos[0].e.codigoExpediente);
  }, [codigoSeleccionado, abiertos]);
  const seleccionado = expedientes.find((e) => e.codigoExpediente === codigoSeleccionado) ?? null;

  return (
    <div className="eps">
      <EncabezadoSunass />
      <main className="bandeja">
        <section className="bandeja__lista" aria-labelledby="titulo-bandeja">
          <h1 id="titulo-bandeja">Uso excepcional del fondo de inversiones</h1>
          <p className="actualizacion" role="status">
            <span className="ms" aria-hidden="true">sync</span>
            {cantidadSuya} le toca{cantidadSuya === 1 ? "" : "n"} a usted · se actualiza solo{actualizadoEn ? ` · ${actualizadoEn.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>

          {!verConcluidos && (
            <div className="orden" role="group" aria-label="Ordenar la lista">
              {([["prioridad", "Prioridad"], ["recientes", "Más recientes"]] as [Orden, string][]).map(([valor, texto]) => (
                <button key={valor} type="button" aria-pressed={orden === valor} onClick={() => setOrden(valor)}>
                  {orden === valor && <span className="ms" aria-hidden="true">check</span>} {texto}
                </button>
              ))}
            </div>
          )}

          {lista.length === 0 ? (
            <p className="sunass__vacio">{verConcluidos ? "No hay expedientes concluidos." : "No hay expedientes en curso."}</p>
          ) : (
            <ul className="lista-exp">
              {lista.map(({ e, tarea }) => {
                const pendiente = obtenerHitoPendiente(e);
                const donde = pendiente ? (pendiente.area === "equipo_srt" ? "Equipo SRT" : pendiente.area) : e.fechaNotificacion === null ? "DRE" : TEXTO_RESULTADO[e.resultado ?? ""] ?? "Concluido";
                return (
                  <li key={e.codigoExpediente}>
                    <button type="button" className="lista-exp__item" aria-current={seleccionado?.codigoExpediente === e.codigoExpediente}
                      onClick={() => setCodigoSeleccionado(e.codigoExpediente)}>
                      <span className="lista-exp__codigo">{e.codigoExpediente}</span>
                      <b>{nombreEps(e.codigoEps)}</b>
                      {tarea ? <span className="chip chip--accion">Le toca a usted</span> : <span className="lista-exp__donde">{donde}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button type="button" className="enlace-boton" onClick={() => setVerConcluidos(!verConcluidos)}>
            {verConcluidos ? `Ver en curso (${abiertos.length})` : `Concluidos (${concluidos.length})`}
          </button>
        </section>

        {seleccionado ? (
          <div className="bandeja__detalle">
            <FichaExpedienteSunass expediente={seleccionado} nombreEps={nombreEps(seleccionado.codigoEps)} area={area} todos={expedientes} />
            <TarjetasTiempo expediente={seleccionado} area={area} />
          </div>
        ) : (
          <p className="sunass__vacio">Elija un expediente de la lista.</p>
        )}
      </main>
    </div>
  );
}
