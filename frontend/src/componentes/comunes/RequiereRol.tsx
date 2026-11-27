"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";

type Rol = "admin" | "sunass" | "eps";

export function RequiereRol({ roles, children }: { roles: Rol[]; children: React.ReactNode }) {
  const { perfil, estaCargando } = usarSesion();
  const router = useRouter();
  const tieneAcceso = !!perfil && roles.includes(perfil.rol);

  useEffect(() => {
    if (!estaCargando && !tieneAcceso) router.replace("/ingreso");
  }, [estaCargando, tieneAcceso, router]);

  if (estaCargando || !tieneAcceso) {
    return <p role="status" className="cargando">Cargando…</p>;
  }
  return <>{children}</>;
}
