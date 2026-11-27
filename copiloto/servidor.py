"""Copiloto de IA para SutuWeb · API v1 (FastAPI). Convenciones: /v1, camelCase hacia afuera, errores RFC 9457.

Uso:   python servidor.py   (puerto 8765)   |   uvicorn servidor:app
Seguridad: el backend llama con  Authorization: Bearer $COPILOTO_TOKEN_SERVICIO  y  X-Rol (sunass|admin). La EPS y el público no llegan aquí.
Variables: COPILOTO_TOKEN_SERVICIO (obligatoria) · COPILOTO_ROLES · COPILOTO_CORPUS · COPILOTO_NORMATIVA · COPILOTO_DATOS · COPILOTO_CORTE · COPILOTO_LLM=ollama|sin|auto
"""
from __future__ import annotations

import hmac
import json
import os
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from fastapi import Depends, FastAPI, Path as RutaP, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as HTTPError

AQUI = Path(__file__).parent
sys.path.insert(0, str(AQUI))
import cadena as _cadena, contratos as C, datos_ia, extraccion, ficha as _ficha, ingesta, llm as _llm, motor  # noqa: E402
from buscador import Indice  # noqa: E402

CORPUS = Path(os.environ.get("COPILOTO_CORPUS", AQUI / "documentos_demo"))
NORMATIVA = Path(os.environ.get("COPILOTO_NORMATIVA", AQUI / "normativa"))
DATOS = Path(os.environ.get("COPILOTO_DATOS", AQUI / "datos_demo"))
CORTE = pd.Timestamp(os.environ.get("COPILOTO_CORTE", "2026-09-30"))
ROLES = set(os.environ.get("COPILOTO_ROLES", "sunass,admin").split(","))
REGISTRO = AQUI / "indice" / "registro_decisiones.jsonl"
_CANDADO = threading.Lock()


def construir():
    chunks = ingesta.ingerir_carpeta(CORPUS) if CORPUS.exists() else []
    d = datos_ia.cargar(DATOS) if DATOS.exists() else {}
    chunks += ingesta.ingerir_carpeta(NORMATIVA, origen="norma") if NORMATIVA.exists() else []
    chunks += datos_ia.fichas(d, CORTE)
    return Indice(chunks), d, _llm.elegir(AQUI / "indice" / "cache_respuestas.json")


INDICE, DATOS_DF, LLM = construir()


# ---------- errores RFC 9457 ----------
class Problema(Exception):
    def __init__(self, status: int, codigo: str, titulo: str, detalle: str):
        self.status, self.codigo, self.titulo, self.detalle = status, codigo, titulo, detalle


def _problema(request: Request, status: int, codigo: str, titulo: str, detalle: str, **extra):
    cuerpo = {"type": f"urn:sunass:error:{codigo}", "title": titulo, "status": status, "detail": detalle, "instance": request.url.path, "codigo": codigo, **extra}
    return JSONResponse(cuerpo, status_code=status, media_type="application/problem+json; charset=utf-8")


class JsonUtf8(JSONResponse):
    media_type = "application/json; charset=utf-8"  # sin charset, PowerShell 5.1 lee mal las tildes


app = FastAPI(title="Copiloto SutuWeb", version="1", default_response_class=JsonUtf8)


@app.exception_handler(Problema)
async def _h_problema(request: Request, e: Problema):
    return _problema(request, e.status, e.codigo, e.titulo, e.detalle)


@app.exception_handler(RequestValidationError)
async def _h_validacion(request: Request, e: RequestValidationError):
    campos = [{"campo": ".".join(str(x) for x in err["loc"]), "mensaje": err["msg"]} for err in e.errors()]
    return _problema(request, 422, "validacion_fallida", "La solicitud no es válida", "Revise los campos indicados.", errores=campos)


@app.exception_handler(HTTPError)
async def _h_http(request: Request, e: HTTPError):
    return _problema(request, e.status_code, "ruta_no_encontrada" if e.status_code == 404 else "solicitud_rechazada", "Solicitud rechazada", str(e.detail))


def autorizar(request: Request) -> None:
    """Servicio a servicio: token del backend + rol. El área SRT la valida el backend; aquí se bloquea a la EPS y al público."""
    esperado = os.environ.get("COPILOTO_TOKEN_SERVICIO")
    if not esperado:
        raise Problema(503, "copiloto_sin_token", "Copiloto sin configurar", "Falta COPILOTO_TOKEN_SERVICIO.")
    recibido = request.headers.get("authorization", "").removeprefix("Bearer ")
    if not hmac.compare_digest(recibido.encode(), esperado.encode()):
        raise Problema(401, "credenciales_invalidas", "Credenciales inválidas", "Token de servicio ausente o incorrecto.")
    if request.headers.get("x-rol") not in ROLES:
        raise Problema(403, "acceso_denegado", "Acceso denegado", f"El copiloto solo se usa en las vistas de Sunass (rol en {sorted(ROLES)}).")


Seg = [Depends(autorizar)]
Exp = RutaP(alias="codigoExpediente")


# ---------- rutas ----------
@app.get("/v1/salud", response_model=C.Salud)
def salud():
    return C.Salud(modelo=LLM.nombre, cantidad_fragmentos=len(INDICE.chunks), documentos=sorted({c["doc"] for c in INDICE.chunks}))


