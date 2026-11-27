/* ---------- Guion de la demo: cada paso parte del estado que dejan los anteriores ---------- */
const sugerirEquipo = () => {
  const carga = (id) => estado.expedientes.filter((x) => x.estado === "en_tramite" && x.equipo.includes(id)).length;
  const mejor = (rol) => ESPECIALISTAS.filter((s) => s.rol === rol).sort((a, b) => carga(a.id) - carga(b.id))[0].id;
  return [mejor("verifica_tupa"), mejor("evalua_informa")];
};
const nuevo = () => buscar(estado.guionCodigo);
const por = (id) => { const c = CUENTAS.find((x) => x.id === id); return `${c.cargo} · cuenta de demostración`; };
const ACCIONES_GUION = [
  () => { estado.guionCodigo = crearSolicitud("EPS07", "Rotura de línea de conducción por huaico", ["UFI-R01", "UFI-R03"]).codigo; },
  () => completarGenerico(nuevo(), por("dre")),
  () => formarEquipo(nuevo(), sugerirEquipo(), por("srt")),
  () => { evaluarConCopiloto(nuevo()); registrarVerificacion(nuevo(), false, ["UFI-R02"], "No se adjuntaron los documentos que sustentan la propuesta: presupuesto, costos unitarios y cronograma."); },
  () => firmarOficio(nuevo(), por("srt")),
  () => responderPedido(nuevo(), {}),
  () => { registrarEvaluacion(nuevo(), true); ["equipo_srt", "srt", "dre", "oaj", "dre", "gg"].forEach((a) => completarGenerico(nuevo(), a === "equipo_srt" ? nombreEsp(nuevo(), "evalua_informa") : por(a))); },
  () => resolver(nuevo(), "aprobado_parcial", por("cd")),
  () => notificar(nuevo()),
  () => {}, () => {}, () => {},
];
const GUION = [
  { cuenta: "eps07", ruta: "/eps/nueva-solicitud", titulo: "La empresa prestadora presenta su solicitud sin un documento", hacer: "Escriba el asunto, adjunte el informe y la propuesta de devolución, y deje sin adjuntar el sustento. Pulse «Enviar solicitud».", destacar: "La mesa de partes no rechaza una solicitud incompleta: la constancia registra lo que falta. El código y el vencimiento los genera el sistema." },
  { cuenta: "dre", ruta: "/sunass/inicio", sel: true, titulo: "La Dirección de Regulación Económica ve el expediente y lo deriva", hacer: "Muestre el orden por prioridad y «Le toca a usted». Pulse «Derivar a la Subdirección de Regulación Tarifaria».", destacar: "La derivación tiene 1 día hábil. El UFI-2026-0002 ya se pasó de ese plazo: aparecerá en el panel." },
  { cuenta: "srt", ruta: "/sunass/inicio", sel: true, titulo: "La Subdirección de Regulación Tarifaria forma el equipo", hacer: "Muestre los especialistas sugeridos por menor carga y pulse «Formar equipo».", destacar: "La carga de cada especialista está a la vista. El equipo queda registrado en el expediente." },
  { cuenta: "equipo_srt", ruta: "/sunass/inicio", sel: true, titulo: "El Equipo de especialistas verifica los requisitos con el copiloto", hacer: "Pulse «Revisar con el copiloto», marque las sugerencias, elija «No cumple», marque el sustento y use el borrador. Pulse «Registrar verificación».", destacar: "El copiloto cita documento y página, pero nunca decide: la verificación es de la persona." },
  { cuenta: "srt", ruta: "/sunass/inicio", sel: true, titulo: "La Subdirección firma el oficio de subsanación", hacer: "Revise el borrador del oficio y pulse «Firmar oficio y notificar».", destacar: "Desde la firma, los días de la empresa prestadora no se cuentan: la fecha límite se corre sola." },
  { cuenta: "eps07", ruta: "/eps/tramites", sel: true, titulo: "La empresa prestadora recibe el aviso y subsana", hacer: "Abra la campana, entre a la ficha («¿Debe hacer algo? Sí»), adjunte el PDF y pulse «Enviar subsanación».", destacar: "La empresa prestadora entiende qué debe hacer y hasta cuándo, sin llamar a la Sunass." },
  { cuenta: "equipo_srt", ruta: "/sunass/inicio", sel: true, titulo: "Evaluación, informe, firmas y elevación", hacer: "Elija «Sí, es suficiente» y registre la evaluación. Al pulsar «Siguiente», el guion aplica el informe, el visado, las dos firmas, el memorándum y la elevación.", destacar: "Cada firma queda en el historial con el área y la fecha; nadie puede saltarse un paso." },
  { cuenta: "cd", ruta: "/sunass/inicio", sel: true, titulo: "El Consejo Directivo resuelve", hacer: "Pulse «Aprobar en parte».", destacar: "La empresa prestadora verá «Resolución por notificar», sin el resultado, hasta que se le notifique." },
  { cuenta: "dre", ruta: "/sunass/inicio", sel: true, titulo: "La Dirección de Regulación Económica notifica", hacer: "Muestre «Su tiempo para este paso» (5 días) y pulse «Firmar oficio y notificar».", destacar: "Si no se notifica dentro del plazo más 5 días, opera el silencio positivo y el panel lo marca." },
  { cuenta: "dre", ruta: "/sunass/inicio", selCodigo: "UFI-2026-0001", titulo: "El director verifica el expediente por etapa", hacer: "Abra un movimiento del historial, luego «Plazos por área» y «Documentos · Por etapa». El UFI-2026-0001 tiene fechas reales; el de la demo también está en «Concluidos».", destacar: "El director revisa cada etapa sin pedir el expediente en papel y ve en qué área se fue el tiempo." },
  { cuenta: "dre", ruta: "/sunass/panel", titulo: "El director cierra con su panel gerencial", hacer: "Muestre los indicadores, el calendario de vencimientos y los pasos fuera de plazo. Cambie la fecha de corte.", destacar: "El panel es solo de la Dirección de Regulación Económica: las demás áreas no lo ven." },
  { cuenta: "equipo_srt", ruta: "/sunass/expedientes/", nuevoEnRuta: true, punto: 3, titulo: "Versión futura: lectura de PDF escaneados", hacer: "Muestre el punto «No determinable» del documento escaneado.", destacar: "Se presenta como versión futura: reconocimiento de texto dentro del contenedor del copiloto, sin enviar documentos a terceros." },
];
function limpiarUi() { Object.assign(ui, { sel: {}, mensaje: "", mensajeEp: "", campana: false, movimiento: null, equipoMarcados: null, verif: null, observados: [], detalleObs: "", eval: null, detallePedido: "", error: "", errorAccion: "", constancia: null, punto: 0, preguntar: false, respuesta: null, filtroElegido: false, verConcluidos: false, nueva: { asunto: "", archivos: {} } }); }
function guionIr(k) {
  k = Math.max(1, Math.min(GUION.length, k));
  estado = semilla();
  for (let i = 0; i < k - 1; i++) ACCIONES_GUION[i]();
  const g = GUION[k - 1];
  estado.guion = k; estado.sesion = { cuenta: g.cuenta };
  limpiarUi();
  if (g.sel) { ui.sel.sunass = estado.guionCodigo; ui.sel.ep = estado.guionCodigo; }
  if (g.selCodigo) ui.sel.sunass = g.selCodigo;
  if (k === 1) ui.nueva = { asunto: "Rotura de línea de conducción por huaico", archivos: {} };
  if (k === 6) ui.filtroEp = "accion";
  if (g.punto != null) ui.punto = g.punto;
  guardar();
  const destino = g.nuevoEnRuta ? g.ruta + estado.guionCodigo : g.ruta;
  if (location.hash.slice(1) === destino) render(); else location.hash = destino;
}
function barraGuion() {
  if (!estado.guion) return `<button type="button" class="guion-abrir" data-accion="guion-abrir">${ms("slideshow")} Guion de la demo</button>`;
  const k = estado.guion; const g = GUION[k - 1]; const c = CUENTAS.find((x) => x.id === g.cuenta);
  if (ui.guionOculto) return `<button type="button" class="guion-abrir" data-accion="guion-mostrar">${ms("slideshow")} Paso ${k} de ${GUION.length}</button>`;
  return `<aside class="guion" aria-label="Guion de la demo"><div class="guion__cabecera"><span class="guion__paso">Guion de la demo · Paso ${k} de ${GUION.length}</span>
    <span><button type="button" class="guion__icono" data-accion="guion-ocultar" aria-label="Ocultar el guion">${ms("expand_more")}</button><button type="button" class="guion__icono" data-accion="guion-salir" aria-label="Salir del guion">${ms("close")}</button></span></div>
    <p class="guion__titulo">${esc(g.titulo)}</p><p class="guion__cuenta">${ms("person")} ${esc(c.etiqueta)}</p>
    <p><b>Qué hacer:</b> ${esc(g.hacer)}</p><p class="guion__destacar"><b>Qué destacar:</b> ${esc(g.destacar)}</p>
    <div class="guion__botones"><button type="button" class="boton boton--secundario boton--chico" data-accion="guion-anterior" ${k === 1 ? "disabled" : ""}>${ms("arrow_back")} Anterior</button>
    <select id="guion-paso" aria-label="Ir al paso">${GUION.map((x, i) => `<option value="${i + 1}" ${i + 1 === k ? "selected" : ""}>${i + 1}. ${esc(x.titulo)}</option>`).join("")}</select>
    <button type="button" class="boton boton--chico" data-accion="guion-siguiente" ${k === GUION.length ? "disabled" : ""}>Siguiente ${ms("arrow_forward")}</button></div></aside>`;
}

