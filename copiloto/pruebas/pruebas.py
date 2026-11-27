"""Pruebas del módulo. Uso:  python pruebas/pruebas.py   (no necesita internet ni modelo)"""
import json, sys, threading, urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))
import datos_ia, ingesta, motor, verificador  # noqa: E402
from buscador import Indice  # noqa: E402

fallos = []
def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond: fallos.append(msg)

DEMO = RAIZ / "documentos_demo"
DATOS = RAIZ / "datos_demo"
chunks = ingesta.ingerir_carpeta(DEMO, expediente="DEMO-1")
idx = Indice(chunks)

print("Ingesta y búsqueda")
ok(len(chunks) == 2 and all(c["pagina"] >= 1 and c["expediente"] == "DEMO-1" for c in chunks), f"{len(chunks)} fragmentos con página y metadatos")
top = idx.buscar("monto total solicitado del cambio", 1)[0][1]
ok("1 250 000" in top["texto"], "la búsqueda de 'monto' encuentra la solicitud")
ok(idx.buscar("monto", 3, {"expediente": "OTRO"}) == [], "el filtro por expediente aísla documentos")

print("Verificador de citas")
t = "El monto total solicitado asciende a S/ 1 250 000 con cargo al fondo."
ok(verificador.cita_en_texto("monto total solicitado asciende a S/ 1 250 000", t), "cita literal aceptada")
ok(verificador.cita_en_texto("MONTO TOTAL solicitado ASCIENDE a s/ 1 250 000", t), "ignora mayúsculas")
ok(not verificador.cita_en_texto("el monto asciende a S/ 9 999 999 con cargo al presupuesto", t), "cita inventada rechazada")
ok(not verificador.cita_en_texto("monto", t), "cita demasiado corta rechazada")
txt = "en el marco del procedimiento UFI- 2026-0001, solicitamos autorización para el uso excepcional de S/ 436,594.67 del fondo de inversiones."
ok(not verificador.cita_en_texto("en el marco del procedimiento UFI- 2021, solicitamos autorización para el uso excepcional de S/ 436,594.67 del fondo", txt), "cita con cifra alterada rechazada")

print("Motor con modelo simulado")
class Fiel:  # responde bien: cita literal del primer fragmento
    nombre = "simulado_fiel"
    def responder(self, s, u):
        import re
        i = re.search(r"\[([^\]]+)\]", u).group(1)
        txt = idx.por_id[i]["texto"]
        return json.dumps({"estado": "evidencia_encontrada", "fuente": i, "cita": txt[60:140], "motivo": "ok"})
class Mentiroso:  # inventa la cita
    nombre = "simulado_mentiroso"
    def responder(self, s, u):
        return json.dumps({"estado": "evidencia_encontrada", "fuente": "no#existe", "cita": "texto totalmente inventado por el modelo", "motivo": "x"})
class Basura:
    nombre = "simulado_basura"
    def responder(self, s, u): return "lo siento, no puedo"
req = json.loads((RAIZ / "requisitos_demo.json").read_text())["requisitos"]
r = motor.evaluar(req, idx, Fiel(), "requisitos")
ok(all(x["verificada"] and x["estado"] in ("evidencia_encontrada", "evidencia_parcial") for x in r), "cita real -> verificada (la guarda puede bajar a parcial si no trae términos clave)")
r = motor.evaluar(req, idx, Mentiroso(), "requisitos")
ok(all(x["estado"] == "no_hallada" and "alerta" in x for x in r), "cita inventada -> degradada a no_hallada con alerta")
r = motor.evaluar(req, idx, Basura(), "requisitos")
ok(all(x["origen"] == "recuperacion" and x["requiere_revision"] for x in r), "respuesta inválida -> cae a recuperación, a revisión humana")
ok(any(x["estado"] == "evidencia_parcial" for x in r), "recuperación marca 'evidencia_parcial' (nunca evidencia encontrada)")
ok(not any(x["estado"] == "evidencia_encontrada" for x in r), "sin modelo jamás declara evidencia encontrada")
txt = motor.borrador_subsanacion(r, expediente="DEMO-1")
ok("BORRADOR" in txt and "[plazo por definir" in txt, "borrador no inventa el plazo")
ok("3 días hábiles" in motor.borrador_subsanacion(r, 3), "el plazo lo pone la persona")
r2 = motor.evaluar([{"id": "X", "texto": "paneles solares fotovoltaicos en la azotea"}], idx, Fiel(), "requisitos")
ok(r2[0]["estado"] == "no_hallada", "tema ausente -> no_hallada")

