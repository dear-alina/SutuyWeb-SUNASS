"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { obtenerPerfil } from "@/servicios/api/sesiones";
import { buscarUsuarioDemo, verificarCredencialesDemo, type DatosIngresoDemo, type UsuarioDemo } from "@/demo/usuarios-demo";

const ES_MODO_DEMO = process.env.NEXT_PUBLIC_MODO_DEMO === "true";
const CLAVE_ALMACEN = "sutuy-usuario-demo";

type ValorSesion = {
  perfil: UsuarioDemo | null;
  estaCargando: boolean;
  esModoDemo: boolean;
  ingresarDemo: (datos: DatosIngresoDemo) => UsuarioDemo | null;
  salir: () => void;
};

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<UsuarioDemo | null>(null);
  const [estaCargando, setEstaCargando] = useState(true);

  useEffect(() => {
    if (ES_MODO_DEMO) {
      let codigo: string | null = null;
      try {
        codigo = sessionStorage.getItem(CLAVE_ALMACEN);
      } catch {
        codigo = null;
      }
      setPerfil(buscarUsuarioDemo(codigo));
      setEstaCargando(false);
      return;
    }
    // Sin modo demo: el backend define la sesión (cookie httpOnly, contrato-api)
    obtenerPerfil()
      .then((p) => setPerfil({ ...p, codigo: p.rol, usuario: "", ruc: null, nombre: p.codigoEps ?? p.area ?? p.rol, cargo: "" }))
      .catch(() => setPerfil(null))
      .finally(() => setEstaCargando(false));
  }, []);

  function ingresarDemo(datos: DatosIngresoDemo) {
    const usuario = verificarCredencialesDemo(datos);
    if (!usuario) return null;
    try {
      sessionStorage.setItem(CLAVE_ALMACEN, usuario.codigo);
    } catch {
      /* sin almacenamiento: la sesión dura hasta recargar */
    }
    setPerfil(usuario);
    return usuario;
  }

  function salir() {
    try {
      sessionStorage.removeItem(CLAVE_ALMACEN);
    } catch {
      /* nada que limpiar */
    }
    setPerfil(null);
  }

  return (
    <ContextoSesion.Provider value={{ perfil, estaCargando, esModoDemo: ES_MODO_DEMO, ingresarDemo, salir }}>
      {children}
    </ContextoSesion.Provider>
  );
}

export function usarSesion() {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error("usarSesion debe usarse dentro de ProveedorSesion");
  return valor;
}
