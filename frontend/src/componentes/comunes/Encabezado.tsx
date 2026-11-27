"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerRutaInicio } from "@/servicios/api/sesiones";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";

/** Encabezado del Admin con el usuario y «Cerrar sesión». */
export default function Encabezado() {
  const { perfil, salir } = usarSesion();
  const router = useRouter();
  const [estaCerrando, setEstaCerrando] = useState(false);

  async function cerrar() {
    setEstaCerrando(true);
    await salir();
    router.replace("/ingreso");
  }

  if (!perfil) return null;
  return (
    <header className="encabezado">
      <a className="encabezado__marca" href={obtenerRutaInicio(perfil)}>
        <img src="/logo-sutuyweb.jpg" alt="SutuyWeb, ir al inicio" width={84} height={60} />
      </a>
      <p className="encabezado__usuario">
        <span className="encabezado__nombre">{perfil.cargo}</span>
        <span className="encabezado__detalle">{perfil.nombre}</span>
      </p>
      <button type="button" className="boton boton--secundario" onClick={cerrar} disabled={estaCerrando}>
        <span className="ms" aria-hidden="true">logout</span>
        {estaCerrando ? "Cerrando…" : "Cerrar sesión"}
      </button>
    </header>
  );
}
