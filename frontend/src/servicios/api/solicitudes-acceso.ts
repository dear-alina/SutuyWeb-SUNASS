import { solicitarApi } from "./cliente-api";

// Provisional: luego se generan desde backend/openapi.json.
export type EstadoSolicitud = "pendiente" | "aprobada" | "rechazada";

export type SolicitudAcceso = {
  solicitudAccesoId: string;
  nombre: string;
  cargo: string | null;
  correo: string;
  estado: EstadoSolicitud;
  codigoEps: string;
  nombreEps: string;
  motivoRechazo: string | null;
  solicitadoEn: string;
  resueltoEn: string | null;
};

export type Paginacion = { pagina: number; tamanoPagina: number; total: number; totalPaginas: number };

export type DatosSolicitud = {
  ruc: string;
  nombre: string;
  cargo: string | null;
  correo: string;
  clave: string;
};

export function solicitarAcceso(datos: DatosSolicitud) {
  return solicitarApi<{ solicitudAccesoId: string; estado: "pendiente"; solicitadoEn: string }>("/api/v1/solicitudes-acceso", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function listarSolicitudes({ estado, pagina = 1, tamanoPagina = 20 }: { estado?: EstadoSolicitud; pagina?: number; tamanoPagina?: number }) {
  const parametros = new URLSearchParams({ pagina: String(pagina), tamanoPagina: String(tamanoPagina) });
  if (estado) parametros.set("estado", estado);
  return solicitarApi<{ datos: SolicitudAcceso[]; paginacion: Paginacion }>(`/api/v1/solicitudes-acceso?${parametros}`);
}

export function aprobarSolicitud(solicitudAccesoId: string) {
  return solicitarApi<SolicitudAcceso>(`/api/v1/solicitudes-acceso/${encodeURIComponent(solicitudAccesoId)}/aprobacion`, {
    method: "POST",
  });
}

export function rechazarSolicitud(solicitudAccesoId: string, motivoRechazo: string) {
  return solicitarApi<SolicitudAcceso>(`/api/v1/solicitudes-acceso/${encodeURIComponent(solicitudAccesoId)}/rechazo`, {
    method: "POST",
    body: JSON.stringify({ motivoRechazo }),
  });
}
