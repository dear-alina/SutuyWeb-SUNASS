"use client";

import { useParams } from "next/navigation";
import { usarExpedientesSunass } from "@/demo/usar-expedientes";
import { USUARIOS_DEMO } from "@/demo/usuarios-demo";
import { EncabezadoSunass } from "@/componentes/sunass/EncabezadoSunass";
import { EvaluarConCopiloto } from "@/componentes/sunass/EvaluarConCopiloto";

export default function PaginaExpedienteCopiloto() {
  const { codigo } = useParams<{ codigo: string }>();
  const { expedientes, actualizadoEn } = usarExpedientesSunass();
  const expediente = expedientes.find((e) => e.codigoExpediente === codigo);
  const nombreEps = expediente ? USUARIOS_DEMO.find((u) => u.codigoEps === expediente.codigoEps)?.nombre ?? expediente.codigoEps : "";

  return (
    <div className="eps">
      <EncabezadoSunass />
      {expediente ? (
        <EvaluarConCopiloto key={expediente.codigoExpediente} expediente={expediente} nombreEps={nombreEps} />
      ) : (
        <main className="panel"><p className="sunass__vacio" role="status">{actualizadoEn ? `No se encontró el expediente ${codigo}.` : "Cargando…"}</p></main>
      )}
    </div>
  );
}
