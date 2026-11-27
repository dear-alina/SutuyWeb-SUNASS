"use strict";
// Prototipo navegable de SutuyWeb: datos de la semilla y reglas del backend, sin servidor.

/* ---------- Calendario (feriados nacionales de la semilla) ---------- */
const FERIADOS = new Set("2024-01-01 2024-03-28 2024-03-29 2024-05-01 2024-06-07 2024-06-29 2024-07-23 2024-07-28 2024-07-29 2024-08-06 2024-08-30 2024-10-08 2024-11-01 2024-12-08 2024-12-09 2024-12-25 2025-01-01 2025-04-17 2025-04-18 2025-05-01 2025-06-07 2025-06-29 2025-07-23 2025-07-28 2025-07-29 2025-08-06 2025-08-30 2025-10-08 2025-11-01 2025-12-08 2025-12-09 2025-12-25 2026-01-01 2026-04-02 2026-04-03 2026-05-01 2026-06-07 2026-06-29 2026-07-23 2026-07-28 2026-07-29 2026-08-06 2026-08-30 2026-10-08 2026-11-01 2026-12-08 2026-12-09 2026-12-25 2027-01-01 2027-03-25 2027-03-26 2027-05-01 2027-06-07 2027-06-29 2027-07-23 2027-07-28 2027-07-29 2027-08-06 2027-08-30 2027-10-08 2027-11-01 2027-12-08 2027-12-09 2027-12-25".split(" "));
const HOY_INICIAL = "2026-11-27";
const aFecha = (s) => new Date(s + "T12:00:00Z");
const deFecha = (d) => d.toISOString().slice(0, 10);
const esHabil = (s) => { const d = aFecha(s).getUTCDay(); return d !== 0 && d !== 6 && !FERIADOS.has(s); };
const sumarDias = (s, n) => { const d = aFecha(s); d.setUTCDate(d.getUTCDate() + n); return deFecha(d); };
function sumarHabiles(s, n) { let x = s, k = 0; while (k < n) { x = sumarDias(x, 1); if (esHabil(x)) k++; } return x; }
/** Días hábiles después de a y hasta b (el día 1 es el hábil siguiente al inicio). */
function habilesEntre(a, b) { if (!a || !b || b <= a) return 0; let n = 0, x = a; while (x < b) { x = sumarDias(x, 1); if (esHabil(x)) n++; } return n; }
const fmt = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "—");
const textoDias = (n) => (n === 1 ? "1 día hábil" : `${n} días hábiles`);

/* ---------- Flujo (backend/src/modulos/expedientes/reglas/flujo-ufi.js) ---------- */
const LEY = "Texto Único Ordenado de la Ley del Procedimiento Administrativo General";
const NOMBRE_AREA = {
  ep: "Empresa prestadora", dre: "Dirección de Regulación Económica", srt: "Subdirección de Regulación Tarifaria",
  equipo_srt: "Equipo de especialistas", oaj: "Oficina de Asesoría Jurídica", gg: "Gerencia General", cd: "Consejo Directivo",
};
const HITOS = "Hitos del procedimiento (datos del concurso)";
const PASOS = [
  { n: 1, c: "solicitud", a: "ep", accion: "Presentar la solicitud con los requisitos del Texto Único de Procedimientos Administrativos", base: "Reglamento General de Tarifas, art. 89.1 y 89.2; Texto Único de Procedimientos Administrativos de la Sunass" },
  { n: 2, c: "derivacion", a: "dre", accion: "Derivar la solicitud a la Subdirección de Regulación Tarifaria (1 día hábil)", boton: "Derivar a la Subdirección de Regulación Tarifaria", plazo: 1, base: HITOS },
  { n: 3, c: "asignacion", a: "srt", accion: "Formar el equipo de especialistas que verificará y evaluará el expediente", boton: "Formar equipo", base: HITOS },
  { n: 4, c: "verificacion_tupa", a: "equipo_srt", accion: "Verificar los requisitos del Texto Único de Procedimientos Administrativos", boton: "Requisitos conformes", base: `Texto Único de Procedimientos Administrativos de la Sunass; ${LEY}, art. 125` },
  { n: 5, c: "evaluacion", a: "equipo_srt", accion: "Evaluar el caso fortuito o de fuerza mayor y el uso propuesto", boton: "Evaluación concluida", base: "Reglamento General de Tarifas, art. 89.1 y 89.6" },
  { n: 6, c: "informe", a: "equipo_srt", accion: "Elaborar el informe técnico-legal y el proyecto de resolución", boton: "Informe elaborado", base: "Reglamento General de Tarifas, art. 89.3" },
  { n: 7, c: "visado_informe", a: "srt", accion: "Revisar y visar el informe", boton: "Visar informe", base: HITOS },
  { n: 8, c: "firma_informe_dre", a: "dre", accion: "Revisar y firmar el informe técnico-legal (responsabilidad compartida con la Oficina de Asesoría Jurídica)", boton: "Firmar informe", base: "Reglamento General de Tarifas, art. 89.3" },
  { n: 9, c: "firma_informe_oaj", a: "oaj", accion: "Revisar y firmar la parte legal del informe técnico-legal", boton: "Firmar informe", base: "Reglamento General de Tarifas, art. 89.3" },
  { n: 10, c: "memo_gg", a: "dre", accion: "Firmar el memorándum que eleva el informe y el proyecto de resolución a la Gerencia General", boton: "Firmar memorándum a la Gerencia General", base: "Reglamento General de Tarifas, art. 89.3" },
  { n: 11, c: "elevacion_cd", a: "gg", accion: "De estar conforme, presentar el expediente al Consejo Directivo", boton: "Elevar al Consejo Directivo", base: "Reglamento General de Tarifas, art. 89.4" },
  { n: 12, c: "resolucion_cd", a: "cd", accion: "Resolver: aprobar, aprobar en parte o denegar, y fijar la devolución o la exoneración", base: "Reglamento General de Tarifas, art. 89.5" },
];
const EXCEPCIONES = [
  { c: "oficio_subsanacion", a: "srt", accion: "Revisar y firmar el oficio de subsanación de requisitos", boton: "Firmar oficio de subsanación", sigue: "subsanacion_ep" },
  { c: "subsanacion_ep", a: "ep", accion: "Subsanar los requisitos observados (2 días hábiles)", plazo: 2, pausa: true, sigue: "evaluacion" },
  { c: "oficio_informacion", a: "srt", accion: "Revisar y firmar el oficio de información adicional", boton: "Firmar oficio de información", sigue: "informacion_ep" },
  { c: "informacion_ep", a: "ep", accion: "Enviar la información adicional (hasta 10 días hábiles)", plazo: 10, pausa: true, sigue: "informe" },
];
const PASO = Object.fromEntries([...PASOS, ...EXCEPCIONES].map((p) => [p.c, p]));
function siguienteCodigo(c) {
  if (PASO[c].sigue) return PASO[c].sigue;
  const i = PASOS.findIndex((p) => p.c === c);
  return PASOS[i + 1] ? PASOS[i + 1].c : null;
}