print("Cifras (las compara el código)")
c = motor.contrastar_cifras((DEMO / "solicitud_sintetica.txt").read_text(), (DEMO / "respuesta_sintetica.txt").read_text())
vs = [x["valor"] for x in c["solo_en_referencia"]]; vr = [x["valor"] for x in c["solo_en_respuesta"]]
ok(4500 in vs and 4800 in vr, "detecta 4 500 -> 4 800 medidores")
ok(1250000 in vs and 1310000 in vr, "detecta S/ 1 250 000 -> S/ 1 310 000")
ok(motor._valor("19 935") == motor._valor("19,935") == motor._valor("19.935") == 19935, "miles con espacio, coma o punto")

print("Datos")
d = datos_ia.cargar(DATOS)
q = datos_ia.calidad(d).set_index("regla").n
ok(q["Proyectos sin CUI (DS03)"] == 62, "62 proyectos sin CUI")
ok(q["Filas DS04 con cod_proyecto inexistente en DS03"] == 16, "16 filas DS04 con código inexistente")
ok(q["Hitos con fecha_fin anterior a fecha_inicio"] == 1, "1 hito con fechas invertidas")
f = datos_ia.fichas(d)
ok(len(f) == 7, "7 fichas de expedientes en trámite")
ok(any("RP-2025-0002" in x["id"] and "superado por 51 días hábiles" in x["texto"] for x in f), "ficha de RP-2025-0002: plazo superado por 51 días hábiles al corte")

print("Extracción de campos (reglas)")
import extraccion, reglas_ufi, incorporar_actualizacion as inc, tempfile, pandas as pd
carta = "CARTA N.° 005-2026-EPS07/GG 01/09/2026 en el marco del procedimiento UFI-\n2026-0001, solicitamos autorización para el uso excepcional de S/ 436,594.67 del fondo de\ninversiones. Motivo: Rotura de línea de conducción.\n\nAdjuntamos los anexos."
e = extraccion.extraer(carta)["campos"]
ok(e["monto_solicitado"] == 436594.67 and e["expediente"] == "UFI-2026-0001", "carta: monto y expediente (aun con salto de línea)")
ok(e["motivo"] == "Rotura de línea de conducción", "carta: motivo")
of = extraccion.extraer("Oficio OF-2024-0013 20/06/2024 ... que deben subsanarse en un plazo de diez (10) días hábiles:\n 1. No se adjunta el sustento.\n 2. El cronograma no es coherente.\nAtentamente,")["campos"]
ok(of["plazo_oficio_dh"] == 10 and len(of["observaciones"]) == 2, "oficio: plazo del oficio y observaciones")
ok(extraccion.extraer("Resolución RCD-2024-0011 Lima, 25/07/2024 SE RESUELVE: Artículo 1.° Autorizar el uso por S/ 254,485.44. Artículo 2.° Notificar")["campos"]["monto_autorizado"] == 254485.44, "resolución: monto autorizado")
ok(extraccion.extraer("Informe INF-2025-0025 Sentido propuesto: denegado.")["campos"]["sentido_propuesto"] == "denegado", "informe: sentido propuesto")

print("Reglas de datos UFI")
f5 = d["ds05"]
x = reglas_ufi.monto_vs_saldo(1_250_000, "EPS02", "2026-09-30", f5)
ok(x["mes"] == "2026-08" and x["excede_saldo"] is True, "monto S/ 1 250 000 excede el saldo previo de EPS02 (DS05)")
ok(reglas_ufi.monto_vs_saldo(436594.67, "EPS07", "2026-09-01", f5)["excede_saldo"] is False, "monto de UFI-2026-0001 no excede el saldo de EPS07")
c = reglas_ufi.contrastar_con_fondo("UFI-2024-0001", 424142.40, 254485.44, f5)
ok(c["registrado_en_fondo"] and c["coincide_con_autorizado"] and c["coincide_con_solicitado"] is False, "UFI-2024-0001: fondo coincide con lo autorizado, no con lo solicitado")

