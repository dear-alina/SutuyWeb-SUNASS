import { reenviarAlCopiloto } from "@/servicios/copiloto/puente-servidor";

/** Estado del copiloto y documentos que tiene indexados. */
export async function GET() {
  return reenviarAlCopiloto("/salud", "GET");
}