/* ---------- Textos para la empresa prestadora (situacion-eps.js) ---------- */
const ETAPAS = [
  ["recibida", "Recibida", ["solicitud", "derivacion", "asignacion"]],
  ["requisitos", "Requisitos", ["verificacion_tupa", "oficio_subsanacion", "subsanacion_ep"]],
  ["evaluacion", "Evaluación", ["evaluacion", "oficio_informacion", "informacion_ep", "informe"]],
  ["revision", "Revisión técnica y legal", ["visado_informe", "firma_informe_dre", "firma_informe_oaj"]],
  ["aprobacion", "Aprobación interna", ["memo_gg", "elevacion_cd"]],
  ["resolucion", "Resolución", ["resolucion_cd"]],
];
const etapaDe = (c) => (ETAPAS.find((e) => e[2].includes(c)) || ETAPAS[0])[0];
const ETAPA_PARA_EPS = {
  solicitud: "Recibida por la Sunass", derivacion: "Recibida por la Sunass", asignacion: "Recibida por la Sunass",
  verificacion_tupa: "Revisión de requisitos", oficio_subsanacion: "Revisión de requisitos", subsanacion_ep: "Debe subsanar observaciones",
  evaluacion: "En evaluación técnica", oficio_informacion: "En evaluación técnica", informe: "En evaluación técnica", informacion_ep: "Debe enviar información",
  visado_informe: "En revisión técnica y legal", firma_informe_dre: "En revisión técnica y legal", firma_informe_oaj: "En revisión técnica y legal",
  memo_gg: "En aprobación interna", elevacion_cd: "En aprobación interna", resolucion_cd: "En el Consejo Directivo",
};
const QUE_PASA = {
  verificacion_tupa: "El equipo de especialistas revisa que su solicitud tenga los requisitos del Texto Único de Procedimientos Administrativos.",
  evaluacion: "El equipo técnico evalúa el caso fortuito o de fuerza mayor y el uso propuesto.",
  informe: "El equipo técnico elabora el informe y el proyecto de resolución.",
  visado_informe: "La Subdirección de Regulación Tarifaria revisa el informe.",
  firma_informe_dre: "La Dirección de Regulación Económica revisa y firma el informe.",
  firma_informe_oaj: "La Oficina de Asesoría Jurídica revisa el informe técnico-legal.",
  memo_gg: "La Dirección de Regulación Económica envía su expediente a la Gerencia General.",
  elevacion_cd: "La Gerencia General revisa su expediente para elevarlo al Consejo Directivo.",
  resolucion_cd: "El Consejo Directivo está por resolver su solicitud.",
};
const TEXTO_RESULTADO = { aprobado: "Aprobada", aprobado_parcial: "Aprobada en parte", denegado: "Denegada", archivado_no_subsana: "Archivada por no subsanar" };
const TIPO_DOCUMENTO = {
  acta: "Acta", anexo: "Anexo", carta_ep: "Carta de la empresa prestadora", informe: "Informe", memorandum: "Memorándum", oficio: "Oficio",
  proveido: "Proveído", resolucion_consejo_directivo: "Resolución del Consejo Directivo",
};
const NIVEL_ACCESO = { publico: "Público", restringido_partes: "Partes", interno: "Interno" };
const REQUISITOS = [
  { c: "UFI-R01", texto: "Informe sobre la propuesta de uso excepcional (caso fortuito o de fuerza mayor)", descripcion: "Informe sobre la propuesta de uso excepcional que explique el caso fortuito o de fuerza mayor.", base: "Reglamento General de Tarifas, art. 89.2 num. 1" },
  { c: "UFI-R02", texto: "Documentos que sustentan la propuesta", descripcion: "Documentos que sustentan la propuesta de uso excepcional.", base: "Reglamento General de Tarifas, art. 89.2 num. 2" },
  { c: "UFI-R03", texto: "Propuesta de devolución o de exoneración de la devolución", descripcion: "Propuesta de devolución de los recursos o de exoneración, parcial o total, de la devolución.", base: "Reglamento General de Tarifas, art. 89.2 num. 3" },
];
const ROL_EQUIPO = { verifica_tupa: "Verifica los requisitos", evalua_informa: "Evalúa el caso y elabora el informe" };
const ESPECIALISTAS = [
  { id: "esp01", nombre: "Lucía Ramos Vega", especialidad: "Especialista tarifaria", rol: "verifica_tupa" },
  { id: "esp02", nombre: "Martín Paredes Soto", especialidad: "Especialista en inversiones", rol: "evalua_informa" },
  { id: "esp03", nombre: "Elena Cárdenas Ruiz", especialidad: "Especialista tarifaria", rol: "verifica_tupa" },
  { id: "esp04", nombre: "Jorge Salinas Quispe", especialidad: "Especialista en inversiones", rol: "evalua_informa" },
];
const EPS = { EPS02: { codigo: "EPS02", nombre: "EPS Manantial S.A.", ruc: "99000000002" }, EPS07: { codigo: "EPS07", nombre: "EPS Aguas del Valle Alto S.A.", ruc: "99000000007" }, EPS16: { codigo: "EPS16", nombre: "EPS Cascada S.A.", ruc: "99000000016" } };

