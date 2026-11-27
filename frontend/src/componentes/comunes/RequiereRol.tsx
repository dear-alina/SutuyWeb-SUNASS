"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { obtenerRutaInicio } from "@/servicios/api/sesiones";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";

type Rol = "admin" | "sunass" | "eps";

export function RequiereRol({ roles, children }: { roles: Rol[]; children: React.ReactNode }) {
  const { perfil, estaCargando } = usarSesion();
  const router = useRouter();
  const tieneAcceso = !!perfil && roles.includes(perfil.rol);

  useEffect(() => {
    if (estaCargando || tieneAcceso) return;
    // Sin sesión: al ingreso. Con otro rol: a su propio inicio.
    router.replace(perfil ? obtenerRutaInicio(perfil) : "/ingreso");
  }, [estaCargando, tieneAcceso, perfil, router]);

  if (estaCargando || !tieneAcceso) {
    return <p role="status" className="cargando">Cargando…</p>;
  }
  return <>{children}</>;
}
