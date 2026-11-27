import { solicitarApi } from "./cliente-api";

/** Contrato de GET /api/v1/panel-gerencial (backend, cambio implementar-panel-gerencial). */
export type Semaforo =
  | "silencio_positivo" | "vencido" | "por_vencer" | "en_plazo"
  | "resuelto_en_plazo" | "resuelto_fuera_de_plazo" | "resuelto_sin_fecha" | "sin_plazo";

export type VencimientoPanel = {
  codigoExpediente: string;
  codigoEps: string;
  tipoProcedimiento: string;
  areaActual: string | null;
  hitoActual: string | null;
  plazoMaximoDiasHabiles: number;
  fechaLimite: string;
  fechaLimiteNotificacion: string | null;
  diaDelPlazo: number;
  diasRestantes: number;
  diasSuspension: number;
  semaforo: Semaforo;
};

export type ObservacionCalidad = { codigoExpediente: string; regla: string; detalle: string };

export type PanelGerencial = {
  fechaCorte: string;
  diasAlerta: number;
  tipoProcedimiento: string | null;
  indicadores: {
    enTramite: number; porVencer: number; plazoVencido: number; silencioPositivo: number;
    resueltosEnPlazo: number; resueltosConPlazo: number; porcentajeResueltosEnPlazo: number | null;
  };
  vencimientos: VencimientoPanel[];
  tiempoPorArea: { area: string; promedioDiasHabiles: number; maximoDiasHabiles: number; cantidadPasos: number }[];
  pasosFueraDePlazo: { codigoExpediente: string; codigoHito: string; responsable: string; diasHabiles: number; plazoDiasHabiles: number; estaEnCurso: boolean }[];
  calidadDatos: ObservacionCalidad[];
};

export type ConsultaPanel = { fechaCorte: string; diasAlerta: number; tipoProcedimiento?: string | null };

export function obtenerPanelGerencial({ fechaCorte, diasAlerta, tipoProcedimiento }: ConsultaPanel) {
  const parametros = new URLSearchParams({ fechaCorte, diasAlerta: String(diasAlerta) });
  if (tipoProcedimiento) parametros.set("tipoProcedimiento", tipoProcedimiento);
  return solicitarApi<PanelGerencial>(`/api/v1/panel-gerencial?${parametros}`);
}