/* ---------- Enrutador ---------- */
const ruta = () => decodeURIComponent(location.hash.slice(1)) || "/ingreso";
function inicioDe(c) { return c.institucion === "eps" ? "/eps/tramites" : c.id === "admin" ? "/admin" : "/sunass/inicio"; }
function render() {
  const r = ruta(); const c = cuenta(); let html; let titulo = "Ingreso";
  if (r === "/solicitar-acceso") { html = pintarSolicitarAcceso(); titulo = "Solicitar acceso"; }
  else if (!c || r === "/ingreso") html = pintarIngreso();
  else if (c.institucion === "eps") { if (!r.startsWith("/eps")) { location.hash = inicioDe(c); return; } html = r === "/eps/nueva-solicitud" ? pintarNuevaSolicitud() : pintarTramites(); titulo = r === "/eps/nueva-solicitud" ? "Nueva solicitud" : "Mis solicitudes"; }
  else if (c.id === "admin") { html = pintarAdmin(); titulo = "Solicitudes de acceso"; }
  else if (!r.startsWith("/sunass")) { location.hash = inicioDe(c); return; }
  else if (r === "/sunass/panel") { html = pintarPanel(); titulo = "Panel gerencial"; }
  else if (r.startsWith("/sunass/expedientes/")) { html = pintarEvaluar(r.split("/")[3]); titulo = "Revisar con copiloto"; }
  else if (r === "/sunass/expedientes") { html = pintarExpedientes(); titulo = "Expedientes"; }
  else { html = pintarBandeja(); titulo = "Bandeja"; }
  const foco = document.activeElement && document.activeElement.id;
  document.getElementById("app").innerHTML = html + barraGuion() + (ui.aviso ? `<div class="aviso-flotante" role="status">${esc(ui.aviso)}</div>` : "");
  document.title = `${titulo} · SutuyWeb`;
  if (foco && document.getElementById(foco)) document.getElementById(foco).focus();
  const sel = document.getElementById("cuenta-demo"); if (sel && ui.cuentaElegida) { sel.value = ui.cuentaElegida; llenarIngreso(ui.cuentaElegida); }
}
function llenarIngreso(id) {
  const c = CUENTAS.find((x) => x.id === id); const f = document.getElementById("form-ingreso"); if (!c || !f) return;
  f.usuario.value = c.usuario; f.clave.value = "demostracion"; if (f.ruc) f.ruc.value = c.ruc || "";
}
function avisar(t) { ui.aviso = t; render(); clearTimeout(avisar.t); avisar.t = setTimeout(() => { ui.aviso = ""; render(); }, 3500); }
function actuar(fn) {
  const e = buscar(ui.sel.sunass);
  try { ui.mensaje = fn(e); ui.errorAccion = ""; Object.assign(ui, { equipoMarcados: null, verif: null, observados: [], detalleObs: "", eval: null, detallePedido: "", movimiento: null }); } catch (err) { ui.errorAccion = String(err.message || err); }
  guardar(); render();
}

