"use client";

import { useEffect, useState } from "react";
import type { ExpedienteFi } from "./expedientes-demo";
import { leerExpedientes, suscribirseACambios } from "./almacen-expedientes";

/** Expedientes de una EPS, actualizados en cuanto cambian (en esta pestaña o en otra). */
export function usarExpedientesEps(codigoEps: string | null | undefined) {
  const [expedientes, setExpedientes] = useState<ExpedienteFi[]>([]);
  const [actualizadoEn, setActualizadoEn] = useState<Date | null>(null);

  useEffect(() => {
    if (!codigoEps) return;
    const cargar = () => {
      setExpedientes(leerExpedientes().filter((e) => e.codigoEps === codigoEps));
      setActualizadoEn(new Date());
    };
    cargar();
    return suscribirseACambios(cargar);
  }, [codigoEps]);

  return { expedientes, actualizadoEn };
}
