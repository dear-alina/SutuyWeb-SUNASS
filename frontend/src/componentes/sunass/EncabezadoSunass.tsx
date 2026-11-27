"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import { FECHA_CORTE } from "@/demo/expedientes-demo";
import { formatearFecha } from "@/utilidades/formatear-fecha";
import { restablecerDemo } from "@/demo/almacen-expedientes";

/** Misma cabecera que la EP (panel blanco con diagonal y franja verde hoja), con el área y el cargo. */
export function EncabezadoSunass() {
  const { perfil, esModoDemo, salir } = usarSesion();
  const router = useRouter();
  const ruta = usePathname();

  return (
    <>
      {esModoDemo && (
        <p className="banda-demo" role="note">
          Prototipo para el Hackathon Lideresas por el Agua · datos sintéticos al {formatearFecha(FECHA_CORTE)} · no es un servicio oficial de la Sunass
          {" · "}
          <button type="button" className="banda-demo__boton" onClick={() => {
            if (window.confirm("¿Volver a los expedientes iniciales de la demo? Se borran las solicitudes y avances hechos en este navegador.")) restablecerDemo();
          }}>Restablecer datos de la demo</button>
        </p>
      )}
      <header className="eps-barra">
        <div className="eps-barra__lado">
          <Link href="/sunass/inicio" className="eps-barra__marca">
            <img src="/logo-sutuyweb-horizontal.png" alt="SutuyWeb, ir a mi bandeja" width={800} height={412} />
          </Link>
        </div>

        <div className="eps-barra__identidad">
          <span className="eps-barra__empresa">{perfil?.nombre}</span>
          <span className="eps-barra__cargo">{perfil?.cargo} · Sunass</span>
        </div>

        <div className="eps-barra__acciones">
          <nav aria-label="Secciones" className="eps-barra__navegacion">
            <Link href="/sunass/inicio" aria-current={ruta === "/sunass/inicio" ? "page" : undefined}>
              <span className="ms" aria-hidden="true">inbox</span> Bandeja
            </Link>
            <Link href="/sunass/expedientes" aria-current={ruta.startsWith("/sunass/expedientes") ? "page" : undefined}>
              <span className="ms" aria-hidden="true">folder_open</span> Expedientes
            </Link>
            <Link href="/sunass/panel" aria-current={ruta === "/sunass/panel" ? "page" : undefined}>
              <span className="ms" aria-hidden="true">monitoring</span> Panel gerencial
            </Link>
          </nav>
          <span className="eps-barra__separador" aria-hidden="true" />
          <button
            type="button"
            className="eps-barra__salir"
            onClick={() => {
              salir();
              router.replace("/ingreso");
            }}
          >
            <span className="ms" aria-hidden="true">logout</span>
            Salir
          </button>
        </div>
      </header>
    </>
  );
}
