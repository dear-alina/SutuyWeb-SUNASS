import { solicitarApi } from "./cliente-api";

export type Institucion = "sunass" | "eps";

// Provisional: se reemplaza por el tipo generado desde backend/openapi.json (design.md, D5)
export type Perfil = {
  rol: "admin" | "sunass" | "eps";
  area: string | null;
  codigoEps: string | null;
  proveedor: "correo" | "microsoft";
};

export type DatosIngreso = {
  institucion: Institucion;
  ruc: string;
  usuario: string;
  clave: string;
};

// PENDIENTE de alinear: SDD-UX-001 pide RUC + usuario + clave, y el contrato-api
// (POST /api/v1/sesiones) recibe correo + clave. Ajustar el cuerpo cuando se acuerde.
export function iniciarSesion(datos: DatosIngreso) {
  return solicitarApi<Perfil>("/api/v1/sesiones", {
    method: "POST",
    body: JSON.stringify(datos),
  });
}

export function obtenerPerfil() {
  return solicitarApi<Perfil>("/api/v1/perfil");
}

export function cerrarSesion() {
  return solicitarApi<void>("/api/v1/sesiones/actual", { method: "DELETE" });
}

export function obtenerRutaInicio(perfil: Perfil): string {
  if (perfil.rol === "eps") return "/eps/tramites";
  if (perfil.rol === "admin") return "/admin/solicitudes-acceso";
  return "/sunass/inicio";
}
