"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import { FECHA_CORTE } from "@/demo/expedientes-demo";
import { generarNotificacionesEps, obtenerSituacionEps } from "@/demo/reglas-eps";
import { usarExpedientesEps } from "@/demo/usar-expedientes";
import { EncabezadoEps } from "@/componentes/eps/EncabezadoEps";
import { TarjetaTramite } from "@/componentes/eps/TarjetaTramite";
import { FichaTramite } from "@/componentes/eps/FichaTramite";

type Filtro = "accion" | "curso" | "concluidos";

export default function PaginaTramites() {
  const { perfil } = usarSesion();
  const { expedientes, actualizadoEn } = usarExpedientesEps(perfil?.codigoEps);
  const [filtro, setFiltro] = useState<Filtro>("curso");
  const [codigoSeleccionado, setCodigoSeleccionado] = useState<string | null>(null);

  const conSituacion = useMemo(
    () => expedientes.map((e) => ({ expediente: e, situacion: obtenerSituacionEps(e, FECHA_CORTE) })),
    [expedientes],
  );
  const notificaciones = useMemo(() => generarNotificacionesEps(expedientes, FECHA_CORTE), [expedientes]);

  const filtrados = conSituacion.filter(({ expediente, situacion }) =>
    filtro === "accion" ? !!situacion.accion : filtro === "curso" ? expediente.estado === "en_tramite" : expediente.estado !== "en_tramite",
  );
  const seleccionado = conSituacion.find((x) => x.expediente.codigoExpediente === codigoSeleccionado);
  const cantidadAccion = conSituacion.filter((x) => x.situacion.accion).length;

  function elegirExpediente(codigo: string) {
    const encontrado = conSituacion.find((x) => x.expediente.codigoExpediente === codigo);
    if (encontrado) setFiltro(encontrado.expediente.estado === "en_tramite" ? "curso" : "concluidos");
    setCodigoSeleccionado(codigo);
  }

  return (
    <div className="eps">
      <EncabezadoEps notificaciones={notificaciones} alElegirNotificacion={elegirExpediente} />
      <main className="eps__contenido">
        <section className="eps__lista" aria-labelledby="sus-tramites">
          <h1 id="sus-tramites">Mis solicitudes</h1>
          <p className="actualizacion" role="status">
            <span className="ms" aria-hidden="true">sync</span>
            Se actualiza automáticamente{actualizadoEn ? ` · última revisión ${actualizadoEn.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
          <Link href="/eps/nueva-solicitud" className="boton boton--ancho">
            <span className="ms" aria-hidden="true">add</span> Nueva solicitud
          </Link>

          <div className="filtros" role="tablist" aria-label="Filtrar trámites">
            {([
              ["accion", `Requieren su acción (${cantidadAccion})`],
              ["curso", "En curso"],
              ["concluidos", "Concluidos"],
            ] as [Filtro, string][]).map(([valor, texto]) => (
              <button key={valor} type="button" role="tab" aria-selected={filtro === valor} onClick={() => setFiltro(valor)}>
                {texto}
              </button>
            ))}
          </div>

          {filtrados.length === 0 ? (
            <p className="vacio">
              {filtro === "accion" ? "No tiene acciones pendientes." : filtro === "curso" ? "No tiene trámites en curso." : "No tiene trámites concluidos."}
            </p>
          ) : (
            <ul className="lista-tramites">
              {filtrados.map(({ expediente, situacion }) => (
                <TarjetaTramite
                  key={expediente.codigoExpediente}
                  expediente={expediente}
                  situacion={situacion}
                  estaSeleccionada={expediente.codigoExpediente === codigoSeleccionado}
                  alElegir={() => setCodigoSeleccionado(expediente.codigoExpediente)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="eps__detalle" aria-live="polite">
          {seleccionado ? (
            <FichaTramite expediente={seleccionado.expediente} situacion={seleccionado.situacion} fechaReferencia={FECHA_CORTE} />
          ) : (
            <div className="eps__sin-seleccion">
              <span className="ms" aria-hidden="true">inventory_2</span>
              <p>Elija una solicitud para ver en qué etapa está, cómo va el plazo de la Sunass y si debe hacer algo.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
