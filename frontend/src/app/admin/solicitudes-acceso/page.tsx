"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ErrorDeApi } from "@/servicios/api/cliente-api";
import {
  aprobarSolicitud,
  listarSolicitudes,
  rechazarSolicitud,
  type Paginacion,
  type SolicitudAcceso,
} from "@/servicios/api/solicitudes-acceso";
import { formatearFecha } from "@/utilidades/formatear";
import { obtenerMensajeDeError } from "@/utilidades/mensajes-error";

const TAMANO_PAGINA = 10;

export default function PaginaSolicitudesAcceso() {
  const [solicitudes, setSolicitudes] = useState<SolicitudAcceso[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion | null>(null);
  const [pagina, setPagina] = useState(1);
  const [estaCargando, setEstaCargando] = useState(true);
  const [aviso, setAviso] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);
  const [idEnProceso, setIdEnProceso] = useState<string | null>(null);
  const [idRechazando, setIdRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState("");
  const campoMotivo = useRef<HTMLTextAreaElement>(null);

  const cargar = useCallback(async (paginaPedida: number) => {
    setEstaCargando(true);
    try {
      const respuesta = await listarSolicitudes({ estado: "pendiente", pagina: paginaPedida, tamanoPagina: TAMANO_PAGINA });
      // Página vacía: volver a la anterior.
      if (!respuesta.datos.length && paginaPedida > 1) {
        setPagina(paginaPedida - 1);
        return;
      }
      setSolicitudes(respuesta.datos);
      setPaginacion(respuesta.paginacion);
    } catch (error) {
      setAviso({ tipo: "error", texto: obtenerMensajeDeError(error, "No se pudo cargar la lista de solicitudes.") });
    } finally {
      setEstaCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(pagina);
  }, [pagina, cargar]);

  useEffect(() => {
    if (idRechazando) campoMotivo.current?.focus();
  }, [idRechazando]);

  async function resolver(solicitud: SolicitudAcceso, accion: () => Promise<unknown>, textoExito: string) {
    setIdEnProceso(solicitud.solicitudAccesoId);
    setAviso(null);
    try {
      await accion();
      setAviso({ tipo: "exito", texto: textoExito });
      setIdRechazando(null);
    } catch (error) {
      const yaResuelta = error instanceof ErrorDeApi && error.problema.codigo === "solicitud_resuelta";
      setAviso({ tipo: "error", texto: obtenerMensajeDeError(error) });
      if (!yaResuelta) return; // conserva el formulario para reintentar
      setIdRechazando(null);
    } finally {
      setIdEnProceso(null);
    }
    await cargar(pagina);
  }

  function abrirRechazo(solicitudAccesoId: string) {
    setIdRechazando(solicitudAccesoId);
    setMotivo("");
    setErrorMotivo("");
  }

  async function confirmarRechazo(evento: FormEvent<HTMLFormElement>, solicitud: SolicitudAcceso) {
    evento.preventDefault();
    if (!motivo.trim()) {
      setErrorMotivo("Escriba el motivo del rechazo.");
      campoMotivo.current?.focus();
      return;
    }
    await resolver(
      solicitud,
      () => rechazarSolicitud(solicitud.solicitudAccesoId, motivo.trim()),
      `Se rechazó la solicitud de ${solicitud.nombre}.`,
    );
  }

  return (
    <>
      <h1>Solicitudes de acceso</h1>
      <p className="texto-secundario">Personas de las EPS que pidieron acceso y esperan su aprobación.</p>

      <div aria-live="polite">
        {aviso && (
          <p className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : "status"}>
            {aviso.texto}
          </p>
        )}
      </div>

      {estaCargando && !solicitudes.length ? (
        <p role="status">Cargando solicitudes…</p>
      ) : !solicitudes.length ? (
        <p className="aviso aviso--info">No hay solicitudes por revisar.</p>
      ) : (
        <ul className="lista-solicitudes" aria-busy={estaCargando}>
          {solicitudes.map((solicitud) => {
            const estaOcupada = idEnProceso === solicitud.solicitudAccesoId;
            const idTitulo = `solicitud-${solicitud.solicitudAccesoId}`;
            return (
              <li key={solicitud.solicitudAccesoId} className="tarjeta" aria-labelledby={idTitulo}>
                <h2 id={idTitulo}>{solicitud.nombre}</h2>
                <dl className="datos">
                  <dt>Cargo</dt>
                  <dd>{solicitud.cargo ?? "No indicado"}</dd>
                  <dt>Correo</dt>
                  <dd>{solicitud.correo}</dd>
                  <dt>EPS</dt>
                  <dd>
                    {solicitud.nombreEps} ({solicitud.codigoEps})
                  </dd>
                  <dt>Solicitado el</dt>
                  <dd>{formatearFecha(solicitud.solicitadoEn)}</dd>
                </dl>

                {idRechazando === solicitud.solicitudAccesoId ? (
                  <form className="form-rechazo" onSubmit={(evento) => confirmarRechazo(evento, solicitud)} noValidate>
                    <label className="campo" htmlFor={`motivo-${solicitud.solicitudAccesoId}`}>
                      <span>Motivo del rechazo</span>
                      <textarea
                        ref={campoMotivo}
                        id={`motivo-${solicitud.solicitudAccesoId}`}
                        value={motivo}
                        maxLength={500}
                        onChange={(evento) => {
                          setMotivo(evento.target.value);
                          if (errorMotivo) setErrorMotivo("");
                        }}
                        aria-invalid={errorMotivo ? true : undefined}
                        aria-describedby={errorMotivo ? `error-motivo-${solicitud.solicitudAccesoId}` : undefined}
                        required
                      />
                      {errorMotivo && (
                        <span id={`error-motivo-${solicitud.solicitudAccesoId}`} className="campo__error">{errorMotivo}</span>
                      )}
                    </label>
                    <div className="acciones">
                      <button type="submit" className="boton boton--peligro" disabled={estaOcupada}>
                        {estaOcupada ? "Rechazando…" : "Confirmar rechazo"}
                      </button>
                      <button type="button" className="boton boton--secundario" onClick={() => setIdRechazando(null)} disabled={estaOcupada}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="acciones">
                    <button
                      type="button"
                      className="boton"
                      disabled={estaOcupada}
                      onClick={() =>
                        resolver(solicitud, () => aprobarSolicitud(solicitud.solicitudAccesoId), `Se aprobó la solicitud de ${solicitud.nombre}. Ya puede ingresar.`)
                      }
                    >
                      {estaOcupada ? "Aprobando…" : "Aprobar"}
                    </button>
                    <button
                      type="button"
                      className="boton boton--peligro"
                      disabled={estaOcupada}
                      onClick={() => abrirRechazo(solicitud.solicitudAccesoId)}
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {paginacion && paginacion.totalPaginas > 1 && (
        <nav className="paginacion" aria-label="Páginas de solicitudes">
          <button type="button" className="boton boton--secundario" disabled={pagina <= 1 || estaCargando} onClick={() => setPagina(pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {paginacion.pagina} de {paginacion.totalPaginas}
          </span>
          <button
            type="button"
            className="boton boton--secundario"
            disabled={pagina >= paginacion.totalPaginas || estaCargando}
            onClick={() => setPagina(pagina + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </>
  );
}
