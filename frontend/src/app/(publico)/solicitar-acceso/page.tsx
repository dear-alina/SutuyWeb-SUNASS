"use client";

import { useRef, useState, type FormEvent } from "react";
import "@/estilos/ingreso.css";
import "@/estilos/app.css";
import { ErrorDeApi } from "@/servicios/api/cliente-api";
import { solicitarAcceso } from "@/servicios/api/solicitudes-acceso";
import { obtenerErroresPorCampo, obtenerMensajeDeError } from "@/utilidades/mensajes-error";

type Campo = "ruc" | "nombre" | "cargo" | "correo" | "clave" | "confirmacion";
type Errores = Partial<Record<Campo, string>>;

const ORDEN_CAMPOS: Campo[] = ["ruc", "nombre", "cargo", "correo", "clave", "confirmacion"];
const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const VALORES_INICIALES: Record<Campo, string> = { ruc: "", nombre: "", cargo: "", correo: "", clave: "", confirmacion: "" };

function validar(valores: Record<Campo, string>): Errores {
  const errores: Errores = {};
  if (!/^[0-9]{11}$/.test(valores.ruc.trim())) errores.ruc = "El RUC debe tener 11 dígitos.";
  if (!valores.nombre.trim()) errores.nombre = "Ingrese su nombre completo.";
  if (!CORREO_VALIDO.test(valores.correo.trim())) errores.correo = "Ingrese un correo válido.";
  if (valores.clave.length < 8) errores.clave = "La clave debe tener al menos 8 caracteres.";
  if (valores.confirmacion !== valores.clave) errores.confirmacion = "La confirmación no coincide con la clave.";
  return errores;
}

export default function PaginaSolicitarAcceso() {
  const [valores, setValores] = useState(VALORES_INICIALES);
  const [errores, setErrores] = useState<Errores>({});
  const [mensajeGeneral, setMensajeGeneral] = useState("");
  const [estaEnviando, setEstaEnviando] = useState(false);
  const [estaEnviada, setEstaEnviada] = useState(false);
  const [esClaveVisible, setEsClaveVisible] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  function cambiar(campo: Campo, valor: string) {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    if (errores[campo]) setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  }

  function enfocarPrimerError(nuevos: Errores) {
    const primero = ORDEN_CAMPOS.find((campo) => nuevos[campo]);
    if (primero) formulario.current?.querySelector<HTMLInputElement>(`#campo-${primero}`)?.focus();
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensajeGeneral("");
    const nuevos = validar(valores);
    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      enfocarPrimerError(nuevos);
      return;
    }

    setEstaEnviando(true);
    try {
      await solicitarAcceso({
        ruc: valores.ruc.trim(),
        nombre: valores.nombre.trim(),
        cargo: valores.cargo.trim() || null,
        correo: valores.correo.trim(),
        clave: valores.clave,
      });
      setEstaEnviada(true);
    } catch (error) {
      const delServidor = obtenerErroresPorCampo(error) as Errores;
      if (Object.keys(delServidor).length) {
        setErrores(delServidor);
        enfocarPrimerError(delServidor);
      }
      const esDeCampos = error instanceof ErrorDeApi && error.problema.codigo === "validacion_fallida";
      setMensajeGeneral(esDeCampos ? "Revise los campos marcados." : obtenerMensajeDeError(error));
    } finally {
      setEstaEnviando(false);
    }
  }

  function propiedadesDe(campo: Campo) {
    return {
      id: `campo-${campo}`,
      value: valores[campo],
      onChange: (evento: { target: { value: string } }) => cambiar(campo, evento.target.value),
      "aria-invalid": errores[campo] ? (true as const) : undefined,
      "aria-describedby": errores[campo] ? `error-${campo}` : undefined,
    };
  }

  const mensajeDeCampo = (campo: Campo) =>
    errores[campo] ? <span id={`error-${campo}`} className="campo__error">{errores[campo]}</span> : null;

  return (
    <main className="login">
      <section className="login__form" aria-labelledby="titulo-solicitud">
        <p className="login__logo">
          <img className="login__logo-img" src="/logo-sutuyweb.jpg" alt="SutuyWeb" width={550} height={391} />
        </p>
        <h1 id="titulo-solicitud" className="login__titulo">Solicitar acceso</h1>

        {estaEnviada ? (
          <div className="login__campos">
            <p className="aviso aviso--exito" role="status">
              Solicitud enviada. El administrador debe aprobarla antes de que pueda ingresar con su correo y su clave.
            </p>
            <a className="boton login__entrar" href="/ingreso">Volver al ingreso</a>
          </div>
        ) : (
          <form ref={formulario} className="login__campos" onSubmit={enviar} noValidate>
            <p className="texto-secundario">Para personas de una empresa prestadora. Todos los campos son obligatorios salvo el cargo.</p>

            <label className="campo" htmlFor="campo-ruc">
              <span>RUC de la empresa</span>
              <input {...propiedadesDe("ruc")} inputMode="numeric" maxLength={11} autoComplete="off" required />
              {mensajeDeCampo("ruc")}
            </label>

            <label className="campo" htmlFor="campo-nombre">
              <span>Nombre completo</span>
              <input {...propiedadesDe("nombre")} autoComplete="name" maxLength={120} required />
              {mensajeDeCampo("nombre")}
            </label>

            <label className="campo" htmlFor="campo-cargo">
              <span>Cargo (opcional)</span>
              <input {...propiedadesDe("cargo")} autoComplete="organization-title" maxLength={120} />
              {mensajeDeCampo("cargo")}
            </label>

            <label className="campo" htmlFor="campo-correo">
              <span>Correo</span>
              <input {...propiedadesDe("correo")} type="email" autoComplete="email" required />
              {mensajeDeCampo("correo")}
            </label>

            <label className="campo" htmlFor="campo-clave">
              <span>Clave</span>
              <span className="campo__clave">
                <input {...propiedadesDe("clave")} type={esClaveVisible ? "text" : "password"} autoComplete="new-password" required />
                <button
                  type="button"
                  className="sw-iconbtn"
                  onClick={() => setEsClaveVisible((valor) => !valor)}
                  aria-label={esClaveVisible ? "Ocultar clave" : "Mostrar clave"}
                >
                  <span className="ms" aria-hidden="true">{esClaveVisible ? "visibility_off" : "visibility"}</span>
                </button>
              </span>
              <span className="campo__ayuda">Al menos 8 caracteres.</span>
              {mensajeDeCampo("clave")}
            </label>

            <label className="campo" htmlFor="campo-confirmacion">
              <span>Confirmar clave</span>
              <input {...propiedadesDe("confirmacion")} type={esClaveVisible ? "text" : "password"} autoComplete="new-password" required />
              {mensajeDeCampo("confirmacion")}
            </label>

            {mensajeGeneral && <p className="aviso-error" role="alert">{mensajeGeneral}</p>}

            <button className="boton login__entrar" type="submit" disabled={estaEnviando}>
              {estaEnviando ? "Enviando…" : "Enviar solicitud"}
            </button>
          </form>
        )}

        {!estaEnviada && (
          <p className="login__linea">
            ¿Ya tiene acceso? <a className="login__enlace" href="/ingreso">Ingresar</a>
          </p>
        )}
      </section>
    </main>
  );
}
