import type { ExpedienteFi } from "@/demo/expedientes-demo";
import type { SituacionEps } from "@/demo/reglas-eps";

export function TarjetaTramite({ expediente, situacion, estaSeleccionada, alElegir }: {
  expediente: ExpedienteFi;
  situacion: SituacionEps;
  estaSeleccionada: boolean;
  alElegir: () => void;
}) {
  return (
    <li>
      <button type="button" className="tarjeta-tramite" aria-current={estaSeleccionada ? "true" : undefined} onClick={alElegir}>
        <span className="tarjeta-tramite__codigo">{expediente.codigoExpediente}</span>
        <span className="tarjeta-tramite__fila">
          <b>Uso excepcional del fondo de inversiones</b>
          <span className={`chip chip--${situacion.tono}`}>{situacion.textoEstado}</span>
        </span>
        <span className="tarjeta-tramite__texto">
          {situacion.accion ? `Le toca: ${situacion.accion.titulo.toLowerCase()}.` : situacion.queEstaPasando}
        </span>
      </button>
    </li>
  );
}