/* Cuentas de demostración (frontend/src/utilidades/cuentas-demo.ts), sin claves */
const CUENTAS = [
  { id: "dre", etiqueta: "Dirección de Regulación Económica", institucion: "sunass", usuario: "dre@demo.sutuyweb.test", area: "dre", cargo: "Director" },
  { id: "srt", etiqueta: "Subdirección de Regulación Tarifaria", institucion: "sunass", usuario: "srt@demo.sutuyweb.test", area: "srt", cargo: "Subdirector" },
  { id: "equipo_srt", etiqueta: "Equipo de especialistas", institucion: "sunass", usuario: "equipo-srt@demo.sutuyweb.test", area: "equipo_srt", cargo: "Especialista" },
  { id: "oaj", etiqueta: "Oficina de Asesoría Jurídica", institucion: "sunass", usuario: "oaj@demo.sutuyweb.test", area: "oaj", cargo: "Abogado" },
  { id: "gg", etiqueta: "Gerencia General", institucion: "sunass", usuario: "gg@demo.sutuyweb.test", area: "gg", cargo: "Gerente General" },
  { id: "cd", etiqueta: "Consejo Directivo", institucion: "sunass", usuario: "cd@demo.sutuyweb.test", area: "cd", cargo: "Secretaría del Consejo" },
  { id: "eps07", etiqueta: "Empresa prestadora · EPS Aguas del Valle Alto S.A.", institucion: "eps", usuario: "eps07@demo.sutuyweb.test", ruc: "99000000007", area: "ep", eps: "EPS07", cargo: "Gerencia General" },
  { id: "eps02", etiqueta: "Empresa prestadora · EPS Manantial S.A.", institucion: "eps", usuario: "eps02@demo.sutuyweb.test", ruc: "99000000002", area: "ep", eps: "EPS02", cargo: "Gerencia General" },
  { id: "admin", etiqueta: "Administración", institucion: "sunass", usuario: "admin@demo.sutuyweb.test", area: null, cargo: "Administración" },
];

