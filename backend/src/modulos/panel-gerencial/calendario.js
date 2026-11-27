// Días hábiles (TUO LPAG art. 134.1): lunes a viernes, sin feriados nacionales ni los días de "diasNoHabiles".
// El día 1 de un plazo es el hábil siguiente a la fecha de inicio. Las fechas son cadenas AAAA-MM-DD.

const sumarDias = (fecha, cantidad) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + cantidad);
  return d.toISOString().slice(0, 10);
};

function calcularPascua(anio) {
  const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Feriados nacionales del año: los mismos que usa el frontend (hoja Supuestos del diccionario de datos).
 * Con ellos, las 65 fechas límite de ds02_procedimientos coinciden con las calculadas.
 */
export function feriadosNacionales(anio) {
  const fechas = ["01-01", "05-01", "06-29", "07-28", "07-29", "08-30", "10-08", "11-01", "12-08", "12-25"].map((md) => `${anio}-${md}`);
  if (anio >= 2022) fechas.push(`${anio}-08-06`, `${anio}-12-09`);
  if (anio >= 2023) fechas.push(`${anio}-07-23`);
  if (anio >= 2024) fechas.push(`${anio}-06-07`);
  const pascua = calcularPascua(anio);
  fechas.push(sumarDias(pascua, -3), sumarDias(pascua, -2)); // Jueves y Viernes Santo
  return fechas;
}

/** Crea un calendario con los días no hábiles adicionales registrados en la base. */
export function crearCalendario(diasNoHabilesAdicionales = []) {
  const adicionales = new Set(diasNoHabilesAdicionales);
  const porAnio = new Map();
  const esFeriado = (fecha) => {
    const anio = Number(fecha.slice(0, 4));
    if (!porAnio.has(anio)) porAnio.set(anio, new Set(feriadosNacionales(anio)));
    return porAnio.get(anio).has(fecha) || adicionales.has(fecha);
  };

  const esDiaHabil = (fecha) => {
    const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    return dia !== 0 && dia !== 6 && !esFeriado(fecha);
  };

  /** Fecha en que vence un plazo de `cantidad` días hábiles contados desde `inicio`. */
  const sumarDiasHabiles = (inicio, cantidad) => {
    let fecha = inicio;
    while (!esDiaHabil(fecha)) fecha = sumarDias(fecha, 1);
    let restantes = cantidad;
    while (restantes > 0) {
      fecha = sumarDias(fecha, 1);
      if (esDiaHabil(fecha)) restantes--;
    }
    return fecha;
  };

  /** Días hábiles de `desde` (excluido) a `hasta` (incluido). Negativo si `hasta` es anterior. */
  const contarDiasHabiles = (desde, hasta) => {
    if (hasta < desde) return -contarDiasHabiles(hasta, desde);
    let cantidad = 0;
    for (let fecha = sumarDias(desde, 1); fecha <= hasta; fecha = sumarDias(fecha, 1)) if (esDiaHabil(fecha)) cantidad++;
    return cantidad;
  };

  return { esDiaHabil, sumarDiasHabiles, contarDiasHabiles };
}