print("Actualización de datos")
with tempfile.TemporaryDirectory() as tmp:
    r = inc.incorporar(DATOS, RAIZ / "datos_actualizacion_2026-11-20", tmp)
    ok(r["ds02_procedimientos.csv"]["nuevas"] == 20 and r["ds02_procedimientos.csv"]["reemplazadas"] == 5, "DS02: 5 reemplazados y 20 nuevos")
    dm = datos_ia.cargar(tmp)
    ok(len(dm["ds02"]) == 501 and len(dm["ds05"]) == 3303, "tablas combinadas: 501 expedientes, 3 303 filas de fondos")
    ok(len(datos_ia.fichas(dm, pd.Timestamp("2026-11-20"))) == 4, "al 20/11 quedan 4 expedientes abiertos de los 3 trámites")

print("Ingesta de PDFs ya extraídos")
chs = ingesta.ingerir_carpeta(RAIZ / "documentos_sprint")
ix = Indice(chs)
ok(len(chs) > 100 and all("DOCUMENTO FICTICIO" not in c["texto"] for c in chs), "encabezado repetido eliminado de los fragmentos")
rr = motor.evaluar([{"id": "A", "texto": "Acuerdo de Directorio que aprueba la solicitud", "palabras_clave": ["acuerdo", "Directorio"]},
                    {"id": "B", "texto": "Cronograma de ejecución", "palabras_clave": ["cronograma"]}], ix, Basura(), "requisitos", {"expediente": "UFI-2026-0001"})
ok(rr[0]["estado"] == "no_hallada" and rr[1]["estado"] == "evidencia_parcial", "UFI-2026-0001: sin acuerdo de Directorio; cronograma solo mencionado")

print("Guardas sobre el modelo")
class Falso:
    nombre = "falso"
    def __init__(s, r): s.r = r
    def responder(s, a, b): return json.dumps(s.r)
fr = [{"id": "X#1", "doc": "x.txt", "pagina": 1, "texto": "Solicitamos el uso excepcional de S/ 100.00 del fondo y no adjuntamos el sustento de costos. Firma la Gerencia General de la empresa.", "expediente": "E"}]
ix2 = Indice(fr)
def ev(resp, kw):
    return motor.evaluar([{"id": "K", "texto": "Se adjunta el sustento de costos", "palabras_clave": kw}], ix2, Falso(resp), "requisitos")[0]
r1 = ev({"estado": "evidencia_parcial", "fuente": "X#1", "cita": "Solicitamos el uso excepcional de S/ 100.00 del fondo", "motivo": "No se encuentra el sustento de costos en los fragmentos"}, ["costos"])
ok(r1["estado"] == "no_hallada" and r1["alerta"], "parcial con motivo negativo baja a no_hallada")
r2 = ev({"estado": "evidencia_encontrada", "fuente": "X#1", "cita": "Solicitamos el uso excepcional de S/ 100.00 del fondo", "motivo": "Firma de la gerencia"}, ["Gerencia General"])
ok(r2["estado"] == "evidencia_parcial" and "X#1" in r2["alerta"], "encontrada sin término clave en la cita baja a parcial y señala otro fragmento")
r3 = ev({"estado": "evidencia_encontrada", "fuente": "X#1", "cita": "Firma la Gerencia General de la empresa", "motivo": "Firma de la gerencia"}, ["Gerencia General"])
ok(r3["estado"] == "evidencia_encontrada" and r3["es_verificada" if "es_verificada" in r3 else "verificada"], "encontrada con cita y término clave se mantiene")