/* ---------- Semilla (bd/supabase/seed.sql) ---------- */
const H = (c, ini, fin, doc) => ({ c, a: PASO[c].a, ini, fin, doc: doc || null, por: null });
const D = (codigo, tipo, numero, fecha, asunto, acceso, hito, req) => ({ codigo, tipo, numero, fecha, asunto, acceso, hito, req: req || null });
function docsSolicitud(desde, fecha, reqs) {
  const n = (k) => `DOC-00${desde + k}`;
  const lista = [D(n(0), "carta_ep", "Carta de solicitud", fecha, "Solicitud de uso excepcional del fondo de inversiones", "restringido_partes", "solicitud")];
  const asuntos = { "UFI-R01": ["Anexo 1", "Informe sobre la propuesta de uso excepcional"], "UFI-R02": ["Anexo 2", "Documentos que sustentan la propuesta"], "UFI-R03": ["Anexo 3", "Propuesta de devolución o de exoneración de la devolución"] };
  reqs.forEach((r, i) => lista.push(D(n(i + 1), "anexo", asuntos[r][0], fecha, asuntos[r][1], "restringido_partes", "solicitud", r)));
  return lista;
}
function asignarEquipo(exp, v, e) {
  exp.equipo = [v, e];
  const nombre = (id) => ESPECIALISTAS.find((x) => x.id === id).nombre;
  exp.hitos.forEach((h) => { if (h.fin && h.c === "verificacion_tupa") h.por = nombre(v); if (h.fin && (h.c === "evaluacion" || h.c === "informe")) h.por = nombre(e); });
  return exp;
}
const DOCE = (fechas, docs) => PASOS.map((p, i) => H(p.c, fechas[i][0], fechas[i][1], docs[p.c]));
function semilla() {
  const x = [];
  x.push(asignarEquipo({ codigo: "UFI-2026-0001", eps: "EPS07", motivo: "Rotura de línea de conducción", monto: 436594.67, fechaInicio: "2026-09-01", estado: "concluido", resultado: "aprobado", fechaConclusion: "2026-10-12", fechaNotificacion: "2026-10-14",
    hitos: DOCE([["2026-09-01", "2026-09-01"], ["2026-09-01", "2026-09-02"], ["2026-09-02", "2026-09-03"], ["2026-09-03", "2026-09-07"], ["2026-09-07", "2026-09-15"], ["2026-09-15", "2026-09-23"], ["2026-09-23", "2026-09-25"], ["2026-09-25", "2026-09-28"], ["2026-09-28", "2026-09-30"], ["2026-09-30", "2026-10-01"], ["2026-10-01", "2026-10-05"], ["2026-10-05", "2026-10-12"]], { informe: "INF-2026-0019", memo_gg: "MEM-2026-0009", resolucion_cd: "RCD-2026-0009" }),
    documentos: [
      D("DOC-001570", "carta_ep", "CARTA N.° 005-2026-EPS07/GG", "2026-09-01", "Solicitud de la empresa prestadora por mesa de partes · uso excepcional del fondo de inversiones", "restringido_partes", "solicitud"),
      D("DOC-001571", "anexo", "Anexo 1", "2026-09-01", "Anexo 1 de la carta · uso excepcional del fondo de inversiones", "restringido_partes", "solicitud", "UFI-R01"),
      D("DOC-001572", "proveido", "Proveído", "2026-09-02", "La Dirección de Regulación Económica deriva el expediente a la Subdirección de Regulación Tarifaria", "interno", "derivacion"),
      D("DOC-001573", "proveido", "Proveído", "2026-09-03", "La Subdirección de Regulación Tarifaria asigna el expediente al equipo", "interno", "asignacion"),
      D("DOC-001574", "informe", "INF-2026-0019", "2026-09-23", "El Equipo de especialistas elabora el informe y el proyecto de resolución", "interno", "informe"),
      D("DOC-001804", "memorandum", "MEM-2026-0009", "2026-10-01", "La Dirección de Regulación Económica firma el memorándum a la Gerencia General", "interno", "memo_gg"),
      D("DOC-001805", "resolucion_consejo_directivo", "RCD-2026-0009", "2026-10-12", "El Consejo Directivo emite la resolución · uso excepcional del fondo de inversiones", "publico", "resolucion_cd"),
    ], pedidos: [] }, "esp01", "esp02"));
  x.push({ codigo: "UFI-2026-0002", eps: "EPS02", motivo: "Colapso de colector por lluvias", monto: 185300, fechaInicio: "2026-11-25", estado: "en_tramite",
    hitos: [H("solicitud", "2026-11-25", "2026-11-25"), H("derivacion", "2026-11-25", null)],
    documentos: docsSolicitud(1811, "2026-11-25", ["UFI-R01", "UFI-R02", "UFI-R03"]), pedidos: [], equipo: [] });
  x.push({ codigo: "UFI-2026-0003", eps: "EPS07", motivo: "Daño de captación por huaico", monto: 92450.5, fechaInicio: "2026-11-16", estado: "en_tramite",
    hitos: [H("solicitud", "2026-11-16", "2026-11-16"), H("derivacion", "2026-11-16", "2026-11-17"), H("asignacion", "2026-11-17", "2026-11-18"), H("verificacion_tupa", "2026-11-18", null)],
    documentos: [...docsSolicitud(1815, "2026-11-16", ["UFI-R01", "UFI-R03"]), D("DOC-001818", "proveido", "Proveído", "2026-11-17", "La Dirección de Regulación Económica deriva el expediente a la Subdirección de Regulación Tarifaria", "interno", "derivacion")],
    pedidos: [], equipo: ["esp03", "esp02"] });
  x.push(asignarEquipo({ codigo: "UFI-2026-0004", eps: "EPS16", motivo: "Falla de planta de tratamiento", monto: 310000, fechaInicio: "2026-10-20", estado: "en_tramite",
    hitos: DOCE([["2026-10-20", "2026-10-20"], ["2026-10-20", "2026-10-21"], ["2026-10-21", "2026-10-22"], ["2026-10-22", "2026-10-26"], ["2026-10-26", "2026-11-04"], ["2026-11-04", "2026-11-11"], ["2026-11-11", "2026-11-12"], ["2026-11-12", "2026-11-13"], ["2026-11-13", "2026-11-17"], ["2026-11-17", "2026-11-18"], ["2026-11-18", "2026-11-20"], ["2026-11-20", null]], { informe: "INF-2026-0031", memo_gg: "MEM-2026-0014" }),
    documentos: [...docsSolicitud(1819, "2026-10-20", ["UFI-R01", "UFI-R02", "UFI-R03"]),
      D("DOC-001823", "informe", "INF-2026-0031", "2026-11-11", "Informe técnico-legal y proyecto de resolución", "interno", "informe"),
      D("DOC-001824", "memorandum", "MEM-2026-0014", "2026-11-18", "La Dirección de Regulación Económica eleva el informe a la Gerencia General", "interno", "memo_gg")], pedidos: [] }, "esp01", "esp04"));
  x.push(asignarEquipo({ codigo: "UFI-2026-0005", eps: "EPS02", motivo: "Rotura de reservorio por sismo", monto: 128900, fechaInicio: "2026-10-13", estado: "concluido", resultado: "aprobado_parcial", fechaConclusion: "2026-11-25", fechaNotificacion: null,
    hitos: DOCE([["2026-10-13", "2026-10-13"], ["2026-10-13", "2026-10-14"], ["2026-10-14", "2026-10-15"], ["2026-10-15", "2026-10-19"], ["2026-10-19", "2026-10-28"], ["2026-10-28", "2026-11-05"], ["2026-11-05", "2026-11-06"], ["2026-11-06", "2026-11-09"], ["2026-11-09", "2026-11-11"], ["2026-11-11", "2026-11-12"], ["2026-11-12", "2026-11-16"], ["2026-11-16", "2026-11-25"]], { informe: "INF-2026-0029", memo_gg: "MEM-2026-0013", resolucion_cd: "RCD-2026-0012" }),
    documentos: [...docsSolicitud(1825, "2026-10-13", ["UFI-R01", "UFI-R02", "UFI-R03"]), D("DOC-001829", "resolucion_consejo_directivo", "RCD-2026-0012", "2026-11-25", "Resolución sobre el uso excepcional del fondo de inversiones", "publico", "resolucion_cd")], pedidos: [] }, "esp03", "esp04"));
  x.push(asignarEquipo({ codigo: "UFI-2026-0006", eps: "EPS07", motivo: "Deslizamiento sobre línea de aducción", monto: 67800, fechaInicio: "2026-11-19", estado: "en_tramite",
    hitos: [H("solicitud", "2026-11-19", "2026-11-19"), H("derivacion", "2026-11-19", "2026-11-20"), H("asignacion", "2026-11-20", "2026-11-23"), H("verificacion_tupa", "2026-11-23", "2026-11-24"), H("oficio_subsanacion", "2026-11-24", "2026-11-26", "OF-SRT-2026-0001"), H("subsanacion_ep", "2026-11-26", null)],
    documentos: [...docsSolicitud(1830, "2026-11-19", ["UFI-R01", "UFI-R03"]), D("DOC-001833", "oficio", "OF-SRT-2026-0001", "2026-11-26", "Observaciones a los requisitos del Texto Único de Procedimientos Administrativos", "restringido_partes", "oficio_subsanacion")],
    pedidos: [{ tipo: "subsanacion", requisitos: ["UFI-R02"], detalle: "No se adjuntaron los documentos que sustentan la propuesta.", plazo: 2, oficio: "OF-SRT-2026-0001", fecha: "2026-11-26", abierto: true }] }, "esp01", "esp02"));
  const historico = (codigo, eps, ini, res, concl, notif, f, docs) => {
    const cod = ["solicitud", "derivacion", "asignacion", "verificacion_tupa", "oficio_subsanacion", "subsanacion_ep", "evaluacion", "informe", "visado_informe", "firma_informe_dre", "firma_informe_oaj", "memo_gg", "elevacion_cd", "resolucion_cd"];
    return { codigo, eps, motivo: null, fechaInicio: ini, estado: "concluido", resultado: res, fechaConclusion: concl, fechaNotificacion: notif, hitos: cod.map((c, i) => H(c, f[i][0], f[i][1], docs[c])), documentos: [], pedidos: [], equipo: [] };
  };
  const h24 = historico("UFI-2024-0001", "EPS07", "2024-06-10", "aprobado_parcial", "2024-07-25", "2024-07-26",
    [["2024-06-10", "2024-06-10"], ["2024-06-10", "2024-06-11"], ["2024-06-11", "2024-06-12"], ["2024-06-12", "2024-06-17"], ["2024-06-17", "2024-06-20"], ["2024-06-20", "2024-06-24"], ["2024-06-24", "2024-06-28"], ["2024-06-28", "2024-07-08"], ["2024-07-08", "2024-07-09"], ["2024-07-09", "2024-07-11"], ["2024-07-11", "2024-07-15"], ["2024-07-15", "2024-07-16"], ["2024-07-16", "2024-07-19"], ["2024-07-19", "2024-07-25"]],
    { oficio_subsanacion: "OF-2024-0013", informe: "INF-2024-0023", memo_gg: "MEM-2024-0011", resolucion_cd: "RCD-2024-0011" });
  h24.documentos = [D("DOC-001807", "oficio", "OF-2024-0013", "2024-06-20", "Observaciones a los requisitos del Texto Único de Procedimientos Administrativos", "restringido_partes", "oficio_subsanacion"), D("DOC-001808", "resolucion_consejo_directivo", "RCD-2024-0011", "2024-07-25", "Resolución sobre el uso excepcional del fondo", "publico", "resolucion_cd")];
  const h25 = historico("UFI-2025-0001", "EPS16", "2025-05-12", "denegado", "2025-07-03", "2025-07-07",
    [["2025-05-12", "2025-05-12"], ["2025-05-12", "2025-05-13"], ["2025-05-13", "2025-05-13"], ["2025-05-13", "2025-05-14"], ["2025-05-14", "2025-05-19"], ["2025-05-19", "2025-05-21"], ["2025-05-21", "2025-06-03"], ["2025-06-03", "2025-06-13"], ["2025-06-13", "2025-06-16"], ["2025-06-16", "2025-06-18"], ["2025-06-18", "2025-06-20"], ["2025-06-20", "2025-06-24"], ["2025-06-24", "2025-06-26"], ["2025-06-26", "2025-07-03"]],
    { oficio_subsanacion: "OF-2025-0015", informe: "INF-2025-0025", memo_gg: "MEM-2025-0011", resolucion_cd: "RCD-2025-0010" });
  h25.documentos = [D("DOC-001809", "oficio", "OF-2025-0015", "2025-05-19", "Observaciones a los requisitos del Texto Único de Procedimientos Administrativos", "restringido_partes", "oficio_subsanacion"), D("DOC-001810", "resolucion_consejo_directivo", "RCD-2025-0010", "2025-07-03", "Resolución sobre el uso excepcional del fondo", "publico", "resolucion_cd")];
  x.push(h24, h25);
  x.forEach((e) => { e.copiloto = null; e.borrador = null; e.equipo = e.equipo || []; });
  return { hoy: HOY_INICIAL, expedientes: x, sesion: null };
}

