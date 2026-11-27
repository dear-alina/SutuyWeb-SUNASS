import type { Institucion } from "@/servicios/api/sesiones";
import { USUARIOS_DEMO } from "@/demo/usuarios-demo";

export type CuentaDemo = { etiqueta: string; institucion: Institucion; ruc: string; usuario: string };

// Demo sin backend: usuarios en el navegador (src/demo/usuarios-demo.ts).
export const ES_DEMO_SIN_BACKEND = process.env.NEXT_PUBLIC_DEMO_SIN_BACKEND === "true";
const ES_DEMO_CON_BACKEND = process.env.NEXT_PUBLIC_MODO_DEMO === "true";

/** Vacía si ningún modo demo está activo. */
export const CLAVE_DEMO = ES_DEMO_SIN_BACKEND || ES_DEMO_CON_BACKEND ? (process.env.NEXT_PUBLIC_CLAVE_DEMO ?? "") : "";

export const estaModoDemoActivo = CLAVE_DEMO.length > 0;

// Cuentas del backend; deben coincidir con backend/scripts/crear-cuentas-demo.js.
const CUENTAS_BACKEND: CuentaDemo[] = [
  { etiqueta: "Administrador", institucion: "sunass", ruc: "", usuario: "admin@demo.sutuyweb.test" },
  { etiqueta: "Especialista DRE (Sunass)", institucion: "sunass", ruc: "", usuario: "dre@demo.sutuyweb.test" },
  { etiqueta: "EPS02 · EPS Manantial S.A.", institucion: "eps", ruc: "99000000002", usuario: "eps02@demo.sutuyweb.test" },
  { etiqueta: "EPS07 · expediente UFI-2026-0001", institucion: "eps", ruc: "99000000007", usuario: "eps07@demo.sutuyweb.test" },
];

export const CUENTAS_DEMO: CuentaDemo[] = ES_DEMO_SIN_BACKEND
  ? USUARIOS_DEMO.map((u) => ({
      etiqueta: `${u.cargo} · ${u.nombre}`,
      institucion: u.rol === "eps" ? "eps" : "sunass",
      ruc: u.ruc ?? "",
      usuario: u.usuario,
    }))
  : CUENTAS_BACKEND;
