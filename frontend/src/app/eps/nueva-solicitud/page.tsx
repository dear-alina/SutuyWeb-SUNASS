"use client";

import { EncabezadoEps } from "@/componentes/eps/EncabezadoEps";
import { AsistenteNuevaSolicitud } from "@/componentes/eps/AsistenteNuevaSolicitud";

export default function PaginaNuevaSolicitud() {
  return (
    <div className="eps">
      <EncabezadoEps />
      <main className="eps__contenido eps__contenido--una-columna">
        <AsistenteNuevaSolicitud />
      </main>
    </div>
  );
}
