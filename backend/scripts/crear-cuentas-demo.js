// Crea o actualiza las cuentas demo con CLAVE_DEMO. Debe coincidir con frontend/src/utilidades/cuentas-demo.ts.
import { crearBd } from "../src/compartido/bd.js";
import { crearSupabase } from "../src/compartido/supabase.js";
import { leerConfig } from "../src/config.js";

export const CUENTAS_DEMO = [
  { correo: "admin@demo.sutuyweb.test", nombre: "Administración (demo)", cargo: null, rol: "admin", area: null, codigoEps: null },
  { correo: "dre@demo.sutuyweb.test", nombre: "Especialista DRE (demo)", cargo: "Especialista", rol: "sunass", area: "dre", codigoEps: null },
  { correo: "eps02@demo.sutuyweb.test", nombre: "Usuario EPS02 (demo)", cargo: "Gerencia General", rol: "eps", area: "ep", codigoEps: "EPS02" },
  { correo: "eps07@demo.sutuyweb.test", nombre: "Usuario EPS07 (demo)", cargo: "Gerencia General", rol: "eps", area: "ep", codigoEps: "EPS07" },
];

const config = leerConfig();
const clave = process.env.CLAVE_DEMO ?? "";
if (clave.length < 8) {
  console.error("Defina CLAVE_DEMO en backend/.env (al menos 8 caracteres). No la suba al repositorio.");
  process.exit(1);
}

const { secreto } = crearSupabase(config);
const bd = crearBd(config.DATABASE_URL);
console.log(`Proyecto de Supabase: ${new URL(config.SUPABASE_URL).hostname}`);

try {
  for (const cuenta of CUENTAS_DEMO) {
    const existente = await bd.consultar("select id from auth.users where lower(email) = $1", [cuenta.correo]);
    let usuarioId = existente.rows[0]?.id;

    if (usuarioId) {
      const { error } = await secreto.auth.admin.updateUserById(usuarioId, { password: clave, email_confirm: true });
      if (error) throw new Error(`${cuenta.correo}: ${error.message}`);
    } else {
      const { data, error } = await secreto.auth.admin.createUser({ email: cuenta.correo, password: clave, email_confirm: true });
      if (error) throw new Error(`${cuenta.correo}: ${error.message}`);
      usuarioId = data.user.id;
    }

    await bd.consultar(
      `insert into public.perfiles ("usuarioId", nombre, cargo, rol, area, "epsId", proveedor, activo)
       values ($1, $2, $3, $4, $5, (select "epsId" from public.eps where "codigoEps" = $6), 'correo', true)
       on conflict ("usuarioId") do update
         set nombre = excluded.nombre, cargo = excluded.cargo, rol = excluded.rol, area = excluded.area,
             "epsId" = excluded."epsId", activo = true`,
      [usuarioId, cuenta.nombre, cuenta.cargo, cuenta.rol, cuenta.area, cuenta.codigoEps],
    );
    console.log(`  ✓ ${cuenta.correo} (${cuenta.rol}${cuenta.codigoEps ? ` · ${cuenta.codigoEps}` : ""})`);
  }
  console.log("Cuentas de demostración listas.");
} catch (error) {
  console.error(`No se pudieron preparar las cuentas: ${error.message}`);
  process.exitCode = 1;
} finally {
  await bd.cerrar();
}
