/**
 * Especialistas del equipo SRT para la DEMO. Personas ficticias: la composición real de los equipos está por confirmar.
 * La asignación la hace la SRT en el paso «asignacion» del flujograma del FI.
 * Criterio de sugerencia: menor carga de trabajo (no hay base normativa para asignar por zona).
 */
import type { ExpedienteFi } from "./expedientes-demo";

export type RolEquipo = "verifica_tupa" | "evalua_informa";

export const TEXTO_ROL: Record<RolEquipo, string> = {
  verifica_tupa: "Verifica los requisitos del TUPA",
  evalua_informa: "Evalúa el caso y elabora el informe",
};

export type Especialista = { codigo: string; nombre: string; especialidad: string; rol: RolEquipo };

export const ESPECIALISTAS_DEMO: Especialista[] = [
  { codigo: "esp01", nombre: "Lucía Ramos Vega", especialidad: "Especialista tarifaria", rol: "verifica_tupa" },
  { codigo: "esp02", nombre: "Martín Paredes Soto", especialidad: "Especialista en inversiones", rol: "evalua_informa" },
  { codigo: "esp03", nombre: "Elena Cárdenas Ruiz", especialidad: "Especialista tarifaria", rol: "verifica_tupa" },
  { codigo: "esp04", nombre: "Jorge Salinas Quispe", especialidad: "Especialista en inversiones", rol: "evalua_informa" },
];

export type IntegranteEquipo = { codigo: string; nombre: string; rol: RolEquipo };

/** Expedientes en curso que ya tiene asignados cada especialista. */
export function calcularCarga(expedientes: ExpedienteFi[]): Record<string, number> {
  const carga: Record<string, number> = Object.fromEntries(ESPECIALISTAS_DEMO.map((e) => [e.codigo, 0]));
  for (const e of expedientes) {
    if (e.estado !== "en_tramite") continue;
    for (const integrante of e.equipoAsignado ?? []) carga[integrante.codigo] = (carga[integrante.codigo] ?? 0) + 1;
  }
  return carga;
}

/** Sugerencia: por cada rol, el especialista con menos expedientes en curso. */
export function sugerirEquipo(carga: Record<string, number>): string[] {
  return (Object.keys(TEXTO_ROL) as RolEquipo[]).map((rol) =>
    ESPECIALISTAS_DEMO.filter((e) => e.rol === rol).sort((a, b) => (carga[a.codigo] ?? 0) - (carga[b.codigo] ?? 0))[0].codigo,
  );
}
