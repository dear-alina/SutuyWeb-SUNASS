/**
 * Lectura de CSV en el navegador para el panel gerencial (los datos no salen del equipo).
 * Admite comillas, saltos CRLF y el «;» final que traen algunas filas del dataset ds02.
 * En el MVP la carga la hace el backend (ETL), con su propio registro de validación.
 */
export type FilaCsv = Record<string, string>;

/** Lee el archivo en UTF-8 y, si no es UTF-8 válido, en Windows-1252 (algunos CSV del concurso vienen así). */
export async function leerTextoArchivo(archivo: File): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function separarLinea(linea: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (entreComillas) {
      if (c === '"' && linea[i + 1] === '"') { actual += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else actual += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ",") { campos.push(actual); actual = ""; }
    else actual += c;
  }
  campos.push(actual);
  return campos.map((x) => x.trim());
}

export function analizarCsv(texto: string): FilaCsv[] {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.replace(/;+\s*$/, "")).filter((l) => l.trim() !== "");
  if (lineas.length === 0) return [];
  const columnas = separarLinea(lineas[0]);
  return lineas.slice(1).map((linea) => {
    let valores = separarLinea(linea);
    // Algunas filas del dataset vienen enteras entre comillas: se vuelven a separar por dentro
    if (valores.length === 1 && columnas.length > 1) valores = separarLinea(valores[0]);
    return Object.fromEntries(columnas.map((c, i) => [c, valores[i] ?? ""]));
  });
}
