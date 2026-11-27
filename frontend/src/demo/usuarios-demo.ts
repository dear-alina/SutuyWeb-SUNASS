import type { Institucion, Perfil } from "@/servicios/api/sesiones";

export type UsuarioDemo = Perfil & {
  codigo: string;
  usuario: string;
  ruc: string | null; // solo EP
  nombre: string;
  cargo: string;
};

// Personas, usuarios y RUC ficticios. La clave se lee de NEXT_PUBLIC_CLAVE_DEMO (.env.local, no se sube).
export const USUARIOS_DEMO: UsuarioDemo[] = [
  { codigo: "eps07", usuario: "gg.eps07", ruc: "20500000007", nombre: "EPS Aguas del Valle Alto S.A.", cargo: "Gerencia General", rol: "eps", area: null, codigoEps: "EPS07", proveedor: "correo" },
  { codigo: "eps16", usuario: "gg.eps16", ruc: "20500000016", nombre: "EPS Cascada S.A.", cargo: "Gerencia General", rol: "eps", area: null, codigoEps: "EPS16", proveedor: "correo" },
  { codigo: "dre", usuario: "dre", ruc: null, nombre: "Dirección de Regulación Económica", cargo: "Director(a) DRE", rol: "sunass", area: "dre", codigoEps: null, proveedor: "correo" },
  { codigo: "srt", usuario: "srt", ruc: null, nombre: "Subdirección de Regulación Tarifaria", cargo: "Subdirector(a) SRT", rol: "sunass", area: "srt", codigoEps: null, proveedor: "correo" },
  { codigo: "equipo_srt", usuario: "especialista.srt", ruc: null, nombre: "Equipo SRT", cargo: "Especialista SRT", rol: "sunass", area: "equipo_srt", codigoEps: null, proveedor: "correo" },
  { codigo: "oaj", usuario: "oaj", ruc: null, nombre: "Oficina de Asesoría Jurídica", cargo: "Abogado(a) OAJ", rol: "sunass", area: "oaj", codigoEps: null, proveedor: "correo" },
  { codigo: "gg", usuario: "gg", ruc: null, nombre: "Gerencia General", cargo: "Gerente(a) General", rol: "sunass", area: "gg", codigoEps: null, proveedor: "correo" },
  { codigo: "cd", usuario: "cd", ruc: null, nombre: "Consejo Directivo", cargo: "Consejo Directivo", rol: "sunass", area: "cd", codigoEps: null, proveedor: "correo" },
];

export type DatosIngresoDemo = { institucion: Institucion; ruc: string; usuario: string; clave: string };

export function verificarCredencialesDemo(datos: DatosIngresoDemo): UsuarioDemo | null {
  const claveDemo = process.env.NEXT_PUBLIC_CLAVE_DEMO;
  if (!claveDemo || datos.clave !== claveDemo) return null;
  const usuario = datos.usuario.trim().toLowerCase();
  return (
    USUARIOS_DEMO.find(
      (u) =>
        u.usuario === usuario &&
        (datos.institucion === "eps" ? u.rol === "eps" && u.ruc === datos.ruc.trim() : u.rol !== "eps"),
    ) ?? null
  );
}

export function buscarUsuarioDemo(codigo: string | null): UsuarioDemo | null {
  return USUARIOS_DEMO.find((u) => u.codigo === codigo) ?? null;
}
