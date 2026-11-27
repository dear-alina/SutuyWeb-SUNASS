"use client";

import { FECHA_CORTE, type ExpedienteFi } from "@/demo/expedientes-demo";
import { sumarDiasHabiles, contarDiasHabiles } from "@/demo/calendario-demo";
import { NOMBRE_AREA, obtenerPaso } from "@/demo/flujo-fi";
import { PLAZO_NOTIFICACION_DIAS, calcularDiaDelPlazo, calcularPlazoSunass, obtenerHitoPendiente } from "@/demo/reglas-eps";
import { obtenerPlazoPaso, obtenerTareaArea } from "@/demo/reglas-sunass";
import { formatearFecha, textoDiasHabiles } from "@/utilidades/formatear-fecha";

/** Barra de avance: el número va en texto; el color solo refuerza (verde, ámbar o rojo con su palabra). */
function Barra({ usado, total, etiqueta }: { usado: number; total: number; etiqueta: string }) {
  const proporcion = Math.min(1, total > 0 ? usado / total : 1);
  const tono = usado > total ? "vencido" : proporcion >= 0.8 ? "alerta" : "bien";
  return (
    <div className={`barra-tiempo barra-tiempo--${tono}`} role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(usado, total)} aria-label={etiqueta}>
      <span style={{ width: `${proporcion * 100}%` }} />
    </div>
  );
}

/**
 * Los plazos se cuentan en días hábiles y vencen al terminar la jornada del último día:
 * no se muestran horas ni segundos (precisión que la norma no da).
 */
function TiempoDelPaso({ expediente, area }: { expediente: ExpedienteFi; area: string | null }) {
  const tarea = obtenerTareaArea(expediente, area);

  if (tarea?.tipo === "notificar" && expediente.fechaConclusion) {
    const venceEl = sumarDiasHabiles(expediente.fechaConclusion, PLAZO_NOTIFICACION_DIAS);
    const usados = Math.max(0, contarDiasHabiles(expediente.fechaConclusion, FECHA_CORTE));
    const restan = contarDiasHabiles(FECHA_CORTE, venceEl);
    return (
      <section className="tarjeta-tiempo" aria-labelledby="tiempo-paso">
        <h3 id="tiempo-paso">Su tiempo para este paso</h3>
        <p className="tarjeta-tiempo__paso">Notificar la resolución</p>
        <p className="tarjeta-tiempo__vence">Vence el {formatearFecha(venceEl)}</p>
        <p className="tarjeta-tiempo__cifra">{restan >= 0 ? `Le quedan ${textoDiasHabiles(restan)}` : `${textoDiasHabiles(-restan)} de retraso`}</p>
        <Barra usado={usados} total={PLAZO_NOTIFICACION_DIAS} etiqueta="Días usados del plazo para notificar" />
        <small>Plazo legal: {PLAZO_NOTIFICACION_DIAS} días desde la resolución (TUO LPAG art. 24.1).</small>
      </section>
    );
  }

  const pendiente = obtenerHitoPendiente(expediente);
  const plazoPaso = obtenerPlazoPaso(expediente, FECHA_CORTE);
  if (!pendiente || !plazoPaso) return null;
  const titulo = tarea ? "Su tiempo para este paso" : `Tiempo en ${pendiente.area}`;

  return (
    <section className="tarjeta-tiempo" aria-labelledby="tiempo-paso">
      <h3 id="tiempo-paso">{titulo}</h3>
      <p className="tarjeta-tiempo__paso">{obtenerPaso(pendiente.codigoHito)?.accion ?? pendiente.codigoHito} {tarea ? "" : `(${NOMBRE_AREA[pendiente.area] ?? pendiente.area})`}</p>
      {plazoPaso.plazoDiasHabiles != null && plazoPaso.venceEl ? (
        <>
          <p className="tarjeta-tiempo__vence">{plazoPaso.estaVencido ? "Venció" : "Vence"} el {formatearFecha(plazoPaso.venceEl)}</p>
          <p className="tarjeta-tiempo__cifra">
            {plazoPaso.estaVencido
              ? `${textoDiasHabiles(plazoPaso.diasEnArea - plazoPaso.plazoDiasHabiles)} de retraso`
              : `Le queda${plazoPaso.plazoDiasHabiles - plazoPaso.diasEnArea === 1 ? "" : "n"} ${textoDiasHabiles(plazoPaso.plazoDiasHabiles - plazoPaso.diasEnArea)}`}
          </p>
          <Barra usado={plazoPaso.diasEnArea} total={plazoPaso.plazoDiasHabiles} etiqueta="Días usados de la meta del paso" />
          <small>Meta interna: {textoDiasHabiles(plazoPaso.plazoDiasHabiles)} (hoja Hitos). Se cuenta en días hábiles (TUO LPAG).</small>
        </>
      ) : (
        <>
          <p className="tarjeta-tiempo__cifra">{textoDiasHabiles(plazoPaso.diasEnArea)} en el área</p>
          <small>Desde el {formatearFecha(pendiente.iniciadoEn)}. Este paso no tiene meta propia: cuenta dentro de los 30 días hábiles del procedimiento.</small>
        </>
      )}
    </section>
  );
}

const TEXTO_SITUACION: Record<string, string> = {
  en_plazo: "En plazo",
  vencido: "Plazo vencido: aún se puede notificar",
  silencio_configurado: "Silencio positivo configurado",
  resuelto_en_plazo: "Resuelto en plazo",
  resuelto_tras_silencio: "Resuelto después del plazo de silencio",
};

function PlazoDelProcedimiento({ expediente }: { expediente: ExpedienteFi }) {
  const plazo = calcularPlazoSunass(expediente, FECHA_CORTE);
  const dia = calcularDiaDelPlazo(expediente, FECHA_CORTE);
  const total = expediente.plazoMaximoDiasHabiles;
  return (
    <section className="tarjeta-tiempo" aria-labelledby="plazo-procedimiento">
      <h3 id="plazo-procedimiento">Plazo del procedimiento</h3>
      <p className="tarjeta-tiempo__cifra">Día {Math.min(dia, total)} de {total}</p>
      <Barra usado={dia} total={total} etiqueta="Días hábiles usados del plazo del procedimiento" />
      <dl className="tarjeta-tiempo__datos">
        <dt>Resolver hasta</dt><dd>{formatearFecha(plazo.fechaLimite)}</dd>
        <dt>Notificar hasta</dt><dd>{formatearFecha(plazo.fechaLimiteNotificacion)}</dd>
        <dt>Situación</dt><dd>{TEXTO_SITUACION[plazo.situacion]}</dd>
      </dl>
      <small>30 días hábiles (TUPA de la Sunass). Si la resolución no se notifica hasta la fecha indicada, opera el silencio administrativo positivo (RGT 89.8; TUO LPAG 188.1). Los días que la EP tarda en subsanar o responder no se cuentan.</small>
    </section>
  );
}

export function TarjetasTiempo({ expediente, area }: { expediente: ExpedienteFi; area: string | null }) {
  return (
    <aside className="tarjetas-tiempo" aria-label="Plazos">
      <TiempoDelPaso expediente={expediente} area={area} />
      <PlazoDelProcedimiento expediente={expediente} />
    </aside>
  );
}
