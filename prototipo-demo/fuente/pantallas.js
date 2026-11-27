/* ---------- Pantallas: mismo marcado y clases que frontend/src ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ms = (i) => `<span class="ms" aria-hidden="true">${i}</span>`;
const ui = { tab: "sunass", sel: {}, filtroEp: "accion", orden: "prioridad", verConcluidos: false, mensaje: "", campana: false, movimiento: null, docVista: "lista", corte: "", diasAlerta: 5, equipoMarcados: null, verif: null, observados: [], detalleObs: "", eval: null, detallePedido: "", plazoPedido: 3, nueva: { asunto: "", archivos: {} }, constancia: null, error: "", punto: 0, preguntar: false, respuesta: null, revisados: {}, solicitudEnviada: false };
const cuenta = () => CUENTAS.find((c) => c.id === (estado.sesion || {}).cuenta) || null;
const banda = () => `<p class="banda-demo" role="note">Prototipo para el Hackathon Lideresas por el Agua · datos sintéticos · no es un servicio oficial de la Sunass · fecha simulada ${fmt(hoy())}
  <button type="button" class="banda-demo__boton" data-accion="adelantar">Adelantar 1 día hábil</button>
  <button type="button" class="banda-demo__boton" data-accion="restablecer">Restablecer datos</button></p>`;
const boton = (texto, accion, extra = "", icono = "") => `<button type="button" class="boton ${extra}" data-accion="${accion}">${icono ? ms(icono) + " " : ""}${esc(texto)}</button>`;
const botonDescarga = (d) => `<button type="button" class="boton boton--secundario boton--chico" data-accion="ver-pdf" data-doc="${d.codigo}">${ms("download")} Ver PDF</button>`;

/* ===== Ingreso ===== */
function pintarIngreso() {
  const ep = ui.tab === "eps";
  const opciones = CUENTAS.map((c) => `<option value="${c.id}">${esc(c.etiqueta)}</option>`).join("");
  return `${banda()}<main class="login"><section class="login__form">
  <h1 class="login__logo"><img class="login__logo-img" src="__LOGO_CUADRADO__" alt="SutuyWeb"></h1>
  <div class="login__tabs" role="tablist" aria-label="Tipo de usuario">
    <button type="button" role="tab" aria-selected="${!ep}" data-accion="tab" data-valor="sunass">Sunass</button>
    <button type="button" role="tab" aria-selected="${ep}" data-accion="tab" data-valor="eps">Empresa prestadora</button>
  </div>
  <form class="login__campos" id="form-ingreso" novalidate>
    ${ep ? `<label class="campo"><span>RUC de la empresa</span><input name="ruc" inputmode="numeric" autocomplete="off"></label>` : ""}
    <label class="campo"><span>Usuario</span><input name="usuario" autocomplete="off"></label>
    <label class="campo"><span>Clave</span><span class="campo__clave"><input type="password" name="clave" autocomplete="off"><button type="button" class="sw-iconbtn" data-accion="ver-clave" aria-label="Mostrar la clave">${ms("visibility")}</button></span></label>
    ${ui.error ? `<p class="aviso-error" role="alert">${esc(ui.error)}</p>` : ""}
    <button class="boton login__entrar" type="submit">Ingresar</button>
  </form>
  <div class="login__registro"><p>¿Su empresa aún no tiene acceso?</p><a class="boton boton--secundario login__entrar" href="#/solicitar-acceso">Registrarse</a></div>
  <div class="login__pie"><p class="login__linea">Prototipo con nombres ficticios</p>
    <details class="login__demo" open><summary>Cuentas de demostración</summary>
      <label class="campo"><span>Cuenta</span><select id="cuenta-demo"><option value="">Elija una cuenta</option>${opciones}</select></label></details></div>
  </section></main>`;
}
function pintarSolicitarAcceso() {
  if (ui.solicitudEnviada) return `<main class="login"><section class="login__form"><p class="login__logo"><img class="login__logo-img" src="__LOGO_CUADRADO__" alt="SutuyWeb"></p><h1 class="login__titulo">Solicitar acceso</h1>
    <div class="login__campos"><p class="aviso aviso--exito">Solicitud enviada. El administrador debe aprobarla antes de que pueda ingresar con su correo y su clave.</p><a class="boton login__entrar" href="#/ingreso">Volver al ingreso</a></div></section></main>`;
  const c = (t, n, tipo = "text", ayuda = "") => `<label class="campo"><span>${t}</span><input name="${n}" type="${tipo}">${ayuda ? `<span class="campo__ayuda">${ayuda}</span>` : ""}</label>`;
  return `<main class="login"><section class="login__form"><p class="login__logo"><img class="login__logo-img" src="__LOGO_CUADRADO__" alt="SutuyWeb"></p><h1 class="login__titulo">Solicitar acceso</h1>
  <form class="login__campos" id="form-acceso" novalidate><p class="texto-secundario">Para personas de una empresa prestadora. Todos los campos son obligatorios salvo el cargo.</p>
  ${c("RUC de la empresa", "ruc")}${c("Nombre completo", "nombre")}${c("Cargo (opcional)", "cargo")}${c("Correo", "correo", "email")}${c("Clave", "clave", "password", "Al menos 8 caracteres.")}${c("Confirmar clave", "clave2", "password")}
  <button class="boton login__entrar" type="submit">Enviar solicitud</button></form>
  <p class="login__linea">¿Ya tiene acceso? <a class="login__enlace" href="#/ingreso">Ingresar</a></p></section></main>`;
}
function pintarAdmin() {
  return `<header class="encabezado"><a class="encabezado__marca" href="#/admin"><img src="__LOGO_HORIZONTAL__" alt="SutuyWeb" height="40"></a>
  <p class="encabezado__usuario"><span class="encabezado__nombre">Administración</span><span class="encabezado__detalle">Cuenta de demostración</span></p>
  <button type="button" class="boton boton--secundario" data-accion="salir">Cerrar sesión</button></header>
  <main class="contenido" id="contenido"><h1>Solicitudes de acceso</h1><p class="aviso aviso--info">No hay solicitudes por revisar.</p></main>`;
}

