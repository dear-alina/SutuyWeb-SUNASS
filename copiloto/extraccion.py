"""Extracción de campos de documentos del expediente, con REGLAS (no con IA).

Cada campo sale como PROPUESTA con su origen ('regla'); si el patrón no aparece, el campo queda en None
y la persona lo completa. Sirve para precargar el panel y para cruzar con las tablas (DS05, DS10, DS11).
"""
from __future__ import annotations

import re

_EXP = r"([A-Z]{2,4}-\s?\d{4}-\s?\d{4})"


def _plano(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip()


def _g(m, i=1):
    return m.group(i).strip() if m else None


def _monto(s: str | None) -> float | None:
    return float(s.replace(",", "")) if s else None


def tipo_documento(texto: str) -> str:
    t = _plano(texto)
    if re.search(r"[IÍ]ndice de documentos", t): return "indice"
    if re.search(r"SE RESUELVE", t): return "resolucion_cd"
    if re.search(r"\bOficio OF-", t): return "oficio"
    if re.search(r"\bInforme INF-", t): return "informe"
    if re.search(r"\bMemor[aá]ndum MEM-", t): return "memorandum"
    if re.search(r"CARTA N\.°", t): return "carta_ep"
    if re.search(r"\bAnexo \d", t[:80]): return "anexo"
    if re.search(r"\bProve[ií]do\b", t[:60]): return "proveido"
    return "otro"


def extraer(texto: str) -> dict:
    """Devuelve {'tipo': ..., 'campos': {...}, 'origen': 'regla'} para una página/documento."""
    t = _plano(texto)
    tipo = tipo_documento(texto)
    c: dict = {}
    if tipo == "carta_ep":
        c["numero"] = _g(re.search(r"CARTA N\.°\s*([\w\-/.]+)", t))
        c["fecha"] = _g(re.search(r"(\d{2}/\d{2}/\d{4})", t))
        c["expediente"] = (lambda x: x.replace(" ", "") if x else None)(_g(re.search(r"procedimiento\s+" + _EXP, t)))
        c["monto_solicitado"] = _monto(_g(re.search(r"uso excepcional de S/\s*([\d,]+\.\d{2})", t)))
        c["motivo"] = _g(re.search(r"Motivo:\s*(.+?)\.\s+Adjuntamos", t))
        c["subsana_oficio"] = _g(re.search(r"formuladas mediante\s+(OF-\s?\d{4}-\s?\d{4})", t))
        if c["subsana_oficio"]: c["subsana_oficio"] = c["subsana_oficio"].replace(" ", "")
    elif tipo == "oficio":
        c["numero"] = _g(re.search(r"Oficio (OF-\d{4}-\d{4})", t))
        c["fecha"] = _g(re.search(r"(\d{2}/\d{2}/\d{4})", t))
        c["plazo_oficio_dh"] = (lambda x: int(x) if x else None)(_g(re.search(r"plazo de [\wáéíóú]+ \((\d+)\) d[ií]as h[aá]biles", t)))
        cuerpo = re.search(r"d[ií]as h[aá]biles:(.+?)Atentamente", t)
        c["observaciones"] = [x.strip() for x in re.split(r"\s\d\.\s", " " + cuerpo.group(1))[1:]] if cuerpo else []
    elif tipo == "informe":
        c["numero"] = _g(re.search(r"Informe (INF-\d{4}-\d{4})", t))
        c["fecha"] = _g(re.search(r"Fecha (\d{2}/\d{2}/\d{4})", t))
        c["motivo_evaluado"] = _g(re.search(r"motivo invocado \((.+?)\)\s+califica", t))
        c["sentido_propuesto"] = _g(re.search(r"Sentido propuesto:\s*([^.]+)\.", t))
    elif tipo == "memorandum":
        c["numero"] = _g(re.search(r"Memor[aá]ndum (MEM-\d{4}-\d{4})", t))
        c["fecha"] = _g(re.search(r"Fecha (\d{2}/\d{2}/\d{4})", t))
    elif tipo == "resolucion_cd":
        c["numero"] = _g(re.search(r"Resoluci[oó]n (RCD-\d{4}-\d{4})", t))
        c["fecha"] = _g(re.search(r"Lima,\s*(\d{2}/\d{2}/\d{4})", t))
        c["monto_autorizado"] = _monto(_g(re.search(r"Art[ií]culo 1\.° Autorizar.*?por S/\s*([\d,]+\.\d{2})", t)))
        c["articulo_1"] = _g(re.search(r"Art[ií]culo 1\.°\s*(.+?)\s*Art[ií]culo 2", t))
    elif tipo == "anexo":
        c["folios"] = (lambda x: int(x) if x else None)(_g(re.search(r"Folios:\s*(\d+)", t)))
        c["menciona_cronograma"] = bool(re.search(r"cronograma", t, re.I))
        c["detalle_numerico_incluido"] = not re.search(r"no se reproduce", t, re.I)
    return {"tipo": tipo, "campos": c, "origen": "regla"}