print("Servidor (API v1)")
import os, re, tempfile  # noqa: E402
os.environ["COPILOTO_TOKEN_SERVICIO"] = "token-de-prueba"
import servidor  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
cli = TestClient(servidor.app)
servidor.REGISTRO = Path(tempfile.mkdtemp()) / "decisiones.jsonl"
H = {"Authorization": "Bearer token-de-prueba", "X-Rol": "sunass"}
CAMEL = re.compile(r"^[a-z][a-zA-Z0-9]*$")
def claves(o, ruta=""):
    if isinstance(o, dict):
        for k, v in o.items():
            yield ruta + "/" + k, k
            yield from claves(v, ruta + "/" + k)
    elif isinstance(o, list):
        for x in o:
            yield from claves(x, ruta)
def camel_ok(o):
    return [r for r, k in claves(o) if not CAMEL.match(k) and not re.fullmatch(r"[\d.]+", k)]
s = cli.get("/v1/salud").json()
ok(s["cantidadFragmentos"] == 9 + len(ingesta.ingerir_carpeta(servidor.NORMATIVA, origen="norma")), "GET /v1/salud")
ok(len(cli.get("/v1/calidad", headers=H).json()) >= 5, "GET /v1/calidad")
ok("charset=utf-8" in cli.get("/v1/calidad", headers=H).headers["content-type"], "JSON declara charset=utf-8")
e = cli.get("/v1/calidad")
ok(e.status_code == 401 and e.headers["content-type"].startswith("application/problem+json") and e.json()["codigo"] == "credenciales_invalidas", "sin token: 401 RFC 9457")
e = cli.get("/v1/calidad", headers={**H, "X-Rol": "eps"})
ok(e.status_code == 403 and {"type", "title", "status", "detail", "instance"} <= e.json().keys(), "rol eps: 403 RFC 9457")
ok(cli.get("/v1/expedientes/NO-EXISTE/ficha", headers=H).json()["codigo"] == "expediente_no_encontrado", "404 expediente_no_encontrado")
pedido = {"requisitos": [{"codigoRequisito": r["id"], "texto": r["texto"], "palabrasClave": r.get("palabras_clave", [])} for r in req]}
resp = cli.post("/v1/expedientes/CPI-2026-0003/evaluaciones-requisitos", json=pedido, headers=H).json()
ok(len(resp["resultados"]) == 4 and "borrador" in resp and resp["resultados"][0]["debeRevisarse"] is True, "POST evaluaciones-requisitos")
ok(cli.post("/v1/contrastes-cifras", json={"referencia": "4 500 medidores", "respuesta": "4 800 medidores"}, headers=H).json()["soloEnRespuesta"][0]["valor"] == 4800, "POST contrastes-cifras")
pr = cli.post("/v1/preguntas", json={"pregunta": "¿cuándo vence el plazo del expediente CPI-2026-0003?"}, headers=H).json()
ok(len(pr["pasajes"]) > 0, "POST preguntas devuelve pasajes")
ok(pr["incertidumbre"]["nivel"] in ("media", "alta") and pr["incertidumbre"]["advertencia"] and pr["incertidumbre"]["motivos"], "preguntas: advierte incertidumbre")
ok(any(p["vinculo"] and p["codigoDocumento"] for p in pr["pasajes"]) or not any(p["codigoDocumento"] for p in pr["pasajes"]), "preguntas: pasajes con enlace al documento (si tienen codigoDocumento)")
ok(cli.post("/v1/preguntas", json={}, headers=H).json()["codigo"] == "validacion_fallida", "422 validacion_fallida")
uid = "3f1c2a9e-7b4d-4c1e-9a2f-5d6e7f8a9b0c"
d = cli.post("/v1/decisiones", json={"codigoExpediente": "UFI-2026-0001", "codigoRequisito": "U1", "decision": "revisado", "registradoPorId": uid}, headers=H)
ok(d.status_code == 201 and d.json()["registradoEn"].endswith("Z"), "POST decisiones: registradoEn UTC con Z")
ok(len(cli.get("/v1/decisiones?codigoExpediente=UFI-2026-0001", headers=H).json()) == 1, "GET decisiones por codigoExpediente")
ok(cli.post("/v1/decisiones", json={"codigoExpediente": "X", "decision": "cumple", "registradoPorId": uid}, headers=H).status_code == 422, "decision 'cumple' no existe")
ex = cli.post("/v1/extracciones", json={"texto": "Resolución RCD-2026-0009 Lima, 12/10/2026 SE RESUELVE Artículo 1.° Autorizar por S/ 436,594.67 Artículo 2"}, headers=H).json()
ok(ex["tipoDocumento"] == "resolucion_consejo_directivo" and ex["campos"].get("fecha") == "2026-10-12" and ex["campos"].get("montoAutorizado") == "436594.67", "extracciones: catálogo, fecha ISO, monto como cadena")
fi = cli.get("/v1/expedientes/UFI-2026-0001/ficha", headers=H).json()
ok({"cabecera", "normativa", "plazos", "pendientes", "requisitos", "documentos", "reglasDeDatos"} <= fi.keys(), "GET ficha estructura")
ok(re.fullmatch(r"\d{4}-\d{2}-\d{2}", fi["cabecera"]["fechaInicio"]) and fi["cabecera"]["areaResponsableActual"] in ("dre", "DRE", "equipo_srt", "SRT", "GG", "CD", "EP"), "ficha: fechas AAAA-MM-DD")
ok({p["naturaleza"] for p in fi["plazos"]} >= {"normativo", "interno"}, "ficha: plazos rotulados por naturaleza")
ok(all(r["estado"] != "cumple" and r["debeRevisarse"] for r in fi["requisitos"]), "ficha: nunca 'cumple', siempre a revisión")
ok(fi["normativa"] and fi["normativa"][0]["documento"], "ficha: normativa con fuente")
cd = cli.get("/v1/expedientes/UFI-2025-0001/cadena-documental", headers=H).json()
ok({d["rolDocumental"] for d in cd["documentos"]} >= {"solicitud", "oficio", "respuesta", "informe", "resolucion", "anexo"} and cd["rolesSinDocumento"] == [], "cadena: clasifica solicitud, oficio, respuesta, informe y resolución")
ok(all(d["vinculo"] for d in cd["documentos"] if d["codigoDocumento"]), "cadena: cada documento con enlace")
ok(cli.get("/v1/expedientes/UFI-2026-0001/cadena-documental", headers=H).json()["rolesSinDocumento"] == ["oficio", "respuesta", "resolucion"], "cadena: expediente en trámite informa roles sin documento")
ok(cli.get("/v1/expedientes/NO-EXISTE/cadena-documental", headers=H).status_code == 404, "cadena: 404 si no hay documentos")
ix = Indice(ingesta.ingerir_carpeta(Path(__file__).parent.parent / "documentos_sprint"))
import cadena as cad  # noqa: E402
cc = cad.cadena("UFI-2025-0001", ix, datos_ia.cargar(Path(__file__).parent.parent / "datos_demo")["ds11"])
of = next(d for d in cc["documentos"] if d["rol_documental"] == "oficio")
ok(any(x["tipo"] == "menciona" and x["codigo_documento"] == "DOC-001560" and x["cita"] for x in of["conexiones"]), "cadena: oficio -> solicitud por mención con cita literal")
inf = next(d for d in cc["documentos"] if d["rol_documental"] == "informe")
ok({x["codigo_documento"] for x in inf["conexiones"] if x["tipo"] == "menciona"} >= {"DOC-001560", "DOC-001564", "DOC-001565"}, "cadena: informe conecta con solicitud, oficio y respuesta")
ok(not camel_ok(cd) and not camel_ok(fi) and not camel_ok(resp) and not camel_ok(pr) and not camel_ok(d.json()), "claves de salida en camelCase")
esq = cli.get("/openapi.json").json()
nombres = [k for s_ in esq["components"]["schemas"].values() for k in s_.get("properties", {})]
nombres += [p["name"] for ru in esq["paths"].values() for op in ru.values() for p in op.get("parameters", []) if p["in"] != "header"]
ok(nombres and all(CAMEL.match(n) for n in nombres), f"openapi.json: {len(nombres)} claves/parámetros en camelCase")
ok(all(r.startswith("/v1/") for r in esq["paths"]), "todas las rutas bajo /v1")

print("\n" + ("TODO OK" if not fallos else f"FALLÓ: {len(fallos)}"))
sys.exit(1 if fallos else 0)
