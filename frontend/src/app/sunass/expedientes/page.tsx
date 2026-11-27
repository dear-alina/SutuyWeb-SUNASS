"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usarExpedientesSunass } from "@/demo/usar-expedientes";
import { USUARIOS_DEMO } from "@/demo/usuarios-demo";
import { NOMBRE_AREA } from "@/demo/flujo-fi";
import { TEXTO_RESULTADO, obtenerHitoPendiente } from "@/demo/reglas-eps";
import { consultarDocumentosIndexados } from "@/servicios/copiloto/cliente-copiloto";
import { formatearFecha } from "@/utilidades/formatear-fecha";
import { EncabezadoSunass } from "@/componentes/sunass/EncabezadoSunass";

const nombreEps = (codigoEps: string) => USUARIOS_DEMO.find((u) => u.codigoEps === codigoEps)?.nombre ?? codigoEps;

export default function PaginaExpedientes() {
  const { expedientes } = usarExpedientesSunass();
  const [indexados, setIndexados] = useState<string[] | null>(null);
  const [copilotoApagado, setCopilotoApagado] = useState(false);

  useEffect(() => {
    consultarDocumentosIndexados()
      .then((r) => setIndexados(r.documentos))
      .catch(() => setCopilotoApagado(true));
  }, []);

  return (
    <div className="eps">
      <EncabezadoSunass />
      <main className="panel">
        <header className="panel__titulo">
          <h1>Expedientes</h1>
          <p>Uso excepcional del fondo de inversiones · revise cada expediente con el copiloto, que cita el documento y la página. Usted decide.</p>
        </header>
        {copilotoApagado && (
          <p className="aviso aviso--informacion" role="status">El copiloto no está disponible en este momento. Puede abrir los expedientes, pero sin sugerencias.</p>
        )}
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr><th scope="col">Expediente</th><th scope="col">Empresa prestadora</th><th scope="col">Presentado</th><th scope="col">Dónde está</th><th scope="col">Copiloto</th><th scope="col"><span className="sr-only">Acción</span></th></tr>
            </thead>
            <tbody>
              {expedientes.map((e) => {
                const pendiente = obtenerHitoPendiente(e);
                const tieneDocumentos = indexados?.some((d) => d.startsWith(e.codigoExpediente));
                return (
                  <tr key={e.codigoExpediente}>
                    <td><b>{e.codigoExpediente}</b></td>
                    <td>{nombreEps(e.codigoEps)}</td>
                    <td>{formatearFecha(e.fechaInicio)}</td>
                    <td>{pendiente ? NOMBRE_AREA[pendiente.area] ?? pendiente.area : TEXTO_RESULTADO[e.resultado ?? ""] ?? "Concluido"}</td>
                    <td>{indexados === null ? (copilotoApagado ? "—" : "…") : tieneDocumentos ? "Documentos indexados" : "Sin documentos indexados"}</td>
                    <td><Link className="boton boton--secundario" href={`/sunass/expedientes/${e.codigoExpediente}`}>Revisar con copiloto</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="actualizacion">Documentos ficticios de la hackatón · datos de demostración.</p>
      </main>
    </div>
  );
}
