"""Verificador de citas: una afirmación del modelo solo vale si su cita existe en la fuente."""
from __future__ import annotations

import re
from difflib import SequenceMatcher

from texto import norm

MIN_CARACTERES = 15


def cita_en_texto(cita: str, texto: str, umbral: float = 0.93) -> bool:
    """True si la cita aparece (sin importar tildes, mayúsculas ni espacios) o casi literal (>= umbral)."""
    c, t = norm(cita or ""), norm(texto or "")
    if len(c) < MIN_CARACTERES:
        return False
    if c in t:
        return True
    if len(t) < len(c):
        return False
    paso = max(1, len(c) // 4)
    for i in range(0, len(t) - len(c) + 1, paso):
        ventana = t[i:i + len(c)]
        if SequenceMatcher(None, c, ventana).ratio() >= umbral and re.findall(r"\d+", c) == re.findall(r"\d+", ventana):  # una cifra alterada no pasa
            return True
    return False


def verificar_item(item: dict, por_id: dict, estado_degradado: str = "no_hallada") -> dict:
    """Comprueba que item['fuente'] exista y que item['cita'] esté en ese fragmento.
    Si falla, baja el estado a `estado_degradado` y deja la alerta (nunca se oculta el fallo)."""
    ch = por_id.get(item.get("fuente"))
    ok = bool(ch) and cita_en_texto(item.get("cita", ""), ch["texto"])
    item["verificada"] = ok
    if not ok:
        item["alerta"] = "La cita no se encontró en la fuente indicada; descartada."
        item["estado_original"] = item.get("estado")
        item["estado"] = estado_degradado
        item["cita"] = ""
    return item