/* ---------- Eventos ---------- */
document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-accion]"); if (!b) return;
  const a = b.dataset.accion; const c = cuenta();
  switch (a) {
    case "tab": ui.tab = b.dataset.valor; ui.error = ""; ui.cuentaElegida = null; render(); break;
    case "ver-clave": { const i = b.parentElement.querySelector("input"); i.type = i.type === "password" ? "text" : "password"; b.querySelector(".ms").textContent = i.type === "password" ? "visibility" : "visibility_off"; break; }
    case "salir": estado.sesion = null; limpiarUi(); ui.cuentaElegida = null; guardar(); location.hash = "/ingreso"; break;
    case "adelantar": { let x = sumarDias(estado.hoy, 1); while (!esHabil(x)) x = sumarDias(x, 1); estado.hoy = x; guardar(); avisar(`Fecha simulada: ${fmt(x)}.`); break; }
    case "restablecer": { const s = estado.sesion; estado = semilla(); estado.sesion = s; limpiarUi(); guardar(); avisar("Datos restablecidos a la semilla."); break; }
    case "campana": ui.campana = !ui.campana; render(); break;
    case "abrir-aviso": ui.sel.ep = b.dataset.codigo; ui.campana = false; ui.filtroEp = grupoEp(buscar(b.dataset.codigo)) === "concluidos" ? "concluidos" : grupoEp(buscar(b.dataset.codigo)); ui.filtroElegido = true; location.hash = "/eps/tramites"; render(); break;
    case "filtro-ep": ui.filtroEp = b.dataset.valor; ui.filtroElegido = true; render(); break;
    case "sel-ep": ui.sel.ep = b.dataset.codigo; ui.mensajeEp = ""; render(); break;
    case "ver-mis": ui.constancia = null; ui.nueva = { asunto: "", archivos: {} }; break;
    case "sel-sunass": ui.sel.sunass = b.dataset.codigo; Object.assign(ui, { mensaje: "", errorAccion: "", movimiento: null, equipoMarcados: null, verif: null, eval: null }); render(); break;
    case "orden": ui.orden = b.dataset.valor; render(); break;
    case "ver-concluidos": ui.verConcluidos = !ui.verConcluidos; render(); break;
    case "completar": actuar((e) => completarGenerico(e, por(c.id))); break;
    case "firmar-oficio": actuar((e) => firmarOficio(e, por(c.id))); break;
    case "resolver": actuar((e) => resolver(e, "aprobado", por(c.id))); break;
    case "resolver-parcial": actuar((e) => resolver(e, "aprobado_parcial", por(c.id))); break;
    case "denegar": actuar((e) => resolver(e, "denegado", por(c.id))); break;
    case "notificar": actuar((e) => notificar(e)); break;
    case "copiloto": evaluarConCopiloto(buscar(ui.sel.sunass)); guardar(); render(); break;
    case "decision": buscar(ui.sel.sunass).copiloto.decisiones[b.dataset.req] = b.dataset.valor; guardar(); render(); break;
    case "usar-borrador": { const e = buscar(ui.sel.sunass); ui.verif = "no"; ui.observados = e.copiloto.resultados.filter((x) => x.estado === "no_hallada").map((x) => x.req); ui.detalleObs = e.copiloto.borrador.split("\n").slice(2).join(" ").replace(/^· /, ""); render(); break; }
    case "movimiento": { const i = +b.dataset.indice; ui.movimiento = ui.movimiento === i ? null : i; render(); break; }
    case "cerrar-movimiento": ui.movimiento = null; render(); break;
    case "doc-vista": ui.docVista = b.dataset.valor; render(); break;
    case "ver-pdf": avisar(`${b.dataset.doc}: en la aplicación se abre el PDF con un enlace temporal. Aquí es un documento sintético.`); break;
    case "prorroga": avisar("La prórroga se pide una sola vez y antes del vencimiento (Reglamento General de Tarifas, art. 89.6)."); break;
    case "ejemplo": { const r = b.dataset.req; if (b.dataset.destino === "nueva") ui.nueva.archivos[r] = `ejemplo-${r.toLowerCase()}.pdf`; else { ui.ejemplos = ui.ejemplos || {}; ui.ejemplos[r] = true; } render(); break; }
    case "preguntar": ui.preguntar = !ui.preguntar; ui.respuesta = null; render(); break;
    case "punto": ui.punto = +b.dataset.indice; ui.preguntar = false; render(); break;
    case "revisar-punto": ui.revisados[ruta().split("/")[3] + b.dataset.req] = true; render(); break;
    case "guion-abrir": guionIr(1); break;
    case "guion-siguiente": guionIr(estado.guion + 1); break;
    case "guion-anterior": guionIr(estado.guion - 1); break;
    case "guion-salir": estado.guion = null; guardar(); render(); break;
    case "guion-ocultar": ui.guionOculto = true; render(); break;
    case "guion-mostrar": ui.guionOculto = false; render(); break;
  }
});
document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.id === "cuenta-demo") { const c = CUENTAS.find((x) => x.id === t.value); if (!c) return; ui.cuentaElegida = c.id; ui.tab = c.institucion; ui.error = ""; render(); return; }
  if (t.id === "guion-paso") { guionIr(+t.value); return; }
  if (t.dataset.requisito) { if (t.files[0]) ui.nueva.archivos[t.dataset.requisito] = t.files[0].name; else delete ui.nueva.archivos[t.dataset.requisito]; render(); return; }
  if (t.dataset.especialista) { const id = t.dataset.especialista; ui.equipoMarcados = t.checked ? [...ui.equipoMarcados, id] : ui.equipoMarcados.filter((x) => x !== id); render(); return; }
  if (t.dataset.observado) { const r = t.dataset.observado; ui.observados = t.checked ? [...ui.observados, r] : ui.observados.filter((x) => x !== r); render(); return; }
  if (t.name === "verif") { ui.verif = t.value; if (t.value === "no" && !ui.observados.length) ui.observados = REQUISITOS.filter((r) => !buscar(ui.sel.sunass).documentos.some((d) => d.req === r.c)).map((r) => r.c); render(); return; }
  if (t.name === "eval") { ui.eval = t.value; render(); return; }
  if (t.id === "corte") { ui.corte = t.value; render(); return; }
  if (t.id === "dias-alerta") { ui.diasAlerta = Math.min(30, Math.max(1, +t.value || 1)); render(); return; }
});
document.addEventListener("input", (ev) => {
  const t = ev.target;
  if (t.name === "asunto") ui.nueva.asunto = t.value;
  if (t.id === "detalle-obs") ui.detalleObs = t.value;
  if (t.id === "detalle-pedido") ui.detallePedido = t.value;
  if (t.id === "plazo-pedido") ui.plazoPedido = +t.value;
});
document.addEventListener("submit", (ev) => {
  ev.preventDefault(); const f = ev.target; const c = cuenta();
  if (f.id === "form-ingreso") {
    const usuario = f.usuario.value.trim().toLowerCase(); const ruc = f.ruc ? f.ruc.value.trim() : "";
    if (!usuario || !f.clave.value || (f.ruc && !ruc)) { ui.error = "Complete todos los campos."; render(); return; }
    const k = CUENTAS.find((x) => x.usuario === usuario && x.institucion === ui.tab && (x.institucion !== "eps" || x.ruc === ruc));
    if (!k) { ui.error = "No se pudo iniciar sesión. Intente de nuevo."; render(); return; }
    estado.sesion = { cuenta: k.id }; limpiarUi(); ui.cuentaElegida = null; guardar(); location.hash = inicioDe(k); return;
  }
  if (f.id === "form-acceso") { ui.solicitudEnviada = true; render(); return; }
  if (f.id === "form-nueva") {
    if (!ui.nueva.asunto.trim()) { ui.error = "Escriba el asunto de la solicitud."; render(); return; }
    const e = crearSolicitud(c.eps, ui.nueva.asunto.trim(), REQUISITOS.map((r) => r.c).filter((r) => ui.nueva.archivos[r]));
    ui.constancia = e.codigo; ui.sel.ep = e.codigo; ui.error = ""; guardar(); render(); return;
  }
  if (f.id === "form-respuesta") {
    const faltan = [...f.querySelectorAll("input[type=file]")].filter((i) => !i.files.length && !(ui.ejemplos || {})[i.dataset.archivo]);
    if (faltan.length) { faltan.forEach((i) => i.setAttribute("aria-invalid", "true")); avisar("Adjunte el PDF de cada requisito observado."); return; }
    ui.mensajeEp = responderPedido(buscar(f.dataset.codigo), {}); ui.ejemplos = {}; guardar(); render(); return;
  }
  if (f.id === "form-equipo") {
    const roles = ui.equipoMarcados.map((id) => ESPECIALISTAS.find((s) => s.id === id).rol);
    if (!roles.includes("verifica_tupa") || !roles.includes("evalua_informa")) { ui.errorAccion = "Elija al menos una persona que verifique y una que evalúe."; render(); return; }
    actuar((e) => formarEquipo(e, ui.equipoMarcados, por(c.id))); return;
  }
  if (f.id === "form-verificacion") {
    if (!ui.verif) { ui.errorAccion = "Indique si la solicitud cumple los requisitos."; render(); return; }
    if (ui.verif === "no" && (!ui.observados.length || !ui.detalleObs.trim())) { ui.errorAccion = "Marque los requisitos observados y escriba el detalle."; render(); return; }
    actuar((e) => registrarVerificacion(e, ui.verif === "si", ui.observados, ui.detalleObs.trim())); return;
  }
  if (f.id === "form-evaluacion") {
    if (!ui.eval) { ui.errorAccion = "Indique si la información es suficiente."; render(); return; }
    if (ui.eval === "no" && (!ui.detallePedido.trim() || !(ui.plazoPedido >= 1 && ui.plazoPedido <= 10))) { ui.errorAccion = "Escriba qué información necesita y un plazo de 1 a 10 días hábiles."; render(); return; }
    actuar((e) => registrarEvaluacion(e, ui.eval === "si", ui.detallePedido.trim(), ui.plazoPedido)); return;
  }
  if (f.id === "form-pregunta") { ui.respuesta = responderPregunta(buscar(ruta().split("/")[3]), f.pregunta.value); render(); return; }
});
document.addEventListener("keydown", (ev) => {
  if (!estado.guion || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (ev.altKey && ev.key === "ArrowRight" && estado.guion < GUION.length) guionIr(estado.guion + 1);
  if (ev.altKey && ev.key === "ArrowLeft" && estado.guion > 1) guionIr(estado.guion - 1);
});
window.addEventListener("hashchange", render);
cargar();
render();
