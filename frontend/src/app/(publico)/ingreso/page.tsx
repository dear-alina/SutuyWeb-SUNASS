"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import "@/estilos/ingreso.css";
import { ErrorDeApi } from "@/servicios/api/cliente-api";
import { iniciarSesion, obtenerRutaInicio, type Institucion } from "@/servicios/api/sesiones";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";

const MENSAJE_CREDENCIALES = "El usuario o la clave no son correctos.";

function obtenerMensajeError(error: unknown): string {
  if (error instanceof ErrorDeApi) {
    if (error.problema.codigo === "credenciales_invalidas") return MENSAJE_CREDENCIALES;
    if (error.problema.codigo === "validacion_fallida") return "Complete todos los campos.";
    return error.problema.detail ?? "No se pudo iniciar sesión. Intente de nuevo.";
  }
  return "No hay conexión con el servidor. Intente de nuevo en unos minutos.";
}

export default function PaginaIngreso() {
  const router = useRouter();
  const { esModoDemo, ingresarDemo } = usarSesion();
  const [institucion, setInstitucion] = useState<Institucion>("sunass");
  const [ruc, setRuc] = useState("");
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [esClaveVisible, setEsClaveVisible] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [debeMostrarAvisoPruebas, setDebeMostrarAvisoPruebas] = useState(false);

  function cambiarInstitucion(nueva: Institucion) {
    setInstitucion(nueva);
    setMensajeError("");
  }

  async function enviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensajeError("");
    if (esModoDemo) {
      const usuarioDemo = ingresarDemo({ institucion, ruc, usuario, clave });
      if (!usuarioDemo) {
        setMensajeError(MENSAJE_CREDENCIALES); // no se indica cuál dato falló
        return;
      }
      router.push(obtenerRutaInicio(usuarioDemo));
      return;
    }
    try {
      const perfil = await iniciarSesion({ institucion, ruc: ruc.trim(), usuario: usuario.trim(), clave });
      router.push(obtenerRutaInicio(perfil));
    } catch (error) {
      setMensajeError(obtenerMensajeError(error)); // se conserva lo ingresado
    }
  }

  return (
    <main className="login">
      <section className="login__form">
        <h1 className="login__logo">
          <img className="login__logo-img" src="/logo-sutuyweb.jpg" alt="SutuyWeb" width={550} height={391} />
        </h1>

        <div className="login__tabs" role="tablist" aria-label="Institución">
          {(["sunass", "eps"] as const).map((opcion) => (
            <button
              key={opcion}
              type="button"
              role="tab"
              aria-selected={institucion === opcion}
              onClick={() => cambiarInstitucion(opcion)}
            >
              {opcion === "sunass" ? "Sunass" : "Empresa prestadora"}
            </button>
          ))}
        </div>

        <form className="login__campos" onSubmit={enviarFormulario} noValidate>
          {institucion === "eps" && (
            <label className="campo">
              <span>RUC de la empresa</span>
              <input value={ruc} onChange={(e) => setRuc(e.target.value)} inputMode="numeric" autoComplete="organization" required />
            </label>
          )}

          <label className="campo">
            <span>Usuario</span>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" required />
          </label>

          <label className="campo">
            <span>Clave</span>
            <span className="campo__clave">
              <input
                type={esClaveVisible ? "text" : "password"}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                autoComplete="current-password"
                required
                aria-describedby={mensajeError ? "error-ingreso" : undefined}
              />
              <button
                type="button"
                className="sw-iconbtn"
                onClick={() => setEsClaveVisible((valor) => !valor)}
                aria-label={esClaveVisible ? "Ocultar clave" : "Mostrar clave"}
              >
                <span className="ms" aria-hidden="true">{esClaveVisible ? "visibility_off" : "visibility"}</span>
              </button>
            </span>
          </label>

          {mensajeError && (
            <p id="error-ingreso" className="aviso-error" role="alert">{mensajeError}</p>
          )}

          <button className="boton login__entrar" type="submit">Ingresar</button>
        </form>

        <p className="login__linea">
          Prototipo con nombres ficticios ·{" "}
          <button type="button" className="login__enlace" onClick={() => setDebeMostrarAvisoPruebas((valor) => !valor)}>
            usuarios de prueba
          </button>
          {" · "}
          <a className="login__enlace" href="/solicitar-acceso">solicitar acceso</a>
        </p>

        {debeMostrarAvisoPruebas && (
          <p className="login__aviso" role="status">
            Los usuarios de prueba se entregan al equipo por un canal privado: no se publican en el repositorio.
          </p>
        )}
      </section>
    </main>
  );
}
