// Uso: npm run openapi  →  escribe backend/openapi.json
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { textoOpenApi } from "../src/openapi.js";

const destino = fileURLToPath(new URL("../openapi.json", import.meta.url));
writeFileSync(destino, textoOpenApi(), "utf8");
console.log(`OpenAPI generado en ${destino}`);
