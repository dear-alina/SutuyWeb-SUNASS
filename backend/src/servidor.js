import { crearApp } from "./app.js";
import { leerConfig } from "./config.js";

let config;
try {
  config = leerConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

// Express 5 pasa aquí el error al abrir el puerto.
crearApp(config).listen(config.PUERTO, (error) => {
  if (error) {
    const detalle =
      error.code === "EADDRINUSE"
        ? `El puerto ${config.PUERTO} ya está en uso. Cierre la otra instancia del backend o cambie PUERTO en backend/.env.`
        : error.message;
    console.error(`No se pudo iniciar la API: ${detalle}`);
    process.exit(1);
  }
  console.log(`API de SutuyWeb en http://localhost:${config.PUERTO}/api/v1`);
});
