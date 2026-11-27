import { createClient } from "@supabase/supabase-js";

const opcionesServidor = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

/** publico(): cliente nuevo por petición. secreto: solo para la Admin API de Auth. */
export function crearSupabase(config) {
  return {
    publico: () => createClient(config.SUPABASE_URL, config.SUPABASE_CLAVE_PUBLICA, opcionesServidor),
    secreto: createClient(config.SUPABASE_URL, config.SUPABASE_CLAVE_SECRETA, opcionesServidor),
  };
}
