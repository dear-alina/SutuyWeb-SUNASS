"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import "@/estilos/ingreso.css";
import "@/estilos/app.css";
import { ErrorDeApi } from "@/servicios/api/cliente-api";
import { iniciarSesion, obtenerRutaInicio, type Institucion } from "@/servicios/api/sesiones";
import { usarSesion } from "@/servicios/sesion/ContextoSesion";
import { CLAVE_DEMO, CUENTAS_DEMO, estaModoDemoActivo } from "@/utilidades/cuentas-demo";
import { obtenerMensajeDeError } from "@/utilidades/mensajes-error";

function obtenerMensajeError(error: unknown): string {
  if (error instanceof ErrorDeApi && error.problema.codigo === "validacion_fallida") return "Complete todos los campos.";
  return obtenerMensajeDeError(error, "No se pudo iniciar sesión. Intente de nuevo.");
}

export default function PaginaIngreso() {
  const router = useRouter();
  const { esDemoSinBackend, ingresarDemo, establecerPerfil } = usarSesion();
  // Modo demo: empieza con la primera cuenta.
  const cuentaInicial = estaModoDemoActivo ? CUENTAS_DEMO[0] : null;
  const [indiceCuentaDemo, setIndiceCuentaDemo] = useState(0);
  const [institucion, setInstitucion] = useState<Institucion>(cuentaInicial?.institucion ?? "sunass");
  const [ruc, setRuc] = useState(cuentaInicial?.ruc ?? "");
  const [usuario, setUsuario] = useState(cuentaInicial?.usuario ?? "");
  const [clave, setClave] = useState(cuentaInicial ? CLAVE_DEMO : "");
  const [esClaveVisible, setEsClaveVisible] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [debeMostrarAvisoPruebas, setDebeMostrarAvisoPruebas] = useState(false);
  const [estaEnviando, setEstaEnviando] = useState(false);

  function elegirCuentaDemo(indice: number) {
    const cuenta = CUENTAS_DEMO[indice];
    setIndiceCuentaDemo(indice);
    setInstitucion(cuenta.institucion);
    setRuc(cuenta.ruc);
    setUsuario(cuenta.usuario);
    setClave(CLAVE_DEMO);
    setMensajeError("");
  }

  function cambiarInstitucion(nueva: Institucion) {
    setInstitucion(nueva);
    setMensajeError("");
  }

  async function enviarFormulario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (estaEnviando) return;
    setMensajeError("");
    if (esDemoSinBackend) {
      const usuarioDemo = ingresarDemo({ institucion, ruc, usuario, clave });
      if (!usuarioDemo) setMensajeError("El usuario o la clave no son correctos.");
      else router.push(obtenerRutaInicio(usuarioDemo));
      return;
    }
    setEstaEnviando(true);
    try {
      const perfil = establecerPerfil(await iniciarSesion({ institucion, ruc: ruc.trim(), usuario: usuario.trim(), clave }));
      router.push(obtenerRutaInicio(perfil));
    } catch (error) {
      setMensajeError(obtenerMensajeError(error)); // se conserva lo ingresado
      setEstaEnviando(false);
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

          <button className="boton login__entrar" type="submit" disabled={estaEnviando}>
            {estaEnviando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="login__registro">
          <p>¿Su empresa aún no tiene acceso?</p>
          <a className="boton boton--secundario login__entrar" href="/solicitar-acceso">Registrarse</a>
        </div>

        <div className="login__pie">
          <p className="login__linea">
            Prototipo con nombres ficticios
            {!estaModoDemoActivo && (
              <>
                {" · "}
                <button type="button" className="login__enlace" onClick={() => setDebeMostrarAvisoPruebas((valor) => !valor)}>
                  usuarios de prueba
                </button>
              </>
            )}
          </p>

          {estaModoDemoActivo && (
            <details className="login__demo">
              <summary>Cuentas de demostración</summary>
              <label className="campo">
                <span>Cuenta</span>
                <select value={indiceCuentaDemo} onChange={(e) => elegirCuentaDemo(Number(e.target.value))}>
                  {CUENTAS_DEMO.map((cuenta, indice) => (
                    <option key={cuenta.usuario} value={indice}>{cuenta.etiqueta}</option>
                  ))}
                </select>
              </label>
            </details>
          )}
        </div>

        {!estaModoDemoActivo && debeMostrarAvisoPruebas && (
          <p className="login__aviso" role="status">
            Los usuarios de prueba se entregan al equipo por un canal privado: no se publican en el repositorio.
          </p>
        )}
      </section>
    </main>
  );
}
