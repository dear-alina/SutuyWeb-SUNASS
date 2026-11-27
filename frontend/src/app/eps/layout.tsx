import "@/estilos/eps.css";
import { RequiereRol } from "@/componentes/comunes/RequiereRol";

export default function LayoutEps({ children }: { children: React.ReactNode }) {
  return <RequiereRol roles={["eps"]}>{children}</RequiereRol>;
}
