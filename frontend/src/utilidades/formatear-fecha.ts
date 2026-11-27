/** Fecha civil AAAA-MM-DD → dd/mm/aaaa (texto que lee una persona, convenciones.md). */
export function formatearFecha(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

export function formatearMonto(monto: number | null | undefined): string {
  if (monto == null) return "—";
  return `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function textoDiasHabiles(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "día hábil" : "días hábiles"}`;
}
