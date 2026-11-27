"""Utilidades de texto: normalización y tokenización para español (sin dependencias)."""
import re
import unicodedata

STOP = set("""de la el en y a los las del que se por con para un una al lo como su sus es o u e este esta esto
estos estas ese esa son ser fue han ha hay sin sobre entre desde hasta cada todo toda todos todas mas muy no si
le les nos ya pero tambien segun art articulo""".split())


def sin_tildes(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def norm(s: str) -> str:
    """Minúsculas, sin tildes y con espacios colapsados (para comparar citas)."""
    return re.sub(r"\s+", " ", sin_tildes(s).lower()).strip()


def tokens(s: str) -> list[str]:
    """Palabras normalizadas; las largas se recortan a 6 letras (raíz aproximada: plural, género, derivados)."""
    out = []
    for t in re.findall(r"[a-z0-9]+", norm(s)):
        if t in STOP or len(t) < 2:
            continue
        out.append(t[:6] if len(t) > 6 and not t.isdigit() else t)
    return out
