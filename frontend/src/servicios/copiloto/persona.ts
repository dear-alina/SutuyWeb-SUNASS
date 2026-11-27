import { USUARIOS_DEMO } from "@/demo/usuarios-demo";

/**
 * Identificador de la persona para el registro de decisiones del copiloto.
 * Con backend viene del perfil (usuarioId); en la demo, uno fijo por usuario ficticio.
 */
export function obtenerIdPersona(perfil: { usuarioId?: string; codigo: string } | null): string {
  if (perfil?.usuarioId) return perfil.usuarioId;
  const indice = Math.max(0, USUARIOS_DEMO.findIndex((u) => u.codigo === perfil?.codigo)) + 1;
  return `00000000-0000-4000-8000-${String(indice).padStart(12, "0")}`;
}

/** Nombre visible de quien registró una decisión (solo para los usuarios ficticios de la demo). */
export function nombrarPersona(id: string): string {
  const indice = Number(id.slice(-12)) - 1;
  const usuario = id.startsWith("00000000-0000-4000-8000-") ? USUARIOS_DEMO[indice] : undefined;
  return usuario ? `${usuario.cargo} (${usuario.nombre})` : "otra persona";
}
