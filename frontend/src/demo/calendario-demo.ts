/**
 * Días hábiles para la DEMO (en el MVP los calcula el backend).
 * Lunes a viernes sin feriados nacionales (hoja Supuestos del diccionario; LPAG TUO 2026, art. 134.1).
 * El día 1 es el hábil siguiente a la fecha de inicio. No incluye feriados regionales.
 */
const sumarDias = (fecha: string, cantidad: number): string => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + cantidad);
  return d.toISOString().slice(0, 10);
};

function calcularPascua(anio: number): string {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const FERIADOS_NACIONALES: ReadonlySet<string> = (() => {
  const feriados = new Set<string>();
  for (let anio = 2020; anio <= 2028; anio++) {
    ["01-01", "05-01", "06-29", "07-28", "07-29", "08-30", "10-08", "11-01", "12-08", "12-25"].forEach((md) => feriados.add(`${anio}-${md}`));
    if (anio >= 2022) { feriados.add(`${anio}-08-06`); feriados.add(`${anio}-12-09`); }
    if (anio >= 2023) feriados.add(`${anio}-07-23`);
    if (anio >= 2024) feriados.add(`${anio}-06-07`);
    const pascua = calcularPascua(anio);
    feriados.add(sumarDias(pascua, -3)); // jueves santo
    feriados.add(sumarDias(pascua, -2)); // viernes santo
  }
  return feriados;
})();

export function esDiaHabil(fecha: string): boolean {
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return diaSemana !== 0 && diaSemana !== 6 && !FERIADOS_NACIONALES.has(fecha);
}

export function sumarDiasHabiles(inicio: string, cantidad: number): string {
  let fecha = inicio;
  while (!esDiaHabil(fecha)) fecha = sumarDias(fecha, 1);
  let restantes = cantidad;
  while (restantes > 0) {
    fecha = sumarDias(fecha, 1);
    if (esDiaHabil(fecha)) restantes--;
  }
  return fecha;
}

/** Días hábiles de `desde` (excluido) a `hasta` (incluido). Negativo si `hasta` es anterior. */
export function contarDiasHabiles(desde: string, hasta: string): number {
  if (hasta < desde) return -contarDiasHabiles(hasta, desde);
  let cantidad = 0;
  for (let fecha = sumarDias(desde, 1); fecha <= hasta; fecha = sumarDias(fecha, 1)) if (esDiaHabil(fecha)) cantidad++;
  return cantidad;
}