/* ---------- Cálculos (reglas/plazos.js) ---------- */
let estado = semilla();
const hoy = () => estado.hoy;
const buscar = (codigo) => estado.expedientes.find((e) => e.codigo === codigo);
const pasoActual = (e) => e.hitos.find((h) => !h.fin) || null;
const diasHito = (h) => habilesEntre(h.ini, h.fin || hoy());
const esDatoARevisar = (h) => !!h.fin && h.fin < h.ini;
const porNotificar = (e) => e.estado === "concluido" && !e.fechaNotificacion;
const estaAbierto = (e) => e.estado === "en_tramite" || porNotificar(e);
function areaActual(e) { const p = pasoActual(e); return p ? p.a : porNotificar(e) ? "dre" : null; }
function tareaDe(e, area) {
  const p = pasoActual(e);
  if (p && p.a === area) return p.c === "resolucion_cd" ? "resolver" : p.c;
  if (!p && porNotificar(e) && area === "dre") return "notificar";
  return null;
}
function diasSuspendidos(e, ref) { return e.hitos.filter((h) => PASO[h.c].pausa).reduce((s, h) => s + habilesEntre(h.ini, h.fin && h.fin < ref ? h.fin : ref), 0); }
function plazo(e, fechaRef) {
  const ref = e.fechaConclusion || fechaRef || hoy();
  const susp = diasSuspendidos(e, ref);
  const fechaLimite = sumarHabiles(e.fechaInicio, 30 + susp);
  const fechaLimiteNotificacion = sumarHabiles(fechaLimite, 5);
  const corte = fechaRef || hoy();
  let situacion;
  if (e.fechaNotificacion) situacion = e.fechaNotificacion <= fechaLimiteNotificacion ? "resuelto_en_plazo" : "resuelto_tras_silencio";
  else if (corte <= fechaLimite) situacion = "en_plazo";
  else if (corte <= fechaLimiteNotificacion) situacion = "vencido";
  else situacion = "silencio_configurado";
  const diaDelPlazo = Math.max(0, habilesEntre(e.fechaInicio, ref) - susp);
  const diasRestantes = fechaLimite >= corte ? habilesEntre(corte, fechaLimite) : -habilesEntre(fechaLimite, corte);
  return { fechaLimite, fechaLimiteNotificacion, situacion, diaDelPlazo, diasRestantes, susp };
}
function plazoPaso(e) {
  const p = pasoActual(e);
  if (p) { const def = PASO[p.c]; const dias = diasHito(p); const venceEl = def.plazo ? sumarHabiles(p.ini, def.plazo) : null; return { plazoDiasHabiles: def.plazo || null, diasEnArea: dias, venceEl, estaVencido: def.plazo ? dias > def.plazo : false }; }
  if (porNotificar(e)) { const dias = habilesEntre(e.fechaConclusion, hoy()); return { plazoDiasHabiles: 5, diasEnArea: dias, venceEl: sumarHabiles(e.fechaConclusion, 5), estaVencido: dias > 5 }; }
  return null;
}
function etapas(e) {
  const p = pasoActual(e);
  const actual = p ? etapaDe(p.c) : porNotificar(e) ? "resolucion" : null;
  let pasada = !actual;
  return ETAPAS.map(([c, texto, pasos]) => {
    const hs = e.hitos.filter((h) => pasos.includes(h.c));
    let est;
    if (!actual) est = "hecha"; else if (c === actual) { est = "actual"; pasada = true; } else est = pasada ? "pendiente" : "hecha";
    return { c, texto, estado: est, desde: hs[0] ? hs[0].ini : null, dias: hs.filter((h) => !PASO[h.c].pausa).reduce((s, h) => s + diasHito(h), 0), conSubsanacion: hs.some((h) => h.c === "subsanacion_ep"), conInformacion: hs.some((h) => h.c === "informacion_ep") };
  });
}
function situacionEp(e) {
  if (e.estado === "concluido") {
    if (!e.fechaNotificacion) return { textoEstado: "Resolución por notificar", tono: "informacion", queEstaPasando: "El Consejo Directivo ya resolvió. La Dirección de Regulación Económica le notificará la resolución por oficio en su casilla." };
    return { textoEstado: TEXTO_RESULTADO[e.resultado] || "Concluida", tono: e.resultado === "denegado" ? "alerta" : "exito", queEstaPasando: `Su solicitud fue resuelta el ${fmt(e.fechaConclusion)}.` };
  }
  const p = pasoActual(e);
  const s = { textoEstado: ETAPA_PARA_EPS[p.c] || "En trámite", tono: "informacion", queEstaPasando: QUE_PASA[p.c] || "La Sunass está revisando su expediente." };
  if (p.c === "subsanacion_ep" || p.c === "informacion_ep") {
    const sub = p.c === "subsanacion_ep";
    const ped = e.pedidos.find((x) => x.abierto);
    s.tono = "accion";
    s.queEstaPasando = sub ? "La Sunass observó requisitos de su solicitud. Debe subsanarlos." : "La Sunass necesita información adicional para evaluar su solicitud.";
    s.accion = { titulo: sub ? "Subsanar las observaciones a los requisitos" : "Enviar la información adicional solicitada", venceEl: sumarHabiles(p.ini, ped ? ped.plazo : sub ? 2 : 10), base: sub ? `${LEY}, art. 125.1` : "Reglamento General de Tarifas, art. 89.6", puedePedirProrroga: !sub, pedido: ped };
  }
  return s;
}
function avisosEp(codigoEps) {
  const lista = [];
  estado.expedientes.filter((e) => e.eps === codigoEps).forEach((e) => {
    const s = situacionEp(e);
    if (s.accion) lista.push({ codigo: e.codigo, titulo: s.accion.titulo, detalle: `Vence el ${fmt(s.accion.venceEl)}.`, tono: "accion", base: s.accion.base });
    if (porNotificar(e)) lista.push({ codigo: e.codigo, titulo: "Resolución por notificar", detalle: "El Consejo Directivo ya resolvió su solicitud.", tono: "informacion", base: "Reglamento General de Tarifas, art. 89.5" });
    if (e.fechaNotificacion && e.fechaNotificacion >= sumarDias(hoy(), -7)) lista.push({ codigo: e.codigo, titulo: `Resolución notificada: ${TEXTO_RESULTADO[e.resultado]}`, detalle: `Notificada el ${fmt(e.fechaNotificacion)}. Puede pedir reconsideración en 15 días hábiles.`, tono: "exito", base: `${LEY}, art. 207.2` });
  });
  return lista;
}
function semaforo(e, corte, diasAlerta) {
  if (e.estado === "concluido" && e.fechaNotificacion) return plazo(e, corte).situacion === "resuelto_en_plazo" ? "resuelto_en_plazo" : "resuelto_fuera";
  const p = plazo(e, corte);
  if (p.situacion === "silencio_configurado") return "silencio";
  if (p.situacion === "vencido") return "vencido";
  return p.diasRestantes <= diasAlerta ? "riesgo" : "en_plazo";
}