/* ===== Empresa prestadora ===== */
function encabezadoEps() {
  const c = cuenta(); const avisos = avisosEp(c.eps);
  const panel = ui.campana ? `<div id="panel-notificaciones" class="campana__panel"><p class="campana__titulo">Notificaciones</p>${avisos.length === 0 ? `<p class="campana__vacio">No tiene notificaciones pendientes.</p>`
    : `<ul class="campana__lista">${avisos.map((a) => `<li><button type="button" class="campana__item campana__item--${a.tono}" data-accion="abrir-aviso" data-codigo="${a.codigo}"><b>${esc(a.titulo)}</b><span>${esc(a.detalle)}</span><small>${a.codigo} · ${esc(a.base)}</small></button></li>`).join("")}</ul>`}</div>` : "";
  return `${banda()}<header class="eps-barra"><div class="eps-barra__lado"><a class="eps-barra__marca" href="#/eps/tramites"><img src="__LOGO_HORIZONTAL__" alt="SutuyWeb, ir a mis solicitudes" width="800" height="412"></a></div>
  <div class="eps-barra__identidad"><span class="eps-barra__empresa">${esc(EPS[c.eps].nombre)}</span></div>
  <div class="eps-barra__acciones"><div class="campana"><button type="button" class="eps-barra__icono" aria-expanded="${ui.campana}" aria-label="Notificaciones" data-accion="campana">${ms("notifications")}${avisos.length ? `<span class="campana__contador">${avisos.length}</span>` : ""}</button>${panel}</div>
  <span class="eps-barra__separador"></span><button type="button" class="eps-barra__salir" data-accion="salir">${ms("logout")} Salir</button></div></header>`;
}
function grupoEp(e) { const s = situacionEp(e); if (s.accion) return "accion"; return e.estado === "concluido" ? "concluidos" : "curso"; }
function pintarTramites() {
  const c = cuenta(); const mias = estado.expedientes.filter((e) => e.eps === c.eps).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  const nAccion = mias.filter((e) => grupoEp(e) === "accion").length;
  if (nAccion === 0 && ui.filtroEp === "accion" && !ui.filtroElegido) ui.filtroEp = "curso";
  const lista = mias.filter((e) => grupoEp(e) === ui.filtroEp || (ui.filtroEp === "curso" && grupoEp(e) === "accion"));
  const sel = buscar(ui.sel.ep) && buscar(ui.sel.ep).eps === c.eps ? buscar(ui.sel.ep) : null;
  const vacio = { accion: "No tiene acciones pendientes.", curso: "No tiene trámites en curso.", concluidos: "No tiene trámites concluidos." }[ui.filtroEp];
  const tab = (v, t) => `<button type="button" role="tab" aria-selected="${ui.filtroEp === v}" data-accion="filtro-ep" data-valor="${v}">${t}</button>`;
  return `<div class="eps">${encabezadoEps()}<main class="eps__contenido">
  <section class="eps__lista" aria-labelledby="t-lista"><h1 id="t-lista">Mis solicitudes</h1>
    <p class="actualizacion">${ms("sync")} Se actualiza automáticamente · última revisión ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p>
    <a class="boton boton--ancho" href="#/eps/nueva-solicitud">${ms("add")} Nueva solicitud</a>
    <div class="filtros" role="tablist" aria-label="Filtrar solicitudes">${tab("accion", `Requieren su acción (${nAccion})`)}${tab("curso", "En curso")}${tab("concluidos", "Concluidos")}</div>
    ${lista.length === 0 ? `<p class="vacio">${vacio}</p>` : `<ul class="lista-tramites">${lista.map((e) => { const s = situacionEp(e); return `<li><button type="button" class="tarjeta-tramite" ${sel === e ? 'aria-current="true"' : ""} data-accion="sel-ep" data-codigo="${e.codigo}">
      <span class="tarjeta-tramite__codigo">${e.codigo}</span><span class="tarjeta-tramite__fila"><b>Uso excepcional del fondo de inversiones</b><span class="chip chip--${s.tono}">${esc(s.textoEstado)}</span></span>
      <span class="tarjeta-tramite__texto">${s.accion ? `Le toca: ${esc(s.accion.titulo.toLowerCase())}.` : esc(s.queEstaPasando)}</span></button></li>`; }).join("")}</ul>`}
  </section>
  <section class="eps__detalle" aria-live="polite">${sel ? fichaTramite(sel) : `<div class="eps__sin-seleccion">${ms("inventory_2")}<p>Elija una solicitud para ver en qué etapa está, cómo va el plazo de la Sunass y si debe hacer algo.</p></div>`}</section>
  </main></div>`;
}
const ejemploRespuesta = (r) => ((ui.ejemplos || {})[r] ? `<small>${ms("check_circle")} ejemplo-${r.toLowerCase()}.pdf</small>` : `<button type="button" class="boton boton--secundario boton--chico prototipo-ejemplo" data-accion="ejemplo" data-req="${r}" data-destino="respuesta">Usar PDF de ejemplo</button>`);
function fichaTramite(e) {
  const s = situacionEp(e); const p = plazo(e);
  const ultimo = [...e.hitos].reverse().find((h) => h.fin) || e.hitos[0];
  const docs = e.documentos.filter((d) => d.acceso !== "interno");
  let panelAccion;
  if (s.accion) {
    const ped = s.accion.pedido; const sub = ped && ped.tipo === "subsanacion";
    const restan = habilesEntre(hoy(), s.accion.venceEl); const vencido = hoy() > s.accion.venceEl;
    const campos = sub ? ped.requisitos.map((r) => `<label class="campo"><span>${esc(REQUISITOS.find((q) => q.c === r).texto)} (PDF)</span><input type="file" accept="application/pdf" data-archivo="${r}"></label>${ejemploRespuesta(r)}`).join("")
      : `<label class="campo"><span>Información adicional solicitada (PDF)</span><input type="file" accept="application/pdf" data-archivo="info"></label>${ejemploRespuesta("info")}`;
    panelAccion = `<section class="ficha__bloque ficha__bloque--accion"><h3>¿Debe hacer algo? Sí</h3>
      <p><b>${esc(s.accion.titulo)}</b> antes del <b>${fmt(s.accion.venceEl)}</b> (${vencido ? "plazo vencido" : `faltan ${textoDias(restan)}`}). <small>Base: ${esc(s.accion.base)}.</small></p>
      ${ped ? `<div class="pedido-sunass"><p><b>Lo que pide la Sunass</b> · Oficio ${ped.oficio}</p><p>${esc(ped.detalle)}</p></div>` : ""}
      <form class="ficha__formulario" id="form-respuesta" data-codigo="${e.codigo}">${campos}
        <div class="ficha__botones"><button class="boton" type="submit">${sub ? "Enviar subsanación" : "Enviar información"}</button>${s.accion.puedePedirProrroga ? `<button type="button" class="boton boton--secundario" data-accion="prorroga">Pedir prórroga</button>` : ""}</div></form></section>`;
  } else panelAccion = `<section class="ficha__bloque"><h3>¿Debe hacer algo?</h3><p>No. ${esc(s.queEstaPasando)}</p></section>`;
  const linea = etapas(e).map((x, i) => `<li class="avance__paso avance__paso--${x.estado}"><span class="avance__marca">${x.estado === "hecha" ? "✓" : i + 1}</span><span class="avance__texto"><span>${x.texto}${x.conSubsanacion ? "<small> · con subsanación</small>" : ""}${x.conInformacion ? "<small> · con pedido de información</small>" : ""}</span>${x.desde ? `<small>desde el ${fmt(x.desde)}</small>` : ""}</span></li>`).join("");
  const T = { en_plazo: ["La Sunass está dentro del plazo", "informacion"], vencido: ["Venció el plazo: corre el margen de 5 días para notificar", "accion"], silencio_configurado: ["Silencio positivo configurado", "alerta"], resuelto_en_plazo: ["Resuelta dentro del plazo", "exito"], resuelto_tras_silencio: ["Resuelta después de configurado el silencio positivo", "alerta"] }[p.situacion];
  return `<article class="ficha"><header class="ficha__cabecera"><p class="ficha__codigo">${e.codigo} · Reglamento General de Tarifas, art. 89</p><h2>Uso excepcional del fondo de inversiones</h2>
    <p><span class="chip chip--${s.tono}">${esc(s.textoEstado)}</span></p>
    <p class="ficha__resumen">Presentada el ${fmt(e.fechaInicio)} · último movimiento el ${fmt(ultimo.fin || ultimo.ini)}${e.motivo ? ` · ${esc(e.motivo)}` : ""}</p></header>
    ${ui.mensajeEp ? `<p class="aviso aviso--exito" role="status">${esc(ui.mensajeEp)}</p>` : ""}
    ${panelAccion}
    <section class="ficha__bloque"><h3>¿En qué etapa está?</h3><ol class="avance">${linea}</ol></section>
    <section class="ficha__bloque"><h3>Plazo de la Sunass y silencio administrativo</h3><p class="chip chip--${T[1]}">${T[0]}</p>
      <div class="plazo-barra" role="progressbar" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${Math.min(30, p.diaDelPlazo)}"><span style="width:${Math.min(100, (100 * p.diaDelPlazo) / 30)}%"></span></div>
      <p class="plazo-texto">Día <b>${p.diaDelPlazo}</b> de 30 días hábiles · vence el <b>${fmt(p.fechaLimite)}</b> · margen para notificar hasta el <b>${fmt(p.fechaLimiteNotificacion)}</b></p>
      <div class="silencios"><div class="silencio silencio--aplica"><p class="silencio__titulo">${ms("check_circle")} Silencio positivo · <b>aplica</b> a este trámite</p><p>Si la Sunass no le notifica su decisión dentro de los 30 días hábiles más 5 días, su solicitud se considera <b>aprobada</b> en los términos en que la pidió.</p><small>Reglamento General de Tarifas, art. 89.8 · ${LEY}, arts. 24.1 y 188.1</small></div>
      <div class="silencio"><p class="silencio__titulo">${ms("block")} Silencio negativo · <b>no aplica</b> a este trámite</p><p>En otros trámites, el vencimiento del plazo permite considerar <b>denegada</b> la solicitud y recurrir. Aquí no rige, porque el reglamento califica este trámite como de silencio positivo.</p><small>${LEY}, art. 34.1: el silencio negativo solo se aplica cuando la norma del procedimiento lo establece</small></div></div>
      ${p.situacion === "silencio_configurado" || p.situacion === "resuelto_tras_silencio" ? `<p class="aviso aviso--alerta" role="alert">${p.situacion === "resuelto_tras_silencio" ? `La resolución se emitió el ${fmt(e.fechaConclusion)}, después del ${fmt(p.fechaLimiteNotificacion)}. ` : `No consta una notificación hasta el ${fmt(p.fechaLimiteNotificacion)}. `}Su solicitud podría considerarse aprobada por silencio positivo. Consulte con su área legal. <small>${LEY}, arts. 188.1 y 188.2.</small></p>` : ""}
      ${e.fechaNotificacion ? `<p class="plazo-texto">Si no está conforme con la resolución, puede presentar reconsideración ante el Consejo Directivo dentro de 15 días hábiles, con nueva prueba (${LEY}, art. 207.2).</p>` : ""}
      <p class="plazo-texto">Los días que usted tarde en subsanar o enviar información no se cuentan en el plazo de la Sunass (${LEY}, art. 125.3.1).</p></section>
    <section class="ficha__bloque"><h3>Documentos</h3>${docs.length === 0 ? "<p>Todavía no hay documentos disponibles para usted en este trámite.</p>" : `<ul class="documentos">${docs.filter((d) => !(d.tipo === "resolucion_consejo_directivo" && !e.fechaNotificacion)).map((d) => `<li>${ms("description")}<span><b>${TIPO_DOCUMENTO[d.tipo]} ${esc(d.numero)}</b><small>${esc(d.asunto)} · ${fmt(d.fecha)}</small></span>${botonDescarga(d)}</li>`).join("")}</ul>`}</section>
  </article>`;
}
function pintarNuevaSolicitud() {
  const c = cuenta(); const k = ui.constancia;
  if (k) {
    const e = buscar(k); const p = plazo(e); const faltan = REQUISITOS.filter((r) => !e.documentos.some((d) => d.req === r.c));
    return `<div class="eps">${encabezadoEps()}<main class="eps__contenido eps__contenido--una-columna"><section class="asistente"><h1>Solicitud enviada</h1>
      <div class="aviso aviso--exito"><p><b>Constancia de recepción ${e.codigo}</b> · ${fmt(e.fechaInicio)}</p><p>La Sunass recibió su solicitud de uso excepcional del fondo de inversiones. El plazo de 30 días hábiles vence el ${fmt(p.fechaLimite)}.</p></div>
      ${faltan.length ? `<div class="aviso aviso--alerta" role="note"><p><b>La constancia registra que no adjuntó:</b></p><ul>${faltan.map((r) => `<li>${esc(r.texto)}</li>`).join("")}</ul><p>Si la Sunass lo observa, tendrá 2 días hábiles para subsanarlos (${LEY}, art. 125).</p></div>` : ""}
      <a class="boton" href="#/eps/tramites" data-accion="ver-mis">Ver mis solicitudes</a></section></main></div>`;
  }
  const n = Object.keys(ui.nueva.archivos).length;
  const items = REQUISITOS.map((r, i) => { const f = ui.nueva.archivos[r.c]; return `<li class="requisitos__item${f ? " requisitos__item--listo" : ""}">${ms(f ? "check_circle" : "upload_file")}<label class="campo"><span>${i + 1}. ${esc(r.texto)}${f ? ` · ${esc(f)}` : ""}</span><input type="file" accept="application/pdf" data-requisito="${r.c}"></label>${f ? "" : `<button type="button" class="boton boton--secundario boton--chico prototipo-ejemplo" data-accion="ejemplo" data-req="${r.c}" data-destino="nueva">Usar PDF de ejemplo</button>`}</li>`; }).join("");
  return `<div class="eps">${encabezadoEps()}<main class="eps__contenido eps__contenido--una-columna"><section class="asistente">
    <a class="enlace-volver" href="#/eps/tramites">${ms("arrow_back")} Volver a mis solicitudes</a>
    <h1>Nueva solicitud: uso excepcional del fondo de inversiones</h1><p class="asistente__base">Reglamento General de Tarifas, art. 89 · plazo de 30 días hábiles · gratuito</p>
    <form class="asistente__paso asistente__campos" id="form-nueva" novalidate>
      <label class="campo"><span>Asunto de la solicitud</span><input name="asunto" value="${esc(ui.nueva.asunto)}" placeholder="Ej.: Rotura de línea de conducción"></label>
      <fieldset class="pregunta"><legend>Documentos que exige el Texto Único de Procedimientos Administrativos (PDF) · ${n} de 3 adjuntos</legend><ul class="requisitos">${items}</ul></fieldset>
      ${n < 3 ? `<p class="aviso aviso--informacion">Faltan ${3 - n} documento${3 - n === 1 ? "" : "s"}. Puede enviar igual: la mesa de partes recibirá su solicitud y dejará constancia de lo que falta (${LEY}, art. 125.1).</p>` : ""}
      ${ui.error ? `<p class="aviso aviso--alerta" role="alert">${esc(ui.error)}</p>` : ""}
      <div class="asistente__botones"><button class="boton" type="submit">Enviar solicitud</button></div></form></section></main></div>`;
}

