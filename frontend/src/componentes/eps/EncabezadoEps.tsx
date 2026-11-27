"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import { FECHA_CORTE } from "@/demo/expedientes-demo";
import { formatearFecha } from "@/utilidades/formatear-fecha";
import type { NotificacionEps } from "@/demo/reglas-eps";
import { CampanaNotificaciones } from "./CampanaNotificaciones";

type Props = {
  notificaciones?: NotificacionEps[];
  alElegirNotificacion?: (codigoExpediente: string) => void;
};

export function EncabezadoEps({ notificaciones = [], alElegirNotificacion = () => {} }: Props) {
  const { perfil, esModoDemo, salir } = usarSesion();
  const router = useRouter();

  return (
    <>
      {esModoDemo && (
        <p className="banda-demo" role="note">
          Prototipo para el Hackathon Lideresas por el Agua · datos sintéticos al {formatearFecha(FECHA_CORTE)} · no es un servicio oficial de la Sunass
        </p>
      )}
      <header className="eps-barra">
        {/* Panel blanco con corte diagonal; la franja verde hoja asoma por detrás */}
        <div className="eps-barra__lado">
          <Link href="/eps/tramites" className="eps-barra__marca">
            <img src="/logo-sutuyweb-horizontal.png" alt="SutuyWeb, ir a mis solicitudes" width={800} height={412} />
          </Link>
        </div>

        <div className="eps-barra__identidad">
          <span className="eps-barra__empresa">{perfil?.nombre}</span>
        </div>

        <div className="eps-barra__acciones">
          <CampanaNotificaciones notificaciones={notificaciones} alElegir={alElegirNotificacion} />
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
