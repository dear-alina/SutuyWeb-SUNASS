"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { cerrarSesion, obtenerPerfil, type Perfil } from "@/servicios/api/sesiones";
import { buscarUsuarioDemo, verificarCredencialesDemo, type DatosIngresoDemo, type UsuarioDemo } from "@/demo/usuarios-demo";
import { ES_DEMO_SIN_BACKEND, estaModoDemoActivo } from "@/utilidades/cuentas-demo";
import { nombrarArea } from "@/utilidades/formatear";

const CLAVE_ALMACEN = "sutuy-usuario-demo";

type ValorSesion = {
  perfil: UsuarioDemo | null;
  estaCargando: boolean;
  esModoDemo: boolean;
  esDemoSinBackend: boolean;
  ingresarDemo: (datos: DatosIngresoDemo) => UsuarioDemo | null;
  establecerPerfil: (perfil: Perfil) => UsuarioDemo;
  salir: () => Promise<void>;
};

const ContextoSesion = createContext<ValorSesion | null>(null);

// Adapta el perfil del backend a la forma que usan las vistas.
function desdeApi(p: Perfil): UsuarioDemo {
  const organizacion = p.rol === "eps" ? (p.nombreEps ?? p.codigoEps) : p.rol === "admin" ? "Administración" : nombrarArea(p.area);
  return { ...p, codigo: p.rol, usuario: p.correo ?? "", ruc: null, nombre: organizacion || p.nombre, cargo: p.cargo ?? p.nombre };
}

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<UsuarioDemo | null>(null);
  const [estaCargando, setEstaCargando] = useState(true);

  useEffect(() => {
    if (ES_DEMO_SIN_BACKEND) {
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
    // Con backend: la sesión vive en la cookie httpOnly.
    obtenerPerfil()
      .then((p) => setPerfil(desdeApi(p)))
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

  function establecerPerfil(p: Perfil) {
    const adaptado = desdeApi(p);
    setPerfil(adaptado);
    return adaptado;
  }

  async function salir() {
    if (ES_DEMO_SIN_BACKEND) {
      try {
        sessionStorage.removeItem(CLAVE_ALMACEN);
      } catch {
        /* nada que limpiar */
      }
    } else {
      await cerrarSesion().catch(() => {});
    }
    setPerfil(null);
  }

  return (
    <ContextoSesion.Provider
      value={{
        perfil,
        estaCargando,
        esModoDemo: estaModoDemoActivo,
        esDemoSinBackend: ES_DEMO_SIN_BACKEND,
        ingresarDemo,
        establecerPerfil,
        salir,
      }}
    >
      {children}
    </ContextoSesion.Provider>
  );
}

export function usarSesion() {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error("usarSesion debe usarse dentro de ProveedorSesion");
  return valor;
}
