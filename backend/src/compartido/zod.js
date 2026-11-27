// Zod con mensajes en español y soporte para OpenAPI.
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

z.config(z.locales.es());
extendZodWithOpenApi(z);

export { z };
