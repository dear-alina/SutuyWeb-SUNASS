"""Contrato HTTP del copiloto (docs/convenciones): modelos Pydantic v2 con camelCase hacia afuera y adaptadores desde los dicts
internos (snake_case, nombres del dataset). Fechas AAAA-MM-DD, montos como cadena, catálogos con el estilo del dataset."""
from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

import pandas as pd
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

import cadena

AREAS = {"Equipo SRT": "equipo_srt"}  # el área del prototipo pasa a catálogo (admin es rol, no área)
TIPOS_DOCUMENTO = {"resolucion_cd": "resolucion_consejo_directivo"}
DECISIONES = ("revisado", "no_es_correcto", "confirma_falta", "si_esta_en_expediente")


class Modelo(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------- utilidades ----------
def fecha(x) -> date | None:
    if x is None or x is pd.NaT or (isinstance(x, float) and x != x):
        return None
    if isinstance(x, (pd.Timestamp, datetime)):
        return x.date()
    if isinstance(x, date):
        return x
    x = str(x).strip()
    m = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", x)
    return date(int(m[3]), int(m[2]), int(m[1])) if m else date.fromisoformat(x[:10])


def monto(x) -> Decimal | None:
    return None if x is None or x != x else Decimal(f"{float(x):.2f}")


# ---------- entradas ----------
class ItemRequisito(Modelo):
    codigo_requisito: str
    texto: str
    palabras_clave: list[str] = []


class SolicitudRequisitos(Modelo):
    requisitos: list[ItemRequisito]
    plazo_dias_habiles: int | None = None


class SolicitudInformacion(Modelo):
    items: list[ItemRequisito]


class SolicitudPregunta(Modelo):
    pregunta: str
    codigo_expediente: str | None = None


class SolicitudExtraccion(Modelo):
    texto: str


class SolicitudContraste(Modelo):
    referencia: str
    respuesta: str


class SolicitudDecision(Modelo):
    codigo_expediente: str
    codigo_requisito: str | None = None
    decision: Literal[DECISIONES]
    registrado_por_id: UUID
    comentario: str | None = None
    estado_sugerido: str | None = None
    codigo_fragmento: str | None = None


# ---------- salidas ----------
class Salud(Modelo):
    modelo: str
    cantidad_fragmentos: int
    documentos: list[str]


class ReglaCalidad(Modelo):
    regla: str
    cantidad: int
    detalle: str
    severidad: str


class Resultado(Modelo):
    codigo_requisito: str
    punto: str
    estado: str  # evidencia_encontrada | evidencia_parcial | no_hallada | no_determinable | atendido | parcial | no_atendido (nunca "cumple")
    codigo_fragmento: str | None
    documento: str | None
    pagina: int | None
    cita: str
    motivo: str
    origen: str
    es_verificada: bool
    debe_revisarse: bool
    alerta: str | None = None
    estado_original: str | None = None


class RespuestaEvaluacion(Modelo):
    resultados: list[Resultado]
    borrador: str | None = None
    modelo: str


class Pasaje(Modelo):
    codigo_fragmento: str
    documento: str
    pagina: int
    texto: str
    puntaje: float
    codigo_documento: str | None = None
    tipo_documento: str | None = None
    rol_documental: str | None = None
    nivel_acceso: str | None = None
    vinculo: str | None = None  # enlace al documento en el SIA (DS11)


class Incertidumbre(Modelo):
    nivel: Literal["media", "alta"]  # nunca "baja": el modelo puede leer mal aunque la cita exista
    motivos: list[str]
    advertencia: str


class RespuestaPregunta(Modelo):
    respuesta: str
    codigo_fragmento: str | None = None
    cita: str = ""
    es_verificada: bool
    origen: str | None = None
    incertidumbre: Incertidumbre
    pasajes: list[Pasaje]


class Extraccion(Modelo):
    tipo_documento: str
    campos: dict[str, Any]
    origen: str


class CifraAislada(Modelo):
    valor: float
    contexto: str


class Contraste(Modelo):
    solo_en_referencia: list[CifraAislada]
    solo_en_respuesta: list[CifraAislada]
    coinciden: list[float]
    aviso: str


class Decision(SolicitudDecision):
    registrado_en: datetime  # instante en UTC con Z


class Cabecera(Modelo):
    codigo_expediente: str
    codigo_eps: str
    tipo_procedimiento: str
    base_normativa: str
    estado: str
    etapa_actual: str | None
    area_responsable_actual: str | None
    fecha_inicio: date


class FragmentoNormativo(Modelo):
    codigo_fragmento: str
    documento: str
    pagina: int
    texto: str


class Plazo(Modelo):
    naturaleza: Literal["normativo", "de_oficio", "interno"]
    descripcion: str
    fecha_limite: date | None = None
    dias_habiles_restantes: int | None = None
    fuente: str
    aviso: str | None = None


class Pendiente(Modelo):
    tipo: str
    detalle: str


class ReglaSaldo(Modelo):
    regla: str
    resultado: str | None = None
    motivo: str | None = None
    periodo: str | None = None
    saldo_previo: Decimal | None = None
    monto_solicitado: Decimal | None = None
    es_monto_mayor_que_saldo: bool | None = None
    fuente: str | None = None
    nota: str | None = None


class DocumentoExpediente(Modelo):
    codigo_documento: str
    codigo_actuacion: str | None
    tipo_documento: str
    numero_documento: str | None
    fecha_documento: date | None
    asunto: str | None
    nivel_acceso: str  # publico | restringido_partes | interno
    vinculo: str | None


class Conexion(Modelo):
    codigo_documento: str
    tipo: Literal["menciona", "anexo_de", "secuencia"]
    cita: str | None = None
    codigo_fragmento: str | None = None


class DocumentoClasificado(Modelo):
    codigo_documento: str
    codigo_actuacion: str | None
    rol_documental: Literal["solicitud", "oficio", "respuesta", "informe", "resolucion", "anexo", "carta", "otro"]
    tipo_documento: str
    numero_documento: str | None
    fecha_documento: date | None
    asunto: str | None
    nivel_acceso: str
    vinculo: str | None
    conexiones: list[Conexion]


class CadenaDocumental(Modelo):
    codigo_expediente: str
    documentos: list[DocumentoClasificado]
    roles_sin_documento: list[str]
    aviso: str


class Ficha(Modelo):
    cabecera: Cabecera
    normativa: list[FragmentoNormativo]
    aviso_normativa: str | None = None
    plazos: list[Plazo]
    pendientes: list[Pendiente]
    requisitos: list[Resultado]
    reglas_de_datos: list[ReglaSaldo]
    documentos: list[DocumentoExpediente]
    aviso: str


# ---------- adaptadores (dicts internos -> modelos) ----------
def a_resultado(r: dict) -> Resultado:
    return Resultado(codigo_requisito=r["id"], punto=r["punto"], estado=r["estado"], codigo_fragmento=r["fuente"], documento=r["doc"],
                     pagina=r["pagina"], cita=r["cita"], motivo=r["motivo"], origen=r["origen"], es_verificada=r["verificada"],
                     debe_revisarse=r["requiere_revision"], alerta=r.get("alerta"), estado_original=r.get("estado_original"))


def _incertidumbre(r: dict) -> Incertidumbre:
    m = []
    if not r["pasajes"]:
        m.append("No se encontraron pasajes relacionados en los documentos cargados.")
    if not r["verificada"] and r["pasajes"]:
        m.append("La cita del modelo no pudo verificarse contra el documento." if r.get("origen") == "modelo" else "Sin respuesta redactada por el modelo: solo se muestran los pasajes más relacionados.")
    return Incertidumbre(nivel="alta" if m else "media", advertencia="Confirme en el documento enlazado antes de usar esta respuesta.",
                         motivos=m or ["La cita se verificó por código, pero la interpretación del modelo debe confirmarse en el documento."])


def a_pregunta(r: dict, ds11=None) -> RespuestaPregunta:
    doc = {x.id_documento: x for x in ds11.itertuples()} if ds11 is not None else {}
    def pasaje(p):
        d = doc.get(p.get("id_documento"))
        return Pasaje(codigo_fragmento=p["id"], documento=p["doc"], pagina=p["pagina"], texto=p["texto"], puntaje=p["puntaje"], codigo_documento=p.get("id_documento"),
                      tipo_documento=d.tipo_documento if d else None, rol_documental=cadena.rol(d.tipo_documento, d.asunto) if d else None,
                      nivel_acceso=d.nivel_acceso if d else None, vinculo=d.vinculo if d else None)
    return RespuestaPregunta(respuesta=r["respuesta"], codigo_fragmento=r.get("fuente"), cita=r.get("cita", ""), es_verificada=r["verificada"], origen=r.get("origen"),
                             incertidumbre=_incertidumbre(r), pasajes=[pasaje(p) for p in r["pasajes"]])


_CAMPOS = {"numero": "numero", "fecha": "fecha", "expediente": "codigoExpediente", "monto_solicitado": "montoSolicitado", "motivo": "motivo",
           "subsana_oficio": "codigoOficioSubsanado", "plazo_oficio_dh": "plazoOficioDiasHabiles", "observaciones": "observaciones",
           "motivo_evaluado": "motivoEvaluado", "sentido_propuesto": "sentidoPropuesto", "monto_autorizado": "montoAutorizado",
           "articulo_1": "articulo1", "folios": "folios", "menciona_cronograma": "tieneMencionCronograma", "detalle_numerico_incluido": "tieneDetalleNumerico"}


def a_extraccion(e: dict) -> Extraccion:
    campos = {}
    for k, v in e["campos"].items():
        v = fecha(v).isoformat() if k == "fecha" and v else v
        campos[_CAMPOS.get(k) or to_camel(k)] = str(monto(v)) if k.startswith("monto") and v is not None else v
    return Extraccion(tipo_documento=TIPOS_DOCUMENTO.get(e["tipo"], e["tipo"]), campos=campos, origen=e["origen"])


def a_ficha(f: dict) -> Ficha:
    c = f["cabecera"]
    norma = f["normativa"] if isinstance(f["normativa"], list) else []
    return Ficha(
        cabecera=Cabecera(codigo_expediente=c["id_expediente"], codigo_eps=c["cod_eps"], tipo_procedimiento=c["tipo_procedimiento"], base_normativa=c["base_normativa"],
                          estado=c["estado"], etapa_actual=c["etapa_actual"], area_responsable_actual=AREAS.get(c["responsable_actual"], c["responsable_actual"]), fecha_inicio=fecha(c["fecha_inicio"])),
        normativa=[FragmentoNormativo(codigo_fragmento=n["fuente"], documento=n["doc"], pagina=n["pagina"], texto=n["texto"]) for n in norma],
        aviso_normativa=None if norma else f["normativa"],
        plazos=[Plazo(naturaleza=p["naturaleza"], descripcion=p["descripcion"], fecha_limite=fecha(p.get("fecha_limite")), dias_habiles_restantes=p.get("dh_restantes_al_corte"),
                      fuente=p["fuente"], aviso=p.get("aviso")) for p in f["plazos"]],
        pendientes=[Pendiente(**p) for p in f["pendientes"]],
        requisitos=[a_resultado(r) for r in f["requisitos"]],
        reglas_de_datos=[ReglaSaldo(regla="monto_no_excede_saldo_previo", resultado=r.get("resultado"), motivo=r.get("motivo"), periodo=r.get("mes"), saldo_previo=monto(r.get("saldo")),
                                    monto_solicitado=monto(r.get("monto_solicitado")), es_monto_mayor_que_saldo=r.get("excede_saldo"), fuente=r.get("fuente"), nota=r.get("nota")) for r in f["reglas_de_datos"]],
        documentos=[DocumentoExpediente(codigo_documento=d["id_documento"], codigo_actuacion=d["id_actuacion"], tipo_documento=TIPOS_DOCUMENTO.get(d["tipo_documento"], d["tipo_documento"]),
                                        numero_documento=d["numero_documento"], fecha_documento=fecha(d["fecha_documento"]), asunto=d["asunto"], nivel_acceso=d["nivel_acceso"], vinculo=d["vinculo"]) for d in f["documentos"]],
        aviso=f["aviso"])


def a_cadena(eid: str, c: dict) -> CadenaDocumental:
    return CadenaDocumental(codigo_expediente=eid, roles_sin_documento=c["roles_sin_documento"], aviso=c["aviso"],
                            documentos=[DocumentoClasificado(**{**d, "fecha_documento": fecha(d["fecha_documento"]), "conexiones": [Conexion(**x) for x in d["conexiones"]]}) for d in c["documentos"]])
