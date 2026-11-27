import "@/estilos/eps.css";
import "@/estilos/sunass.css";
import { RequiereRol } from "@/componentes/comunes/RequiereRol";

export default function LayoutSunass({ children }: { children: React.ReactNode }) {
  return <RequiereRol roles={["sunass"]}>{children}</RequiereRol>;
}
