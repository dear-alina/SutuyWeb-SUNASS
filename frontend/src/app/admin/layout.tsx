import type { ReactNode } from "react";
import "@/estilos/app.css";
import Encabezado from "@/componentes/comunes/Encabezado";
import { RequiereRol } from "@/componentes/comunes/RequiereRol";

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return (
    <RequiereRol roles={["admin"]}>
      <a className="saltar-contenido" href="#contenido">Saltar al contenido</a>
      <Encabezado />
      <main className="contenido" id="contenido" tabIndex={-1}>
        {children}
      </main>
    </RequiereRol>
  );
}
