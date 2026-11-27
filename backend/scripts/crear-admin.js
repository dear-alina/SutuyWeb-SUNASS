// Crea un Admin. Uso: npm run crear-admin (pide correo y clave si no están en el entorno).
import { createInterface } from "node:readline/promises";
import { crearBd } from "../src/compartido/bd.js";
import { crearSupabase } from "../src/compartido/supabase.js";
import { leerConfig } from "../src/config.js";

async function preguntar(texto) {
  const consola = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await consola.question(texto);
  consola.close();
  return respuesta.trim();
}

const config = leerConfig();
const correo = (process.env.ADMIN_CORREO || (await preguntar("Correo del Admin: "))).toLowerCase();
const clave = process.env.ADMIN_CLAVE || (await preguntar("Clave (mínimo 8 caracteres): "));
const nombre = process.env.ADMIN_NOMBRE || "Administrador";

if (!/^[^@\s]+@[^@\s]+$/.test(correo)) {
  console.error("El correo no es válido.");
  process.exit(1);
}
if (clave.length < 8) {
  console.error("La clave debe tener al menos 8 caracteres.");
  process.exit(1);
}

const { secreto } = crearSupabase(config);
const bd = crearBd(config.DATABASE_URL);
const destino = new URL(config.SUPABASE_URL).hostname;
console.log(`Proyecto de Supabase: ${destino}`);

try {
  const { data, error } = await secreto.auth.admin.createUser({ email: correo, password: clave, email_confirm: true });
  if (error) {
    const yaExiste = error.code === "email_exists" || /already (been )?registered/i.test(error.message);
    console.error(
      yaExiste
        ? `Ya existe una cuenta con ${correo}. Para darle el rol admin use bd/scripts/promover-admin.sql.`
        : `No se pudo crear la cuenta: ${error.message}`,
    );
    process.exitCode = 1;
  } else {
    try {
      await bd.consultar(
        `insert into public.perfiles ("usuarioId", nombre, rol, area, "epsId", activo) values ($1, $2, 'admin', null, null, true)`,
        [data.user.id, nombre],
      );
      console.log(`Admin creado: ${correo}`);
    } catch (errorPerfil) {
      await secreto.auth.admin.deleteUser(data.user.id);
      console.error(`No se pudo crear el perfil (se deshizo la cuenta): ${errorPerfil.message}`);
      process.exitCode = 1;
    }
  }
} finally {
  await bd.cerrar();
}
