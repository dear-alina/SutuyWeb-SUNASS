// Formatos para mostrar.

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Lima",
});

/** Instante ISO 8601 en UTC → dd/mm/aaaa en hora de Lima. */
export function formatearFecha(instante: string): string {
  return FORMATO_FECHA.format(new Date(instante));
}

const AREAS: Record<string, string> = {
  ep: "Empresa prestadora",
  dre: "DRE",
  srt: "SRT",
  equipo_srt: "Equipo SRT",
  oaj: "OAJ",
  du: "DU",
  gg: "Gerencia General",
  cd: "Consejo Directivo",
};

/** Código de área del catálogo → nombre para mostrar. */
export function nombrarArea(area: string | null): string {
  return area ? (AREAS[area] ?? area) : "";
}