/* ---------- Acciones (servicio.js) ---------- */
function siguienteNumero(prefijo, ancho) {
  let max = 0;
  const re = new RegExp("^" + prefijo.replace(/[-]/g, "\\-") + "(\\d+)$");
  estado.expedientes.forEach((e) => { const m = e.codigo.match(re); if (m) max = Math.max(max, +m[1]); e.hitos.forEach((h) => { const k = h.doc && h.doc.match(re); if (k) max = Math.max(max, +k[1]); }); e.documentos.forEach((d) => { const k = d.numero.match(re); if (k) max = Math.max(max, +k[1]); }); });
  return prefijo + String(max + 1).padStart(ancho, "0");
}
function nuevoDocumento(e, tipo, numero, asunto, acceso, hito, req) {
  let max = 0; estado.expedientes.forEach((x) => x.documentos.forEach((d) => { max = Math.max(max, +d.codigo.slice(4)); }));
  const d = D("DOC-" + String(max + 1).padStart(6, "0"), tipo, numero, hoy(), asunto, acceso, hito, req);
  e.documentos.push(d); return d;
}
function avanzar(e, siguiente, por, doc) {
  const p = pasoActual(e); p.fin = hoy(); p.por = por || null; if (doc) p.doc = doc;
  if (siguiente) e.hitos.push(H(siguiente, hoy(), null));
}
const anio = () => hoy().slice(0, 4);
function completarGenerico(e, por) {
  const p = pasoActual(e); let doc = null;
  if (p.c === "derivacion") nuevoDocumento(e, "proveido", "Proveído", "La Dirección de Regulación Económica deriva el expediente a la Subdirección de Regulación Tarifaria", "interno", "derivacion");
  if (p.c === "informe") { doc = siguienteNumero(`INF-${anio()}-`, 4); nuevoDocumento(e, "informe", doc, "Informe técnico-legal y proyecto de resolución", "interno", "informe"); }
  if (p.c === "memo_gg") { doc = siguienteNumero(`MEM-${anio()}-`, 4); nuevoDocumento(e, "memorandum", doc, "La Dirección de Regulación Económica eleva el informe a la Gerencia General", "interno", "memo_gg"); }
  const sig = siguienteCodigo(p.c);
  avanzar(e, sig, por, doc);
  return `Listo. Pasa a ${NOMBRE_AREA[PASO[sig].a]}.`;
}
function formarEquipo(e, ids, por) {
  e.equipo = ids;
  nuevoDocumento(e, "proveido", "Proveído", "La Subdirección de Regulación Tarifaria asigna el expediente al equipo", "interno", "asignacion");
  avanzar(e, "verificacion_tupa", por);
  return `Equipo formado: ${ids.map((i) => ESPECIALISTAS.find((x) => x.id === i).nombre).join(" y ")}. Pasa al Equipo de especialistas para verificar los requisitos.`;
}
const nombreEsp = (e, rol) => { const x = ESPECIALISTAS.find((s) => e.equipo.includes(s.id) && s.rol === rol); return x ? x.nombre : null; };
function registrarVerificacion(e, cumple, observados, detalle) {
  if (cumple) { avanzar(e, "evaluacion", nombreEsp(e, "verifica_tupa")); return "Requisitos conformes. Sigue la evaluación del caso."; }
  e.borrador = { tipo: "subsanacion", requisitos: observados, detalle, plazo: 2 };
  avanzar(e, "oficio_subsanacion", nombreEsp(e, "verifica_tupa"));
  return "Requisitos observados. Pasa a la Subdirección de Regulación Tarifaria para firmar el oficio de subsanación.";
}
function registrarEvaluacion(e, suficiente, detalle, dias) {
  if (suficiente) { avanzar(e, "informe", nombreEsp(e, "evalua_informa")); return "Evaluación concluida. Sigue el informe técnico-legal."; }
  e.borrador = { tipo: "informacion", requisitos: [], detalle, plazo: dias };
  avanzar(e, "oficio_informacion", nombreEsp(e, "evalua_informa"));
  return "Pedido de información registrado. Pasa a la Subdirección de Regulación Tarifaria para firmar el oficio.";
}
function firmarOficio(e, por) {
  const numero = siguienteNumero(`OF-SRT-${anio()}-`, 4);
  const sub = e.borrador.tipo === "subsanacion";
  nuevoDocumento(e, "oficio", numero, sub ? "Observaciones a los requisitos del Texto Único de Procedimientos Administrativos" : "Pedido de información adicional", "restringido_partes", sub ? "oficio_subsanacion" : "oficio_informacion");
  e.pedidos.push({ ...e.borrador, oficio: numero, fecha: hoy(), abierto: true });
  e.borrador = null;
  avanzar(e, sub ? "subsanacion_ep" : "informacion_ep", por, numero);
  return `Oficio ${numero} firmado y notificado a la empresa prestadora. Su plazo no se cuenta mientras responde.`;
}
function responderPedido(e, archivos) {
  const ped = e.pedidos.find((x) => x.abierto); ped.abierto = false; ped.respondido = hoy();
  const p = pasoActual(e);
  if (ped.tipo === "subsanacion") ped.requisitos.forEach((r) => nuevoDocumento(e, "anexo", REQUISITOS.find((q) => q.c === r).texto.split(" (")[0], `Subsanación: ${REQUISITOS.find((q) => q.c === r).texto}`, "restringido_partes", p.c, r));
  else nuevoDocumento(e, "carta_ep", "Carta de respuesta", "Información adicional solicitada", "restringido_partes", p.c);
  e.copiloto = null;
  avanzar(e, siguienteCodigo(p.c), EPS[e.eps].nombre);
  return ped.tipo === "subsanacion" ? "Subsanación enviada. La Sunass continúa con la evaluación y su plazo vuelve a correr." : "Información enviada. La Sunass continúa con el informe y su plazo vuelve a correr.";
}
function resolver(e, resultado, por) {
  const numero = siguienteNumero(`RCD-${anio()}-`, 4);
  nuevoDocumento(e, "resolucion_consejo_directivo", numero, "Resolución sobre el uso excepcional del fondo de inversiones", "publico", "resolucion_cd");
  avanzar(e, null, por, numero);
  Object.assign(e, { estado: "concluido", resultado, fechaConclusion: hoy() });
  return `Resolución emitida: ${TEXTO_RESULTADO[resultado]}. Pasa a la Dirección de Regulación Económica para notificarla.`;
}
function notificar(e) {
  const numero = siguienteNumero(`OF-${anio()}-`, 4);
  nuevoDocumento(e, "oficio", numero, "Notificación de la resolución del Consejo Directivo", "restringido_partes", "resolucion_cd");
  e.fechaNotificacion = hoy();
  return `Notificado con el oficio ${numero}.`;
}
function crearSolicitud(codigoEps, motivo, reqs) {
  const codigo = siguienteNumero(`UFI-${anio()}-`, 4);
  const e = { codigo, eps: codigoEps, motivo, monto: null, fechaInicio: hoy(), estado: "en_tramite", hitos: [H("solicitud", hoy(), hoy()), H("derivacion", hoy(), null)], documentos: [], pedidos: [], equipo: [], copiloto: null, borrador: null };
  e.hitos[0].por = EPS[codigoEps].nombre;
  estado.expedientes.push(e);
  nuevoDocumento(e, "carta_ep", "Carta de solicitud", "Solicitud de uso excepcional del fondo de inversiones", "restringido_partes", "solicitud");
  const asuntos = { "UFI-R01": ["Anexo 1", "Informe sobre la propuesta de uso excepcional"], "UFI-R02": ["Anexo 2", "Documentos que sustentan la propuesta"], "UFI-R03": ["Anexo 3", "Propuesta de devolución o de exoneración de la devolución"] };
  reqs.forEach((r) => nuevoDocumento(e, "anexo", asuntos[r][0], asuntos[r][1], "restringido_partes", "solicitud", r));
  return e;
}

