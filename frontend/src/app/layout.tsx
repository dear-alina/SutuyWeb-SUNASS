import type { Metadata } from "next";
import "@/estilos/tokens.css";
import "@/estilos/globales.css";
import { ProveedorSesion } from "@/servicios/sesion/ContextoSesion";

export const metadata: Metadata = {
  title: "SutuyWeb · Seguimiento de trámites de las EPS",
  description: "Prototipo para el Hackathon Lideresas por el Agua. No es un servicio oficial de la Sunass.",
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body>
        <ProveedorSesion>{children}</ProveedorSesion>
      </body>
    </html>
  );
}