/* ===== Sunass ===== */
function encabezadoSunass(ruta) {
  const c = cuenta();
  const enlace = (href, icono, texto, activo) => `<a href="${href}" ${activo ? 'aria-current="page"' : ""}>${ms(icono)} ${texto}</a>`;
  return `${banda()}<header class="eps-barra"><div class="eps-barra__lado"><a class="eps-barra__marca" href="#/sunass/inicio"><img src="__LOGO_HORIZONTAL__" alt="SutuyWeb, ir a mi bandeja" width="800" height="412"></a></div>
  <div class="eps-barra__identidad"><span class="eps-barra__empresa">${esc(NOMBRE_AREA[c.area])}</span><span class="eps-barra__cargo">Cuenta de demostración · ${esc(c.cargo)} · Sunass</span></div>
  <div class="eps-barra__acciones"><nav aria-label="Secciones" class="eps-barra__navegacion">${enlace("#/sunass/inicio", "inbox", "Bandeja", ruta === "/sunass/inicio")}${enlace("#/sunass/expedientes", "folder_open", "Expedientes", ruta.startsWith("/sunass/expedientes"))}${c.area === "dre" ? enlace("#/sunass/panel", "monitoring", "Panel gerencial", ruta === "/sunass/panel") : ""}</nav>
  <span class="eps-barra__separador"></span><button type="button" class="eps-barra__salir" data-accion="salir">${ms("logout")} Salir</button></div></header>`;
}
function prioridad(a, b, area) {
  const ta = tareaDe(a, area) ? 0 : 1, tb = tareaDe(b, area) ? 0 : 1;
  if (ta !== tb) return ta - tb;
  return plazo(a).diasRestantes - plazo(b).diasRestantes;
}
function pintarBandeja() {
  const area = cuenta().area;
  const ufi = estado.expedientes.filter((e) => e.codigo.startsWith("UFI-"));
  const abiertos = ufi.filter(estaAbierto).sort(ui.orden === "prioridad" ? (a, b) => prioridad(a, b, area) : (a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  const concluidos = ufi.filter((e) => !estaAbierto(e)).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  const lista = ui.verConcluidos ? concluidos : abiertos;
  const suyos = abiertos.filter((e) => tareaDe(e, area)).length;
  if (!ui.sel.sunass && abiertos[0]) ui.sel.sunass = abiertos[0].codigo;
  const sel = buscar(ui.sel.sunass);
  const fila = (e) => { const t = tareaDe(e, area); const p = plazo(e); const ab = estaAbierto(e);
    return `<li><button type="button" class="lista-exp__item" ${sel === e ? 'aria-current="true"' : ""} data-accion="sel-sunass" data-codigo="${e.codigo}"><span class="lista-exp__codigo">${e.codigo}</span><b>${esc(EPS[e.eps].nombre)}</b><span class="lista-exp__marcas">
    ${t ? `<span class="chip chip--accion">Le toca a usted</span>` : ab ? `<span class="lista-exp__donde">Lo tiene: ${esc(NOMBRE_AREA[areaActual(e)])}</span>` : `<span class="lista-exp__donde">${TEXTO_RESULTADO[e.resultado] || "Concluido"}</span>`}
    ${ab && e.estado === "en_tramite" ? `<span class="chip chip--${p.diasRestantes < 0 ? "alerta" : p.diasRestantes <= 5 ? "accion" : "informacion"}">${p.diasRestantes < 0 ? "Venció" : `Vence en ${textoDias(p.diasRestantes)}`}</span>` : ""}</span></button></li>`; };
  return `<div class="eps">${encabezadoSunass("/sunass/inicio")}<main class="bandeja">
  <section class="bandeja__lista" aria-labelledby="titulo-bandeja"><h1 id="titulo-bandeja">Uso excepcional del fondo de inversiones</h1>
    <p class="actualizacion" role="status">${ms("sync")} ${suyos} le toca${suyos === 1 ? "" : "n"} a usted · se actualiza solo</p>
    ${!ui.verConcluidos ? `<div class="orden" role="group" aria-label="Ordenar la lista">${[["prioridad", "Prioridad"], ["recientes", "Más recientes"]].map(([v, t]) => `<button type="button" aria-pressed="${ui.orden === v}" data-accion="orden" data-valor="${v}">${ui.orden === v ? ms("check") : ""} ${t}</button>`).join("")}</div>` : ""}
    ${lista.length === 0 ? `<p class="sunass__vacio">${ui.verConcluidos ? "No hay expedientes concluidos." : "No hay expedientes en curso."}</p>` : `<ul class="lista-exp">${lista.map(fila).join("")}</ul>`}
    <button type="button" class="enlace-boton" data-accion="ver-concluidos">${ui.verConcluidos ? `Ver en curso (${abiertos.length})` : `Concluidos (${concluidos.length})`}</button>
  </section>
  ${sel ? `<div class="bandeja__detalle"><div class="bandeja__ficha">${ui.mensaje ? `<p class="accion-banner accion-banner--hecho" role="status">${ms("check_circle")} ${esc(ui.mensaje)}</p>` : ""}${fichaSunass(sel, area)}</div>${tarjetasTiempo(sel, area)}</div>` : `<p class="sunass__vacio">Elija un expediente de la lista.</p>`}
  </main></div>`;
}
function fichaSunass(e, area) {
  const eq = e.equipo.map((id) => ESPECIALISTAS.find((x) => x.id === id)).filter(Boolean);
  const et = etapas(e);
  return `<article class="ficha-dre"><header><h2 class="ficha-dre__titulo"><span class="ficha-dre__codigo">${e.codigo}</span> ${esc(EPS[e.eps].nombre)}</h2>
    <p class="ficha__resumen">Uso excepcional del fondo de inversiones · Reglamento General de Tarifas, art. 89 · presentada el ${fmt(e.fechaInicio)}${e.motivo ? ` · ${esc(e.motivo)}` : ""}</p></header>
    ${eq.length ? `<p class="equipo-asignado">${ms("groups")}<span><b>Equipo asignado:</b> ${eq.map((x) => `${esc(x.nombre)} (${ROL_EQUIPO[x.rol].toLowerCase()})`).join(" · ")}</span></p>` : ""}
    ${bloqueAccion(e, area)}
    <ol class="etapas">${et.map((x, i) => `<li class="etapas__paso etapas__paso--${x.estado}" ${x.estado === "actual" ? 'aria-current="step"' : ""}><span class="etapas__marca">${x.estado === "hecha" ? "✓" : i + 1}</span><span class="etapas__texto">${x.texto}${x.c === "resolucion" && porNotificar(e) ? " · por notificar" : ""}</span>${x.desde ? `<small>${fmt(x.desde)} · ${textoDias(x.dias)}</small>` : ""}</li>`).join("")}</ol>
    ${e.estado === "en_tramite" && area === "equipo_srt" ? requisitosPresentados(e) : ""}
    ${historial(e)}${plazosPorArea(e)}${documentosSunass(e)}</article>`;
}
function requisitosPresentados(e) {
  const n = REQUISITOS.filter((r) => e.documentos.some((d) => d.req === r.c)).length;
  return `<section class="requisitos-tupa${n < 3 ? " requisitos-tupa--faltan" : ""}"><h3>Requisitos · ${n} de 3 presentados</h3><ul>${REQUISITOS.map((r) => { const d = e.documentos.find((x) => x.req === r.c);
    return `<li>${ms(d ? "check_circle" : "cancel")}<span>${esc(r.descripcion)} <small>${d ? ` · ${d.codigo}` : ` · no presentado · ${esc(r.base)}`}</small></span></li>`; }).join("")}</ul></section>`;
}
function bloqueAccion(e, area) {
  const t = tareaDe(e, area); const p = pasoActual(e);
  const err = ui.errorAccion ? `<p class="aviso aviso--alerta" role="alert">${esc(ui.errorAccion)}</p>` : "";
  if (!t) {
    const titulo = p ? `Lo tiene: ${NOMBRE_AREA[p.a]}` : porNotificar(e) ? "Resuelto: pendiente de notificar" : "Expediente concluido y notificado";
    return `<div class="accion-banner accion-banner--neutro"><p class="accion-banner__titulo">${esc(titulo)}</p>${p ? `<p>${esc(PASO[p.c].accion)}. No requiere acción de su área.</p>` : ""}</div>`;
  }
  if (t === "asignacion") {
    if (!ui.equipoMarcados) { const carga = (id) => estado.expedientes.filter((x) => x.estado === "en_tramite" && x.equipo.includes(id)).length; const mejor = (rol) => ESPECIALISTAS.filter((s) => s.rol === rol).sort((a, b) => carga(a.id) - carga(b.id))[0].id; ui.equipoMarcados = [mejor("verifica_tupa"), mejor("evalua_informa")]; ui.sugeridos = [...ui.equipoMarcados]; }
    const carga = (id) => estado.expedientes.filter((x) => x.estado === "en_tramite" && x.equipo.includes(id)).length;
    return `<form class="accion-banner" id="form-equipo"><p class="accion-banner__titulo">Le toca a usted formar el equipo de especialistas</p>
      <fieldset class="equipo"><legend>Especialistas · sugeridos por menor carga de trabajo</legend>${ESPECIALISTAS.map((s) => { const m = ui.equipoMarcados.includes(s.id);
        return `<label class="equipo__opcion${m ? " equipo__opcion--marcada" : ""}"><input type="checkbox" data-especialista="${s.id}" ${m ? "checked" : ""}><span><b>${esc(s.nombre)}</b> ${ui.sugeridos.includes(s.id) ? '<span class="chip chip--informacion">Sugerido</span>' : ""}<small>${esc(s.especialidad)} · ${ROL_EQUIPO[s.rol]} · ${carga(s.id)} expedientes en curso</small></span></label>`; }).join("")}</fieldset>
      <small>Integrantes ficticios de la demo. Se exige al menos una persona que verifique y una que evalúe.</small>${err}
      <div class="ficha__botones"><button class="boton" type="submit">${ms("group_add")} Formar equipo</button></div></form>`;
  }
  if (t === "verificacion_tupa") {
    const n = REQUISITOS.filter((r) => e.documentos.some((d) => d.req === r.c)).length;
    const v = ui.verif;
    const obs = v === "no" ? `<fieldset class="equipo"><legend>Requisitos observados</legend>${REQUISITOS.map((r) => { const d = e.documentos.some((x) => x.req === r.c); const m = ui.observados.includes(r.c);
        return `<label class="equipo__opcion${m ? " equipo__opcion--marcada" : ""}"><input type="checkbox" data-observado="${r.c}" ${m ? "checked" : ""}><span><b>${esc(r.texto)}</b><small>${d ? "Presentado: marque si el documento no cumple" : "No presentado"}</small></span></label>`; }).join("")}
        <label class="campo"><span>Detalle de la observación (aparecerá en el oficio)</span><textarea id="detalle-obs" rows="3">${esc(ui.detalleObs)}</textarea></label></fieldset>` : "";
    return `<form class="accion-banner" id="form-verificacion"><p class="accion-banner__titulo">Le toca a usted verificar los requisitos del Texto Único de Procedimientos Administrativos</p>
      ${revisionCopiloto(e)}
      <fieldset class="equipo"><legend>¿La solicitud cumple los requisitos? (${n} de 3 con documento)</legend>
        <label class="equipo__opcion${v === "si" ? " equipo__opcion--marcada" : ""}"><input type="radio" name="verif" value="si" ${v === "si" ? "checked" : ""}><span><b>Cumple</b><small>Sigue: evaluar el caso.</small></span></label>
        <label class="equipo__opcion${v === "no" ? " equipo__opcion--marcada" : ""}"><input type="radio" name="verif" value="no" ${v === "no" ? "checked" : ""}><span><b>No cumple</b><small>Sigue: la Subdirección de Regulación Tarifaria firma el oficio de subsanación.</small></span></label></fieldset>
      ${obs}<small>Si la empresa prestadora no subsana en 2 días hábiles, la solicitud se considera no presentada (${LEY}, art. 125.4).</small>${err}
      <div class="ficha__botones"><button class="boton" type="submit">${ms("fact_check")} Registrar verificación</button></div></form>`;
  }
  if (t === "evaluacion") {
    const v = ui.eval; const previo = e.pedidos.some((x) => x.tipo === "informacion");
    return `<form class="accion-banner" id="form-evaluacion"><p class="accion-banner__titulo">Le toca a usted evaluar el caso fortuito o de fuerza mayor y el uso propuesto</p>
      <fieldset class="equipo"><legend>¿La información es suficiente para el informe?</legend>
        <label class="equipo__opcion${v === "si" ? " equipo__opcion--marcada" : ""}"><input type="radio" name="eval" value="si" ${v === "si" ? "checked" : ""}><span><b>Sí, es suficiente</b><small>Sigue: elaborar el informe técnico-legal.</small></span></label>
        <label class="equipo__opcion${v === "no" ? " equipo__opcion--marcada" : ""}"><input type="radio" name="eval" value="no" ${v === "no" ? "checked" : ""}><span><b>Falta información</b><small>Sigue: la Subdirección firma el pedido de información adicional.</small></span></label></fieldset>
      ${v === "no" ? `<fieldset class="equipo"><legend>Pedido de información adicional${previo ? " (ya hubo un pedido anterior)" : ""}</legend><label class="campo"><span>Qué información necesita</span><textarea id="detalle-pedido" rows="3">${esc(ui.detallePedido)}</textarea></label>
        <label class="campo"><span>Plazo para la empresa prestadora (días hábiles, máximo 10)</span><input type="number" id="plazo-pedido" min="1" max="10" value="${ui.plazoPedido}"></label></fieldset>` : ""}${err}
      <div class="ficha__botones"><button class="boton" type="submit">${ms("fact_check")} Registrar evaluación</button></div></form>`;
  }
  if (t === "oficio_subsanacion" || t === "oficio_informacion") {
    const b = e.borrador || { requisitos: [], detalle: "", plazo: 2 }; const sub = t === "oficio_subsanacion";
    return `<div class="accion-banner"><p class="accion-banner__titulo">Le toca a usted revisar y firmar el oficio de ${sub ? "subsanación de requisitos" : "información adicional"}</p>
      <div class="oficio-borrador"><p><b>Borrador del oficio</b> · ${e.codigo} · ${esc(EPS[e.eps].nombre)}</p>${b.requisitos.length ? `<ul>${b.requisitos.map((r) => `<li>${esc(REQUISITOS.find((q) => q.c === r).descripcion)}</li>`).join("")}</ul>` : ""}<p>${esc(b.detalle)}</p><p>Plazo para la empresa prestadora: ${textoDias(b.plazo)}, que no se cuentan en el plazo de la Sunass.</p></div>
      <small>Base: ${sub ? `${LEY}, art. 125` : "Reglamento General de Tarifas, art. 89.6"}</small>${err}
      <div class="ficha__botones">${boton("Firmar oficio y notificar", "firmar-oficio", "", "signature")}</div></div>`;
  }
  if (t === "resolver") return `<div class="accion-banner"><p class="accion-banner__titulo">Le toca a usted resolver la solicitud</p><small>Base: Reglamento General de Tarifas, art. 89.5: aprobar, aprobar en parte o denegar, y fijar la devolución o la exoneración.</small>${err}
      <div class="ficha__botones">${boton("Aprobar", "resolver", "", "")}${boton("Aprobar en parte", "resolver-parcial", "boton--secundario")}${boton("Denegar", "denegar", "boton--secundario")}</div></div>`;
  if (t === "notificar") return `<div class="accion-banner"><p class="accion-banner__titulo">Le toca a usted notificar la resolución a la empresa prestadora</p><p>El Consejo Directivo resolvió: ${TEXTO_RESULTADO[e.resultado]}. Notifique por oficio en la casilla de la empresa prestadora.</p>${err}
      <div class="ficha__botones">${boton("Firmar oficio y notificar", "notificar", "", "send")}</div></div>`;
  if (t === "subsanacion_ep" || t === "informacion_ep") return "";
  const def = PASO[p.c];
  const coaut = p.c === "firma_informe_dre" ? "<p>El informe técnico-legal es de responsabilidad conjunta con la Oficina de Asesoría Jurídica. Después de su firma pasa a la Oficina de Asesoría Jurídica.</p>"
    : p.c === "firma_informe_oaj" ? "<p>El informe técnico-legal es de responsabilidad conjunta con la Dirección de Regulación Económica. Después de su firma vuelve a la Dirección para el memorándum.</p>" : "";
  return `<div class="accion-banner"><p class="accion-banner__titulo">Le toca a usted: ${esc(def.accion.charAt(0).toLowerCase() + def.accion.slice(1))}</p>${coaut}<small>Base: ${esc(def.base)}</small>${err}
    <div class="ficha__botones">${boton(def.boton, "completar", "", "arrow_forward")}</div></div>`;
}
const CHIP_COPILOTO = { evidencia_encontrada: ["Evidencia encontrada", "exito", "task_alt"], evidencia_parcial: ["Evidencia parcial", "accion", "rule"], no_hallada: ["No hallada", "alerta", "search_off"], no_determinable: ["No determinable", "neutro", "help"] };
function revisionCopiloto(e) {
  const r = e.copiloto;
  return `<section class="copiloto"><div class="copiloto__cabecera"><h4>${ms("smart_toy")} Revisión asistida de los requisitos</h4><button type="button" class="boton boton--secundario" data-accion="copiloto">${r ? "Volver a revisar" : "Revisar con el copiloto"}</button></div>
    <p class="copiloto__aviso">Sugerencias automáticas con cita del documento. El copiloto no decide: la verificación es suya.</p>
    ${r ? `<ul class="copiloto__lista">${r.resultados.map((x) => { const c = CHIP_COPILOTO[x.estado]; const q = REQUISITOS.find((y) => y.c === x.req); const dec = r.decisiones[x.req];
      return `<li class="copiloto__item"><p class="copiloto__punto"><span class="chip chip--${c[1]}">${ms(c[2])} ${c[0]}</span> <b>${esc(q.texto)}</b></p>
      ${x.cita ? `<blockquote class="copiloto__cita">«${esc(x.cita.fragmento)}»<footer>${x.cita.doc}, página ${x.cita.pagina}${x.verificada ? " · cita verificada" : ""}</footer></blockquote>` : ""}
      <p class="copiloto__motivo">${esc(x.motivo)} Revise el documento antes de decidir.</p>
      ${dec ? `<p class="copiloto__decision">${ms("how_to_reg")} Marcó la sugerencia como ${dec}</p>` : `<div class="ficha__botones"><button type="button" class="boton boton--secundario boton--chico" data-accion="decision" data-req="${x.req}" data-valor="correcta">Correcto</button><button type="button" class="boton boton--secundario boton--chico" data-accion="decision" data-req="${x.req}" data-valor="incorrecta">No es correcto</button></div>`}</li>`; }).join("")}</ul>
      <details class="copiloto__borrador"><summary>Ver borrador de observaciones del copiloto</summary><pre>${esc(r.borrador)}</pre><button type="button" class="boton boton--secundario boton--chico" data-accion="usar-borrador">Usar como detalle de la observación</button></details>
      <p class="copiloto__aviso">Modelo: demostración sin modelo de lenguaje. Documentos sintéticos de la hackatón.</p>` : ""}</section>`;
}
function historial(e) {
  const grupos = ETAPAS.map(([c, texto]) => ({ c, texto, hitos: e.hitos.filter((h) => etapaDe(h.c) === c) })).filter((g) => g.hitos.length);
  const sig = pasoActual(e) ? siguienteCodigo(pasoActual(e).c) : null;
  const sel = ui.movimiento != null ? e.hitos[ui.movimiento] : null;
  const fila = (h) => { const i = e.hitos.indexOf(h); const def = PASO[h.c]; const dias = diasHito(h);
    const extra = [textoDias(dias), def.plazo && !def.pausa ? `plazo propio ${def.plazo}` : "", def.pausa ? "pausa del plazo de la Sunass" : "", esDatoARevisar(h) ? "dato a revisar" : ""].filter(Boolean).join(" · ");
    return `<li class="${h.fin ? "" : "recorrido__pendiente"}">${ms(h.fin ? "check_circle" : "pending")}<button type="button" class="recorrido__boton" aria-pressed="${ui.movimiento === i}" data-accion="movimiento" data-indice="${i}"><b>${esc(NOMBRE_AREA[h.a])}</b><small>${esc(def.accion)}${h.por ? ` · ${esc(h.por)}` : ""}${h.doc ? ` · ${h.doc}` : ""}</small></button>
      <span>${fmt(h.ini)} → ${h.fin ? fmt(h.fin) : "en curso"}<small>${extra}</small></span></li>`; };
  const detalle = sel ? `<aside class="movimiento"><div class="movimiento__cabecera"><h4>${esc(PASO[sel.c].accion)}</h4><button type="button" class="visor__zoom" aria-label="Cerrar el detalle" data-accion="cerrar-movimiento">×</button></div>
    ${esDatoARevisar(sel) ? `<p class="aviso aviso--alerta">Dato a revisar: la fecha de fin es anterior a la de inicio; no suma días al plazo.</p>` : ""}
    <dl class="tarjeta-tiempo__datos"><dt>Área</dt><dd>${esc(NOMBRE_AREA[sel.a])}</dd><dt>Realizó</dt><dd>${esc(sel.por || "No consta")}</dd><dt>Inicio</dt><dd>${fmt(sel.ini)}</dd><dt>Fin</dt><dd>${sel.fin ? fmt(sel.fin) : "En curso"}</dd>
    <dt>Días hábiles</dt><dd>${diasHito(sel)}${PASO[sel.c].pausa ? " (no cuentan para la Sunass)" : ""}</dd><dt>Plazo propio</dt><dd>${PASO[sel.c].plazo ? textoDias(PASO[sel.c].plazo) : "Sin plazo propio"}</dd><dt>Documento</dt><dd>${sel.doc || "—"}</dd><dt>Base</dt><dd>${esc(PASO[sel.c].base || "—")}</dd></dl></aside>` : "";
  return `<details class="historial" open><summary>Historial · ${e.hitos.length} movimientos</summary><div class="historial__cuerpo"><div>
    ${grupos.map((g) => `<section class="historial__etapa"><h4>${g.texto} <small> · ${textoDias(g.hitos.filter((h) => !PASO[h.c].pausa).reduce((s, h) => s + diasHito(h), 0))}</small></h4><ol class="recorrido">${g.hitos.map(fila).join("")}</ol></section>`).join("")}
    ${sig ? `<p class="historial__sigue">${ms("east")} Sigue: ${esc(PASO[sig].accion)} · ${esc(NOMBRE_AREA[PASO[sig].a])}</p>` : porNotificar(e) ? `<p class="historial__sigue">${ms("east")} Sigue: notificar la resolución · Dirección de Regulación Económica</p>` : ""}
    </div>${detalle}</div></details>`;
}
function plazosPorArea(e) {
  const tot = {}; e.hitos.forEach((h) => { const k = PASO[h.c].pausa ? "ep" : h.a; if (h.c === "solicitud") return; tot[k] = (tot[k] || 0) + diasHito(h); });
  const sunass = Object.entries(tot).filter(([k]) => k !== "ep").reduce((s, [, v]) => s + v, 0);
  const max = Math.max(1, ...Object.values(tot));
  return `<details class="historial"><summary>Plazos por área · ${textoDias(sunass)} de la Sunass</summary><ul class="plazos-area">${Object.entries(tot).map(([k, v]) => `<li><span>${esc(NOMBRE_AREA[k])}${k === "ep" ? " (pausa)" : ""}</span><span class="plazos-area__barra"><span style="width:${(100 * v) / max}%"></span></span><b>${textoDias(v)}</b></li>`).join("")}</ul></details>`;
}
const ETAPA_DOC = { recibida: "Recibida", requisitos: "Requisitos", evaluacion: "Evaluación", revision: "Revisión técnica y legal", aprobacion: "Aprobación interna", resolucion: "Resolución" };
function documentosSunass(e) {
  const tabla = (docs) => `<div class="tabla-envoltura"><table class="tabla"><thead><tr><th scope="col">Documento</th><th scope="col">Asunto</th><th scope="col">Fecha</th><th scope="col">Acceso</th><th scope="col"><span class="sr-only">Archivo</span></th></tr></thead>
    <tbody>${docs.map((d) => `<tr><td>${ms("description")} <b>${TIPO_DOCUMENTO[d.tipo]}</b><br>${esc(d.numero)}</td><td>${esc(d.asunto)}</td><td>${fmt(d.fecha)}</td><td>${NIVEL_ACCESO[d.acceso]}</td><td>${botonDescarga(d)}</td></tr>`).join("")}</tbody></table></div>`;
  const porEtapa = ETAPAS.map(([c]) => ({ c, docs: e.documentos.filter((d) => etapaDe(d.hito) === c) })).filter((g) => g.docs.length)
    .map((g) => `<details class="documentos-etapa" open><summary>${ms("folder")} ${ETAPA_DOC[g.c]} · ${g.docs.length}</summary>${tabla(g.docs)}</details>`).join("");
  return `<section class="ficha-dre__documentos"><div class="ficha-dre__documentos-cabecera"><h3>Documentos · ${e.documentos.length}</h3><div class="orden" role="group" aria-label="Vista de documentos">
    <button type="button" aria-pressed="${ui.docVista === "lista"}" data-accion="doc-vista" data-valor="lista">Lista</button><button type="button" aria-pressed="${ui.docVista === "etapa"}" data-accion="doc-vista" data-valor="etapa">Por etapa</button></div></div>
    ${e.documentos.length === 0 ? `<p class="sunass__vacio">Sin documentos.</p>` : ui.docVista === "lista" ? tabla(e.documentos) : porEtapa}</section>`;
}
function barra(usado, total, etiqueta) {
  const prop = Math.min(1, total > 0 ? usado / total : 1); const tono = usado > total ? "vencido" : prop >= 0.8 ? "alerta" : "bien";
  return `<div class="barra-tiempo barra-tiempo--${tono}" role="meter" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${Math.min(usado, total)}" aria-label="${etiqueta}"><span style="width:${prop * 100}%"></span></div>`;
}
function tarjetasTiempo(e, area) {
  const pp = plazoPaso(e); const pa = pasoActual(e); const t = tareaDe(e, area);
  let paso = "";
  if (pp) {
    const restan = pp.plazoDiasHabiles != null ? pp.plazoDiasHabiles - pp.diasEnArea : null;
    paso = `<section class="tarjeta-tiempo"><h3>${t ? "Su tiempo para este paso" : `Tiempo en ${esc(NOMBRE_AREA[pa ? pa.a : "dre"])}`}</h3><p class="tarjeta-tiempo__paso">${pa ? esc(PASO[pa.c].accion) : "Notificar la resolución"}</p>
      ${pp.plazoDiasHabiles != null ? `<p class="tarjeta-tiempo__vence">${pp.estaVencido ? "Venció" : "Vence"} el ${fmt(pp.venceEl)}</p><p class="tarjeta-tiempo__cifra">${pp.estaVencido ? `${textoDias(-restan)} de retraso` : `Le queda${restan === 1 ? "" : "n"} ${textoDias(restan)}`}</p>${barra(pp.diasEnArea, pp.plazoDiasHabiles, "Días usados del plazo del paso")}
        <small>${pa ? `Plazo propio del paso: ${textoDias(pp.plazoDiasHabiles)}.` : `Plazo legal: 5 días desde la resolución (${LEY}, art. 24.1).`}</small>`
        : `<p class="tarjeta-tiempo__cifra">${textoDias(pp.diasEnArea)} en el área</p><small>Este paso no tiene plazo propio: cuenta dentro de los 30 días hábiles del procedimiento.</small>`}</section>`;
  }
  const p = plazo(e);
  const SIT = { en_plazo: "En plazo", vencido: "Plazo vencido: aún se puede notificar", silencio_configurado: "Silencio positivo configurado", resuelto_en_plazo: "Resuelto en plazo", resuelto_tras_silencio: "Resuelto después del plazo de silencio" };
  return `<aside class="tarjetas-tiempo" aria-label="Plazos">${paso}<section class="tarjeta-tiempo"><h3>Plazo del procedimiento</h3><p class="tarjeta-tiempo__cifra">Día ${Math.min(p.diaDelPlazo, 30)} de 30</p>${barra(p.diaDelPlazo, 30, "Días hábiles usados del plazo del procedimiento")}
    <dl class="tarjeta-tiempo__datos"><dt>Resolver hasta</dt><dd>${fmt(p.fechaLimite)}</dd><dt>Notificar hasta</dt><dd>${fmt(p.fechaLimiteNotificacion)}</dd><dt>Situación</dt><dd>${SIT[p.situacion]}</dd></dl>
    <small>30 días hábiles. Si la resolución no se notifica hasta la fecha indicada, opera el silencio administrativo positivo (Reglamento General de Tarifas, art. 89.8; ${LEY}, art. 188.1). Los días que la empresa prestadora tarda en subsanar o responder no se cuentan.</small></section></aside>`;
}

/* ===== Panel gerencial (solo Dirección de Regulación Económica) ===== */
const SEMAFORO = { silencio: ["Silencio positivo", "alerta", "gpp_maybe"], vencido: ["Plazo vencido", "alerta", "event_busy"], riesgo: ["Por vencer", "accion", "warning"], en_plazo: ["En plazo", "informacion", "schedule"], resuelto_en_plazo: ["Resuelto en plazo", "exito", "check_circle"], resuelto_fuera: ["Resuelto fuera de plazo", "alerta", "history"], sin_plazo: ["Sin plazo", "neutro", "remove"] };
function pintarPanel() {
  if (cuenta().area !== "dre") return `<div class="eps">${encabezadoSunass("/sunass/panel")}<main class="panel"><p class="sunass__vacio" role="status">El panel gerencial es de la Dirección de Regulación Económica.</p></main></div>`;
  const corte = ui.corte || hoy(); const da = ui.diasAlerta;
  const ufi = estado.expedientes.filter((e) => e.codigo.startsWith("UFI-") && e.fechaInicio <= corte);
  const tramite = ufi.filter((e) => e.estado === "en_tramite" || porNotificar(e));
  const sem = (e) => semaforo(e, corte, da);
  const resueltos = ufi.filter((e) => e.fechaNotificacion);
  const enPlazo = resueltos.filter((e) => sem(e) === "resuelto_en_plazo").length;
  const vto = tramite.map((e) => ({ e, p: plazo(e, corte), s: sem(e) })).sort((a, b) => a.p.diasRestantes - b.p.diasRestantes).slice(0, 50);
  const porArea = {}; const fuera = [];
  ufi.forEach((e) => e.hitos.forEach((h) => { const def = PASO[h.c]; if (h.c === "solicitud" || def.pausa || h.ini > corte) return; const fin = h.fin && h.fin <= corte ? h.fin : corte; const d = habilesEntre(h.ini, fin);
    (porArea[h.a] = porArea[h.a] || []).push(d); if (def.plazo && d > def.plazo) fuera.push({ e, h, d, plazo: def.plazo, enCurso: !h.fin || h.fin > corte }); }));
  e_pausa(ufi, corte, fuera);
  const tiempos = Object.entries(porArea).map(([a, v]) => ({ a, prom: v.reduce((s, x) => s + x, 0) / v.length, max: Math.max(...v), n: v.length })).sort((x, y) => y.prom - x.prom);
  const maxT = Math.max(1, ...tiempos.map((t) => t.prom));
  const ind = (cls, label, n, small) => `<li class="indicador${cls}"><span>${label}</span><b>${n}</b><small>${small}</small></li>`;
  return `<div class="eps">${encabezadoSunass("/sunass/panel")}<main class="panel">
  <header class="panel__titulo"><h1>Panel gerencial · uso excepcional del fondo de inversiones</h1><p>Fechas en días hábiles según el Reglamento General de Tarifas y el ${LEY}, calculadas con los expedientes registrados.</p></header>
  <section class="panel__bloque" aria-labelledby="parametros"><h2 id="parametros">Parámetros</h2><div class="panel__controles panel__controles--fila" role="group" aria-label="Parámetros del cálculo">
    <label class="campo"><span>Fecha de corte</span><input type="date" id="corte" value="${corte}"></label><label class="campo"><span>Alerta «por vencer» (días hábiles)</span><input type="number" id="dias-alerta" min="1" max="30" value="${da}"></label></div></section>
  <section aria-labelledby="indicadores"><h2 id="indicadores" class="sr-only">Indicadores</h2><ul class="indicadores">
    ${ind("", "En trámite", tramite.length, `al ${fmt(corte)}`)}${ind(" indicador--accion", `${ms("warning")} Por vencer`, vto.filter((x) => x.s === "riesgo").length, `vencen en ${textoDias(da)} o menos`)}
    ${ind(" indicador--alerta", `${ms("event_busy")} Plazo vencido`, vto.filter((x) => x.s === "vencido").length, "sin resolución dentro del plazo")}${ind(" indicador--alerta", `${ms("gpp_maybe")} Silencio positivo`, vto.filter((x) => x.s === "silencio").length, "sin notificar en el plazo más 5 días")}
    ${ind("", "Resueltos en plazo", resueltos.length ? `${Math.round((100 * enPlazo) / resueltos.length)} %` : "—", "de los resueltos con plazo legal")}</ul></section>
  <section class="panel__bloque" aria-labelledby="vencimientos"><h2 id="vencimientos">Calendario de vencimientos (en trámite)</h2>${vto.length === 0 ? `<p class="sunass__vacio">No hay expedientes en trámite con plazo legal.</p>` : `<div class="tabla-envoltura"><table class="tabla">
    <caption>Ordenado por días hábiles restantes. Límite para notificar = fecha límite + 5 días (${LEY}, art. 24.1). Máximo 50 filas.</caption>
    <thead><tr><th scope="col">Expediente</th><th scope="col">Lo tiene</th><th scope="col">Día</th><th scope="col">Fecha límite</th><th scope="col">Límite para notificar</th><th scope="col">Restan</th><th scope="col">Situación</th></tr></thead>
    <tbody>${vto.map(({ e, p, s }) => `<tr><td><b>${e.codigo}</b><br>${esc(EPS[e.eps].nombre)}</td><td>${esc(NOMBRE_AREA[areaActual(e)] || "—")}</td><td>${p.diaDelPlazo} / 30</td><td>${fmt(p.fechaLimite)}</td><td>${fmt(p.fechaLimiteNotificacion)}</td><td>${p.diasRestantes >= 0 ? textoDias(p.diasRestantes) : `${textoDias(-p.diasRestantes)} de retraso`}</td><td><span class="chip chip--${SEMAFORO[s][1]}">${ms(SEMAFORO[s][2])} ${SEMAFORO[s][0]}</span></td></tr>`).join("")}</tbody></table></div>`}</section>
  <div class="panel__dos"><section class="panel__bloque" aria-labelledby="cuello"><h2 id="cuello">¿Dónde se demora? Días hábiles promedio por área</h2>
    <ul class="barras">${tiempos.map((t) => `<li class="barras__fila" title="${esc(NOMBRE_AREA[t.a])}: promedio ${t.prom.toFixed(1)} días hábiles, máximo ${t.max}, ${t.n} pasos"><span class="barras__etiqueta">${esc(NOMBRE_AREA[t.a])}</span><span class="barras__pista"><span class="barras__barra" style="width:${(100 * t.prom) / maxT}%"></span></span><span class="barras__valor">${t.prom.toFixed(1)}</span></li>`).join("")}</ul>
    <p class="actualizacion">Incluye pasos en curso hasta la fecha de corte. No incluye a la empresa prestadora ni los días que no cuentan para la Sunass.</p></section>
  <section class="panel__bloque" aria-labelledby="pasos"><h2 id="pasos">Pasos que superaron su plazo propio</h2><p class="actualizacion">Plazos propios: derivación de la Dirección de Regulación Económica 1 día hábil; subsanación 2; información adicional hasta 10.</p>
    ${fuera.length === 0 ? `<p class="sunass__vacio">Ningún paso superó su plazo propio.</p>` : `<div class="tabla-envoltura"><table class="tabla"><thead><tr><th scope="col">Expediente</th><th scope="col">Área</th><th scope="col">Tardó</th></tr></thead><tbody>${fuera.map((f) => `<tr><td>${f.e.codigo}</td><td>${esc(NOMBRE_AREA[f.h.a])}</td><td class="dias--alto">${f.d} de ${textoDias(f.plazo)}${f.enCurso ? " · en curso" : ""}</td></tr>`).join("")}</tbody></table></div>`}</section></div>
  <p class="actualizacion">Calendario: lunes a viernes sin feriados nacionales; el día 1 es el hábil siguiente al inicio. Datos sintéticos de la hackatón.</p></main></div>`;
}
/** Plazos propios de la empresa prestadora (subsanación e información): también se listan. */
function e_pausa(ufi, corte, fuera) {
  ufi.forEach((e) => e.hitos.forEach((h) => { const def = PASO[h.c]; if (!def.pausa || h.ini > corte) return; const d = habilesEntre(h.ini, h.fin && h.fin <= corte ? h.fin : corte); const ped = e.pedidos.find((p) => p.fecha === h.ini); const pl = ped ? ped.plazo : def.plazo; if (d > pl) fuera.push({ e, h, d, plazo: pl, enCurso: !h.fin || h.fin > corte }); }));
}

/* ===== Expedientes con el copiloto ===== */
function pintarExpedientes() {
  const ufi = estado.expedientes.filter((e) => e.codigo.startsWith("UFI-")).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
  return `<div class="eps">${encabezadoSunass("/sunass/expedientes")}<main class="panel"><header class="panel__titulo"><h1>Expedientes</h1><p>Uso excepcional del fondo de inversiones. Revise cada expediente con el copiloto, que cita el documento y la página. Usted decide.</p></header>
  <div class="tabla-envoltura"><table class="tabla"><thead><tr><th scope="col">Expediente</th><th scope="col">Empresa prestadora</th><th scope="col">Presentado</th><th scope="col">Dónde está</th><th scope="col">Copiloto</th><th scope="col"><span class="sr-only">Acción</span></th></tr></thead>
  <tbody>${ufi.map((e) => { const anexos = e.documentos.some((d) => d.tipo === "anexo"); return `<tr><td><b>${e.codigo}</b></td><td>${esc(EPS[e.eps].nombre)}</td><td>${fmt(e.fechaInicio)}</td><td>${estaAbierto(e) ? esc(NOMBRE_AREA[areaActual(e)]) : TEXTO_RESULTADO[e.resultado] || "Concluido"}</td><td>${anexos ? "Documentos indexados" : "Sin documentos indexados"}</td><td>${anexos ? `<a class="boton boton--secundario" href="#/sunass/expedientes/${e.codigo}">Revisar con copiloto</a>` : "—"}</td></tr>`; }).join("")}</tbody></table></div></main></div>`;
}
function pintarEvaluar(codigo) {
  const e = buscar(codigo); if (!e) return pintarExpedientes();
  const r = e.copiloto || evaluarConCopiloto(e);
  const puntos = [...r.resultados.map((x) => ({ ...x, titulo: REQUISITOS.find((q) => q.c === x.req).texto, base: REQUISITOS.find((q) => q.c === x.req).base })),
    { req: "OCR", estado: "no_determinable", titulo: "Documento escaneado sin texto (versión futura: reconocimiento de texto)", base: "Versión futura: OCRmyPDF con Tesseract en español, dentro del contenedor del copiloto", motivo: "El PDF no trae texto: el copiloto no puede citarlo y responde «no determinable: requiere OCR»." }];
  const ESTADO = { evidencia_encontrada: ["encontrado", "Encontrado", "cita verificada", "exito"], evidencia_parcial: ["parcial", "Parcial", "confirmar a mano", "accion"], no_hallada: ["no-encontrado", "No encontrado", "sin evidencia", "alerta"], no_determinable: ["parcial", "No determinable", "revisar a mano", "neutro"] };
  const sel = puntos[Math.min(ui.punto, puntos.length - 1)];
  const revisados = puntos.filter((p) => ui.revisados[codigo + p.req]).length;
  const resp = ui.respuesta;
  return `<div class="eps">${encabezadoSunass("/sunass/expedientes")}<main class="copiloto-vista">
  <div class="copiloto-vista__titulo"><div><a class="enlace-volver" href="#/sunass/expedientes">${ms("arrow_back")} Volver a expedientes</a><h1>Revisar expediente con copiloto</h1><p>${e.codigo} · ${esc(EPS[e.eps].nombre)}</p></div>
    <div class="copiloto-vista__acciones"><span class="chip chip--informacion">IA · usted decide</span><button type="button" class="boton" aria-pressed="${ui.preguntar}" data-accion="preguntar">${ms(ui.preguntar ? "description" : "forum")} ${ui.preguntar ? "Ver documento" : "Preguntar al expediente"}</button></div></div>
  <div class="copiloto-vista__cuerpo"><section class="indispensable"><div class="indispensable__cabecera"><h2>Lo indispensable</h2><p>${revisados} de ${puntos.length} revisados por usted</p>${barra(revisados, puntos.length, "Puntos revisados")}</div>
    <ul class="indispensable__lista">${puntos.map((p, i) => { const s = ESTADO[p.estado]; const rev = ui.revisados[codigo + p.req];
      return `<li class="punto punto--${s[0]}" ${i === ui.punto ? 'aria-current="true"' : ""}><button type="button" class="punto__abrir" data-accion="punto" data-indice="${i}"><span class="punto__estado">${s[1]}</span><span class="punto__titulo">${esc(p.titulo)}</span></button>
      <div class="punto__etiquetas"><span class="punto__etiqueta">${p.cita ? `${p.cita.doc} · pág. ${p.cita.pagina}` : "Expediente completo"}</span><span class="punto__etiqueta punto__etiqueta--${s[3]}">${s[2]}</span>${rev ? '<span class="punto__etiqueta">Revisado por usted</span>' : ""}</div>
      <small class="punto__base">Base: ${esc(p.base)}</small>
      ${rev ? `<p class="punto__registro">${ms("check")} Revisado · registrado por usted</p>` : `<div class="punto__botones"><button type="button" class="boton boton--secundario boton--chico" data-accion="revisar-punto" data-req="${p.req}">${p.estado === "no_hallada" ? "Confirmar que falta" : "Marcar revisado"}</button><button type="button" class="boton boton--secundario boton--chico" data-accion="revisar-punto" data-req="${p.req}">${p.estado === "no_hallada" ? "Sí está en el expediente" : "No es correcto"}</button></div>`}</li>`; }).join("")}</ul>
    <p class="copiloto__aviso">La IA puede omitir o interpretar mal un pasaje. Verifique siempre en el documento.</p></section>
  <section class="visor">${ui.preguntar ? `<div class="preguntar"><form class="preguntar__formulario" id="form-pregunta"><label class="campo"><span>Pregunta sobre ${e.codigo}</span><input name="pregunta" placeholder="Ej.: ¿Cuál es el motivo de la solicitud?"></label><button class="boton" type="submit">Preguntar</button></form>
      ${resp ? `<div class="preguntar__respuesta"><p>${esc(resp.respuesta)}</p>${resp.cita ? `<blockquote class="copiloto__cita">«${esc(resp.cita.fragmento)}»<footer>${resp.cita.doc}, página ${resp.cita.pagina}</footer></blockquote>` : ""}<p class="copiloto__aviso">${resp.estado === "respondida" ? "Respuesta con cita: verifíquela en el documento." : "Sin evidencia en los documentos indexados."}</p></div>` : ""}</div>`
    : `<div class="visor__barra">${ms("description")}<span class="visor__nombre"><b>${sel.cita ? sel.cita.doc : e.codigo}</b><small>${sel.cita ? `Página ${sel.cita.pagina}` : "Expediente completo"}</small></span><button type="button" class="visor__zoom" aria-label="Alejar">−</button><span>100 %</span><button type="button" class="visor__zoom" aria-label="Acercar">+</button></div>
      <div class="visor__hoja"><p class="visor__rotulo">Texto extraído del documento</p>${sel.cita ? `<p>…</p><p><mark class="visor__resaltado">${esc(sel.cita.fragmento)}</mark></p><p>…</p><p class="visor__pagina">Página ${sel.cita.pagina}</p>` : `<p>${esc(sel.motivo)}</p>${sel.req === "OCR" ? `<p class="aviso aviso--informacion">Versión futura: el PDF escaneado se convierte con reconocimiento de texto antes de indexarlo, sin enviar documentos a terceros.</p>` : ""}`}</div>
      ${sel.cita ? `<p class="visor__pie">❞ ${sel.cita.doc} · pág. ${sel.cita.pagina} · ${ESTADO[sel.estado][2]}</p>` : ""}`}
    <p class="copiloto__aviso">Documento ilustrativo · datos de demostración.</p></section></div></main></div>`;
}
