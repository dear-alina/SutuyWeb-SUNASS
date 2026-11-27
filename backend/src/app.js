import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { crearBd } from "./compartido/bd.js";
import { protegerCsrf, trazar } from "./compartido/middleware.js";
import { Problema, manejarErrores } from "./compartido/problema.js";
import { crearSupabase } from "./compartido/supabase.js";
import { rutasSesiones } from "./modulos/sesiones/rutas.js";
import { rutasSolicitudesAcceso } from "./modulos/solicitudes-acceso/rutas.js";

/** Crea la app sin abrir el puerto (lo usan las pruebas). */
export function crearApp(config, { limites = {} } = {}) {
  const contexto = { config, bd: crearBd(config.DATABASE_URL), supabase: crearSupabase(config) };
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
  app.use(trazar);
  app.use(helmet());
  app.use(
    cors({
      origin: (origen, responder) => responder(null, !origen || config.ORIGENES_PERMITIDOS.includes(origen)),
      credentials: true,
      exposedHeaders: ["X-Traza-Id"],
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", protegerCsrf(config.ORIGENES_PERMITIDOS));

  const api = express.Router();
  api.use(rutasSesiones(contexto, { limiteIngresos: limites.ingresos ?? 10 }));
  api.use(rutasSolicitudesAcceso(contexto, { limiteRegistros: limites.registros ?? 5 }));
  app.use("/api/v1", api);

  app.use(() => {
    throw new Problema(404, "ruta_no_encontrada", "Ruta no encontrada", "La ruta solicitada no existe.");
  });
  app.use(manejarErrores);

  app.locals.contexto = contexto;
  return app;
}
