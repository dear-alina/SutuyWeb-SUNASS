const URL_API = process.env.NEXT_PUBLIC_API_URL ?? "";

// Error en formato RFC 9457 que devuelve el backend (contrato-api)
export type ErrorApi = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  codigo: string;
  trazaId?: string;
  errores?: { campo: string; mensaje: string }[];
};

export class ErrorDeApi extends Error {
  constructor(public readonly problema: ErrorApi) {
    super(problema.detail ?? problema.title);
  }
}

export async function solicitarApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${URL_API}${ruta}`, {
    ...opciones,
    credentials: "include", // la sesión viaja en una cookie httpOnly
    headers: { "Content-Type": "application/json", ...opciones.headers },
  });
  if (!respuesta.ok) {
    const esProblema = respuesta.headers.get("Content-Type")?.includes("application/problem+json");
    const problema: ErrorApi = esProblema
      ? await respuesta.json()
      : { title: "Error de conexión", status: respuesta.status, codigo: "error_desconocido" };
    throw new ErrorDeApi(problema);
  }
  return respuesta.status === 204 ? (undefined as T) : respuesta.json();
}
