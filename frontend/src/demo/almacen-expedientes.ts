/**
 * Almacén de expedientes de la DEMO, compartido entre pestañas del mismo navegador (localStorage).
 * Cuando una vista de la Sunass avanza un paso en otra pestaña, la vista de la EP se actualiza sola.
 * En el MVP lo reemplaza GET /api/v1/expedientes (con consulta periódica o tiempo real de Supabase).
 */
import { EXPEDIENTES_DEMO, type ExpedienteFi } from "./expedientes-demo";

const CLAVE_ALMACEN = "sutuy-expedientes-demo";
const EVENTO_CAMBIO = "sutuy-expedientes-cambio";

export function leerExpedientes(): ExpedienteFi[] {
  try {
    const guardados = localStorage.getItem(CLAVE_ALMACEN);
    return guardados ? (JSON.parse(guardados) as ExpedienteFi[]) : EXPEDIENTES_DEMO;
  } catch {
    return EXPEDIENTES_DEMO;
  }
}

function guardarExpedientes(expedientes: ExpedienteFi[]): void {
  try {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(expedientes));
  } catch {
    /* sin almacenamiento: los cambios duran hasta recargar */
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO)); // avisa a la pestaña actual
}

export function agregarExpediente(expediente: ExpedienteFi): void {
  guardarExpedientes([expediente, ...leerExpedientes()]);
}

/** Para las vistas de la Sunass: aplica un cambio a un expediente (avanzar un paso, emitir una resolución…). */
export function actualizarExpediente(codigoExpediente: string, cambiar: (e: ExpedienteFi) => ExpedienteFi): void {
  guardarExpedientes(leerExpedientes().map((e) => (e.codigoExpediente === codigoExpediente ? cambiar(e) : e)));
}

/** Escucha cambios de esta pestaña y de las demás (evento storage). Devuelve la función para dejar de escuchar. */
export function suscribirseACambios(alCambiar: () => void): () => void {
  const alCambiarAlmacen = (evento: StorageEvent) => {
    if (evento.key === CLAVE_ALMACEN || evento.key === null) alCambiar();
  };
  window.addEventListener("storage", alCambiarAlmacen);
  window.addEventListener(EVENTO_CAMBIO, alCambiar);
  return () => {
    window.removeEventListener("storage", alCambiarAlmacen);
    window.removeEventListener(EVENTO_CAMBIO, alCambiar);
  };
}

export function generarCodigoDemo(): string {
  const cantidad = leerExpedientes().filter((e) => e.codigoExpediente.startsWith("UFI-2026-D")).length;
  return `UFI-2026-D${String(cantidad + 1).padStart(3, "0")}`;
}

/** Vuelve a los expedientes iniciales de la demo (borra lo creado o avanzado en este navegador). */
export function restablecerDemo(): void {
  try {
    localStorage.removeItem(CLAVE_ALMACEN);
  } catch {
    /* sin almacenamiento: no hay nada que borrar */
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}
