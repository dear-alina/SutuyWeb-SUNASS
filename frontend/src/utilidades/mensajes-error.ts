import { ErrorDeApi } from "@/servicios/api/cliente-api";

// Mensajes para los códigos de error del backend.
const MENSAJES: Record<string, string> = {
  credenciales_invalidas: "El usuario o la clave no son correctos.",
  acceso_pendiente: "Su solicitud de acceso aún no ha sido aprobada. Podrá ingresar cuando el administrador la apruebe.",
  demasiados_intentos: "Hizo demasiados intentos. Espere unos minutos e intente de nuevo.",
  solicitud_pendiente: "Ya hay una solicitud pendiente con este correo. Espere a que el administrador la revise.",
  correo_registrado: "Ya existe una cuenta con este correo. Ingrese desde la pantalla de ingreso.",
  solicitud_resuelta: "Esta solicitud ya fue resuelta por otra persona. La lista se actualizó.",
  validacion_fallida: "Revise los campos marcados.",
};

export const MENSAJE_SIN_CONEXION = "No hay conexión con el servidor. Intente de nuevo en unos minutos.";

/** Mensaje legible para cualquier error. */
export function obtenerMensajeDeError(error: unknown, porDefecto = "No se pudo completar la acción. Intente de nuevo."): string {
  if (error instanceof ErrorDeApi) {
    return MENSAJES[error.problema.codigo] ?? error.problema.detail ?? porDefecto;
  }
  return MENSAJE_SIN_CONEXION;
}

/** Errores por campo de una respuesta 422. */
export function obtenerErroresPorCampo(error: unknown): Record<string, string> {
  if (!(error instanceof ErrorDeApi) || !error.problema.errores) return {};
  return Object.fromEntries(error.problema.errores.map(({ campo, mensaje }) => [campo, mensaje]));
}
