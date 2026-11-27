import type { ExpedienteFi } from "@/demo/expedientes-demo";
import { PLAZO_RECONSIDERACION_DIAS_HABILES, calcularDiaDelPlazo, type SituacionEps } from "@/demo/reglas-eps";
import { formatearFecha } from "@/utilidades/formatear-fecha";

const TEXTO_SITUACION: Record<SituacionEps["plazo"]["situacion"], { titulo: string; tono: string }> = {
  en_plazo: { titulo: "La Sunass está dentro del plazo", tono: "informacion" },
  vencido: { titulo: "Venció el plazo: corre el margen de 5 días para notificar", tono: "accion" },
  silencio_configurado: { titulo: "Silencio positivo configurado", tono: "alerta" },
  resuelto_en_plazo: { titulo: "Resuelta dentro del plazo", tono: "exito" },
  resuelto_tras_silencio: { titulo: "Resuelta después de configurado el silencio positivo", tono: "alerta" },
};

export function IndicadorSilencio({ expediente, situacion, fechaReferencia }: { expediente: ExpedienteFi; situacion: SituacionEps; fechaReferencia: string }) {
  const { plazo } = situacion;
  const dia = calcularDiaDelPlazo(expediente, fechaReferencia);
  const porcentaje = Math.min(100, Math.round((dia / expediente.plazoMaximoDiasHabiles) * 100));
  const texto = TEXTO_SITUACION[plazo.situacion];

  return (
    <section className="ficha__bloque" aria-labelledby="titulo-silencio">
      <h3 id="titulo-silencio">Plazo de la Sunass y silencio administrativo</h3>

      <p className={`chip chip--${texto.tono}`}>{texto.titulo}</p>
      <div className="plazo-barra" role="progressbar" aria-valuemin={0} aria-valuemax={expediente.plazoMaximoDiasHabiles} aria-valuenow={Math.min(dia, expediente.plazoMaximoDiasHabiles)} aria-label="Días hábiles transcurridos del plazo de la Sunass">
        <span style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="plazo-texto">
        Día <b>{dia}</b> de {expediente.plazoMaximoDiasHabiles} días hábiles · vence el <b>{formatearFecha(plazo.fechaLimite)}</b> · margen para notificar hasta el <b>{formatearFecha(plazo.fechaLimiteNotificacion)}</b>
      </p>

      <div className="silencios">
        <div className="silencio silencio--aplica">
          <p className="silencio__titulo"><span className="ms" aria-hidden="true">check_circle</span> Silencio positivo · <b>aplica</b> a este trámite</p>
          <p>Si la Sunass no le notifica su decisión dentro de los 30 días hábiles más 5 días, su solicitud se considera <b>aprobada</b> en los términos en que la pidió.</p>
          <small>RGT art. 89.8 · TUPA de la Sunass: «evaluación previa – silencio administrativo positivo» · TUO LPAG arts. 24.1 y 188.1</small>
        </div>
        <div className="silencio">
          <p className="silencio__titulo"><span className="ms" aria-hidden="true">block</span> Silencio negativo · <b>no aplica</b> a este trámite</p>
          <p>En otros trámites, el vencimiento del plazo permite considerar <b>denegada</b> la solicitud y recurrir. Aquí no rige, porque el reglamento y el TUPA califican este trámite como de silencio positivo.</p>
          <small>TUO LPAG art. 34.1: el silencio negativo solo se aplica cuando la norma del procedimiento lo establece</small>
        </div>
      </div>

      {(plazo.situacion === "silencio_configurado" || plazo.situacion === "resuelto_tras_silencio") && (
        <p className="aviso aviso--alerta" role="alert">
          {plazo.situacion === "resuelto_tras_silencio"
            ? `La resolución se emitió el ${formatearFecha(expediente.fechaConclusion)}, después del ${formatearFecha(plazo.fechaLimiteNotificacion)}. `
            : `No consta una notificación hasta el ${formatearFecha(plazo.fechaLimiteNotificacion)}. `}
          Su solicitud podría considerarse aprobada por silencio positivo. Consulte con su área legal. <small>TUO LPAG arts. 188.1 y 188.2.</small>
        </p>
      )}
      {expediente.fechaConclusion && (
        <p className="plazo-texto">Si no está conforme con la resolución, puede presentar reconsideración ante el Consejo Directivo dentro de {PLAZO_RECONSIDERACION_DIAS_HABILES} días hábiles, con nueva prueba (TUPA; TUO LPAG art. 207.2).</p>
      )}
      <p className="plazo-texto">Los días que usted tarde en subsanar o enviar información no se cuentan en el plazo de la Sunass (TUO LPAG art. 125.3.1).</p>
    </section>
  );
}
