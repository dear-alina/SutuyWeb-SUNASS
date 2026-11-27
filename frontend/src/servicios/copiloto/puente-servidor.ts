/**
 * Puente hacia el copiloto (servicio de IA de Thayli, carpeta copiloto/ en main). SOLO SE EJECUTA EN EL SERVIDOR DE NEXT.
 *
 * El copiloto exige un token de servicio (Authorization: Bearer) y el rol X-Rol. El token NUNCA va al navegador:
 * vive en COPILOTO_TOKEN_SERVICIO, una variable sin el prefijo NEXT_PUBLIC_ (frontend/.env.local, que no se sube).
 *
 * En el MVP este puente lo hace el backend, que valida la cookie de sesión y el área (equipo SRT).
 * Aquí solo se habilita en la demo sin backend, para el pitch en una computadora local.
 */
const URL_COPILOTO = process.env.COPILOTO_URL ?? "http://localhost:8765/v1";
const TOKEN = process.env.COPILOTO_TOKEN_SERVICIO ?? "";
const ESTA_HABILITADO = process.env.NEXT_PUBLIC_DEMO_SIN_BACKEND === "true" && TOKEN.length > 0;
const TAMANO_MAXIMO_CUERPO = 20_000; // bytes
const ESPERA_MAXIMA_MS = 60_000; // con modelo local (Ollama) puede tardar

export const CODIGO_EXPEDIENTE_VALIDO = /^[A-Z]{2,4}-\d{4}-[A-Z]?\d{3,4}$/;

function problema(status: number, codigo: string, detalle: string) {
  return Response.json(
    { type: `urn:sunass:error:${codigo}`, title: "No se pudo usar el copiloto", status, detail: detalle, codigo },
    { status, headers: { "content-type": "application/problem+json; charset=utf-8" } },
  );
}

/** Reenvía la llamada al copiloto con el token de servicio. `ruta` empieza con «/». */
export async function reenviarAlCopiloto(ruta: string, metodo: "GET" | "POST", cuerpo?: string): Promise<Response> {
  if (!ESTA_HABILITADO) {
    return problema(503, "copiloto_no_configurado", "El copiloto no está configurado en este equipo (falta COPILOTO_TOKEN_SERVICIO o el modo demo sin backend).");
  }
  if (cuerpo && new TextEncoder().encode(cuerpo).length > TAMANO_MAXIMO_CUERPO) {
    return problema(413, "cuerpo_demasiado_grande", "La solicitud al copiloto es demasiado grande.");
  }
  try {
    const respuesta = await fetch(`${URL_COPILOTO}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${TOKEN}`, "X-Rol": "sunass", "Content-Type": "application/json" },
      body: cuerpo,
      signal: AbortSignal.timeout(ESPERA_MAXIMA_MS),
      cache: "no-store",
    });
    const texto = await respuesta.text();
    return new Response(texto, {
      status: respuesta.status,
      headers: { "content-type": respuesta.headers.get("content-type") ?? "application/json; charset=utf-8" },
    });
  } catch {
    return problema(502, "copiloto_no_disponible", "El copiloto no responde. Verifique que esté encendido (python servidor.py).");
  }
}

export { problema as responderProblema };