/* ---------- Copiloto simulado (contrato: evaluaciones-requisitos) ---------- */
function evaluarConCopiloto(e) {
  const doc = (r) => e.documentos.find((d) => d.req === r);
  const motivo = (e.motivo || "un evento imprevisto").toLowerCase();
  const res = [];
  const d1 = doc("UFI-R01");
  res.push(d1 ? { req: "UFI-R01", estado: "evidencia_encontrada", cita: { doc: d1.codigo, pagina: 2, fragmento: `Motivo de la solicitud: ${motivo}. El evento se produjo por caso fortuito o de fuerza mayor.` }, motivo: "El pasaje describe el evento y lo califica como caso fortuito o de fuerza mayor.", verificada: true }
    : { req: "UFI-R01", estado: "no_hallada", motivo: "No se encontró un informe que describa el caso fortuito o de fuerza mayor." });
  const d2 = doc("UFI-R02");
  res.push(d2 ? { req: "UFI-R02", estado: "evidencia_encontrada", cita: { doc: d2.codigo, pagina: 1, fragmento: "Se adjunta el presupuesto con los costos unitarios y el cronograma de ejecución." }, motivo: "El documento contiene presupuesto, costos unitarios y cronograma.", verificada: true }
    : { req: "UFI-R02", estado: "no_hallada", motivo: "No se encontró un documento con el sustento de la propuesta (presupuesto, costos unitarios o cronograma)." });
  const d3 = doc("UFI-R03");
  res.push(d3 ? { req: "UFI-R03", estado: "evidencia_parcial", cita: { doc: d3.codigo, pagina: 1, fragmento: "Se propone la reposición de los recursos utilizados al fondo de inversiones." }, motivo: "Menciona la reposición, pero no precisa si es devolución total o parcial: confirmar a mano.", verificada: false }
    : { req: "UFI-R03", estado: "no_hallada", motivo: "No se encontró la propuesta de devolución o de exoneración." });
  const faltan = res.filter((r) => r.estado === "no_hallada");
  const borrador = "BORRADOR (requiere revisión y firma del especialista)\n\n" + (faltan.length
    ? faltan.map((r) => { const q = REQUISITOS.find((x) => x.c === r.req); return `· ${q.descripcion} (${q.base}): ${r.motivo}`; }).join("\n")
    : "No se identificaron requisitos faltantes.");
  e.copiloto = { resultados: res, borrador, decisiones: {} };
  return e.copiloto;
}
function responderPregunta(e, pregunta) {
  const docs = e.documentos.filter((d) => d.tipo === "anexo" || d.tipo === "carta_ep");
  if (!docs.length) return { estado: "sin_evidencia", respuesta: "No hay documentos indexados para responder." };
  const t = pregunta.toLowerCase();
  if (/monto|cu[aá]nto|presupuesto|costo/.test(t) && e.monto) return { estado: "respondida", respuesta: `La solicitud indica un monto de S/ ${e.monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}.`, cita: { doc: docs[0].codigo, pagina: 1, fragmento: `Monto solicitado: S/ ${e.monto.toLocaleString("es-PE", { minimumFractionDigits: 2 })}.` } };
  if (/motivo|por qu[eé]|caso|fuerza/.test(t)) { const d = docs.find((x) => x.req === "UFI-R01") || docs[0]; return { estado: "respondida", respuesta: `El motivo declarado es: ${(e.motivo || "").toLowerCase()}.`, cita: { doc: d.codigo, pagina: 2, fragmento: `Motivo de la solicitud: ${(e.motivo || "").toLowerCase()}. El evento se produjo por caso fortuito o de fuerza mayor.` } }; }
  return { estado: "sin_evidencia", respuesta: "No encontré un pasaje que responda la pregunta. Revise los documentos a mano." };
}

/* ---------- Persistencia ---------- */
const CLAVE = "sutuyweb-prototipo-v1";
function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (_) {} }
function cargar() { try { const s = localStorage.getItem(CLAVE); if (s) estado = JSON.parse(s); } catch (_) { estado = semilla(); } }
