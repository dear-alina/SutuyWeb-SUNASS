// Se ejecuta antes de las pruebas.
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

/** Aborta si la URL no es local. */
export function exigirLocal(nombre, valor) {
  let host;
  try {
    host = new URL(valor).hostname;
  } catch {
    throw new Error(`Pruebas abortadas: ${nombre} no es una URL válida.`);
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Pruebas abortadas: ${nombre} apunta a "${host}". Solo se permite la base local.`);
  }
}

exigirLocal("SUPABASE_URL", process.env.SUPABASE_URL);
exigirLocal("DATABASE_URL", process.env.DATABASE_URL);
