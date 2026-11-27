"use client";

import { useEffect, useRef, useState } from "react";
import type { NotificacionEps } from "@/demo/reglas-eps";

export function CampanaNotificaciones({ notificaciones, alElegir }: { notificaciones: NotificacionEps[]; alElegir: (codigoExpediente: string) => void }) {
  const [estaAbierta, setEstaAbierta] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function cerrarConEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setEstaAbierta(false);
    }
    function cerrarAlClicFuera(evento: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) setEstaAbierta(false);
    }
    document.addEventListener("keydown", cerrarConEscape);
    document.addEventListener("mousedown", cerrarAlClicFuera);
    return () => {
      document.removeEventListener("keydown", cerrarConEscape);
      document.removeEventListener("mousedown", cerrarAlClicFuera);
    };
  }, []);

  const cantidad = notificaciones.length;

  return (
    <div className="campana" ref={contenedor}>
      <button
        type="button"
        className="eps-barra__icono"
        aria-expanded={estaAbierta}
        aria-controls="panel-notificaciones"
        aria-label={`Notificaciones: ${cantidad} ${cantidad === 1 ? "pendiente" : "pendientes"}`}
        onClick={() => setEstaAbierta((valor) => !valor)}
      >
        <span className="ms" aria-hidden="true">notifications</span>
        {cantidad > 0 && <span className="campana__contador" aria-hidden="true">{cantidad}</span>}
      </button>
      {estaAbierta && (
        <div id="panel-notificaciones" className="campana__panel" role="region" aria-label="Notificaciones">
          <p className="campana__titulo">Notificaciones</p>
          {cantidad === 0 ? (
            <p className="campana__vacio">No tiene notificaciones pendientes.</p>
          ) : (
            <ul className="campana__lista">
              {notificaciones.map((n) => (
                <li key={n.codigo}>
                  <button
                    type="button"
                    className={`campana__item campana__item--${n.tono}`}
                    onClick={() => {
                      alElegir(n.codigoExpediente);
                      setEstaAbierta(false);
                    }}
                  >
                    <b>{n.titulo}</b>
                    <span>{n.detalle}</span>
                    <small>{n.codigoExpediente} · {n.base}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