@app.get("/v1/calidad", response_model=list[C.ReglaCalidad], dependencies=Seg)
def calidad():
    return [C.ReglaCalidad(regla=r["regla"], cantidad=r["n"], detalle=r["detalle"], severidad=r["severidad"]) for r in datos_ia.calidad(DATOS_DF).to_dict("records")]


@app.get("/v1/expedientes/{codigoExpediente}/cadena-documental", response_model=C.CadenaDocumental, dependencies=Seg)
def cadena_documental(codigo_expediente: str = Exp):
    """Copiloto documental: solicitud, oficio, respuesta, informe y resolución clasificados y conectados, con enlace al documento."""
    if "ds11" not in DATOS_DF or DATOS_DF["ds11"].id_expediente.ne(codigo_expediente).all():
        raise Problema(404, "expediente_no_encontrado", "Expediente no encontrado", f"Sin documentos en el índice para {codigo_expediente}.")
    return C.a_cadena(codigo_expediente, _cadena.cadena(codigo_expediente, INDICE, DATOS_DF["ds11"]))


@app.get("/v1/expedientes/{codigoExpediente}/ficha", response_model=C.Ficha, dependencies=Seg)
def ficha(codigo_expediente: str = Exp):
    f = _ficha.ficha(codigo_expediente, INDICE, LLM, DATOS_DF, CORTE)
    if "error" in f:
        raise Problema(404, "expediente_no_encontrado", "Expediente no encontrado", f["error"])
    return C.a_ficha(f)


def _items(items):
    return [{"id": i.codigo_requisito, "texto": i.texto, "palabras_clave": i.palabras_clave} for i in items]


@app.post("/v1/expedientes/{codigoExpediente}/evaluaciones-requisitos", response_model=C.RespuestaEvaluacion, dependencies=Seg)
def evaluar_requisitos(cuerpo: C.SolicitudRequisitos, codigo_expediente: str = Exp):
    r = motor.evaluar(_items(cuerpo.requisitos), INDICE, LLM, "requisitos", {"expediente": codigo_expediente})
    return C.RespuestaEvaluacion(resultados=[C.a_resultado(x) for x in r], modelo=LLM.nombre,
                                 borrador=motor.borrador_subsanacion(r, cuerpo.plazo_dias_habiles, codigo_expediente))


@app.post("/v1/expedientes/{codigoExpediente}/evaluaciones-informacion", response_model=C.RespuestaEvaluacion, dependencies=Seg)
def evaluar_informacion(cuerpo: C.SolicitudInformacion, codigo_expediente: str = Exp):
    r = motor.evaluar(_items(cuerpo.items), INDICE, LLM, "informacion", {"expediente": codigo_expediente})
    return C.RespuestaEvaluacion(resultados=[C.a_resultado(x) for x in r], modelo=LLM.nombre)


@app.post("/v1/preguntas", response_model=C.RespuestaPregunta, dependencies=Seg)
def preguntar(cuerpo: C.SolicitudPregunta):
    filtro = {"expediente": cuerpo.codigo_expediente} if cuerpo.codigo_expediente else None
    return C.a_pregunta(motor.preguntar(cuerpo.pregunta, INDICE, LLM, filtro), DATOS_DF.get("ds11"))


@app.post("/v1/extracciones", response_model=C.Extraccion, dependencies=Seg)
def extraer(cuerpo: C.SolicitudExtraccion):
    return C.a_extraccion(extraccion.extraer(cuerpo.texto))


@app.post("/v1/contrastes-cifras", response_model=C.Contraste, dependencies=Seg)
def contrastar(cuerpo: C.SolicitudContraste):
    return C.Contraste(**{C.to_camel(k): v for k, v in motor.contrastar_cifras(cuerpo.referencia, cuerpo.respuesta).items()})


@app.post("/v1/decisiones", response_model=C.Decision, status_code=201, dependencies=Seg)
def registrar(cuerpo: C.SolicitudDecision):
    """Decisión de la persona sobre una sugerencia: queda con quién y cuándo (instante UTC)."""
    d = C.Decision(**cuerpo.model_dump(), registrado_en=datetime.now(timezone.utc).replace(microsecond=0))
    REGISTRO.parent.mkdir(exist_ok=True)
    with _CANDADO, REGISTRO.open("a", encoding="utf-8") as f:
        f.write(d.model_dump_json(by_alias=True) + "\n")
    return d


@app.get("/v1/decisiones", response_model=list[C.Decision], dependencies=Seg)
def listar_decisiones(codigo_expediente: str | None = Query(None, alias="codigoExpediente")):
    filas = [C.Decision(**json.loads(l)) for l in REGISTRO.read_text(encoding="utf-8").splitlines()] if REGISTRO.exists() else []
    return [d for d in filas if not codigo_expediente or d.codigo_expediente == codigo_expediente]


if __name__ == "__main__":
    import uvicorn
    puerto = int(os.environ.get("PORT", 8765))
    print(f"Copiloto en http://localhost:{puerto}/v1  ·  modelo: {LLM.nombre}  ·  fragmentos: {len(INDICE.chunks)}")
    uvicorn.run(app, host="127.0.0.1", port=puerto, log_level="warning")
