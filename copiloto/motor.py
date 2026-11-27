"""Motor del copiloto (RAG): recupera fragmentos, pide al modelo una evaluación citada y VERIFICA cada cita.

Principios (no negociables):
  1. El modelo no decide: propone. Todo resultado lleva requiere_revision=True.
  2. Sin cita verificable no hay afirmación: se degrada a 'no_hallada'.
  3. Las cifras y los plazos los calcula el código, no el modelo.
  4. 'no_hallada' no significa 'incumple': significa que no se encontró en los documentos cargados.
"""
from __future__ import annotations

import json
import re

from buscador import Indice
from texto import tokens
from verificador import verificar_item

# El sistema NUNCA escribe "cumple" ni "procede": solo dice qué evidencia encontró. La determinación es de la persona.
ESTADOS = {
    "requisitos": ("evidencia_encontrada", "evidencia_parcial", "no_hallada"),
    "informacion": ("atendido", "parcial", "no_atendido"),
}
NO_DETERMINABLE = "no_determinable"  # la norma/TUPA cargados no permiten decidir qué se exige
SISTEMA = (
    "Eres un asistente de apoyo para especialistas de la Sunass. Evalúas UN punto a la vez usando SOLO los "
    "fragmentos entregados. Reglas: (1) no uses conocimiento externo; (2) si los fragmentos no lo muestran, "
    "responde estado '{no}' (o 'no_determinable' si lo pedido no se puede establecer con los fragmentos); (3) la cita debe copiarse LITERAL de un fragmento y debe indicar su id; "
    "(4) no inventes cifras, fechas, plazos ni nombres; (5) usa '{a}' SOLO si la cita por sí sola demuestra el punto; si solo hay texto relacionado usa '{b}'; "
    "si los fragmentos no muestran el punto usa '{c}', aunque haya texto parecido; (6) responde SOLO un JSON: "
    '{{"estado": "{a}|{b}|{c}", "fuente": "<id del fragmento>", "cita": "<texto literal>", "motivo": "<una frase>"}}.'
)
NEGACION = re.compile(r"\bno (se (encuentra|encuentran|proporciona|menciona|especifica|indica|incluye|adjunta|evidencia|muestra)|hay|consta|aparece)", re.I)
UMBRAL_RECUPERACION = 1.0  # puntaje BM25 mínimo para marcar evidencia parcial cuando no hay modelo


def _json(texto: str | None) -> dict | None:
    if not texto:
        return None
    m = re.search(r"\{.*\}", texto, re.S)
    try:
        return json.loads(m.group(0)) if m else None
    except json.JSONDecodeError:
        return None


def _prompt(item: dict, hits: list, modo: str) -> str:
    frag = "\n".join(f"[{c['id']}] ({c['doc']}, p. {c['pagina']}) {c['texto']}" for _, c in hits)
    tarea = "Requisito a verificar" if modo == "requisitos" else "Información que se solicitó a la empresa"
    return f"{tarea}: {item['texto']}\n\nFragmentos:\n{frag}\n\nResponde solo con el JSON."


def _bajar(b: dict, nuevo: str, alerta: str) -> None:
    b.setdefault("estado_original", b["estado"]); b["estado"] = nuevo
    b["alerta"] = (b.get("alerta", "") + " " + alerta).strip()


def _coherencia(b: dict, it: dict, hits: list, estados: tuple) -> None:
    """Guardas por código sobre lo que dice el modelo: (1) si su propio motivo niega lo pedido, baja un nivel;
    (2) 'encontrada' exige que la cita contenga algún término clave del punto. Nunca sube un estado."""
    if b["estado"] in (estados[0], estados[1]) and NEGACION.search(b["motivo"]):
        _bajar(b, estados[1] if b["estado"] == estados[0] else estados[2], "El motivo del modelo indica que no se muestra lo pedido; estado ajustado.")
    kw = set(tokens(" ".join(it.get("palabras_clave", []))))
    if b["estado"] == estados[0] and kw and not (kw & set(tokens(b["cita"]))):
        otro = next((c["id"] for _, c in hits if kw & set(tokens(c["texto"]))), None)
        _bajar(b, estados[1], "La cita no contiene los términos clave del punto." + (f" Revisar el fragmento {otro}." if otro else ""))


def evaluar(items: list[dict], indice: Indice, llm, modo: str = "requisitos", filtro: dict | None = None, k: int = 4) -> list[dict]:
    """items: [{'id','texto','palabras_clave'?}] -> lista de resultados con fuente, cita verificada y estado."""
    estados = ESTADOS[modo]
    sistema = SISTEMA.format(a=estados[0], b=estados[1], c=estados[2], no=estados[2])
    out = []
    for it in items:
        consulta = it["texto"] + " " + " ".join(it.get("palabras_clave", []))
        hits = indice.buscar(consulta, k, filtro)
        base = {"id": it["id"], "punto": it["texto"], "estado": estados[2], "fuente": None, "doc": None, "pagina": None,
                "cita": "", "motivo": "", "origen": "recuperacion", "verificada": False, "requiere_revision": True}
        if not hits:
            base["motivo"] = "No se encontraron fragmentos relacionados en los documentos cargados."
            out.append(base); continue
        r = _json(llm.responder(sistema, _prompt(it, hits, modo)))
        if r and r.get("estado") in estados + (NO_DETERMINABLE,):
            base.update(estado=r["estado"], fuente=r.get("fuente"), cita=r.get("cita", ""), motivo=r.get("motivo", ""), origen="modelo")
            if base["estado"] not in (estados[2], NO_DETERMINABLE):
                verificar_item(base, indice.por_id, estados[2])
            else:
                base["verificada"] = True  # 'no hay evidencia' no necesita cita
            _coherencia(base, it, hits, estados)
            ch = indice.por_id.get(base["fuente"]) if base["fuente"] else None
        else:  # sin modelo o respuesta inválida: solo recuperación, siempre a revisión humana
            s, ch = hits[0]
            clave = set(tokens(" ".join(it.get("palabras_clave", [])))) or set(tokens(it["texto"]))
            hay = bool(clave & set(tokens(ch["texto"])))  # al menos una palabra clave del requisito está en el fragmento
            base.update(estado=estados[1] if (s >= UMBRAL_RECUPERACION and hay) else estados[2], fuente=ch["id"],
                        cita=ch["texto"][:220], motivo="Fragmento más relacionado (sin modelo): confirmar a mano.")
            if base["estado"] == estados[2]:  # sin evidencia: no se muestra un fragmento irrelevante como si fuera cita
                base.update(fuente=None, cita="", motivo="No se halló evidencia en los documentos cargados.")
                ch = None
        if ch:
            base["doc"], base["pagina"] = ch["doc"], ch["pagina"]
        out.append(base)
    return out


def borrador_subsanacion(resultados: list[dict], plazo_dh: int | None = None, expediente: str = "") -> str:
    """Borrador de observaciones. El plazo lo define la persona; el sistema no lo inventa."""
    pend = [r for r in resultados if r["estado"] not in ("evidencia_encontrada", "atendido")]
    plazo = f"{plazo_dh} días hábiles" if plazo_dh else "[plazo por definir según la norma]"
    cab = f"BORRADOR (requiere revisión y firma del especialista) {('· Expediente ' + expediente) if expediente else ''}".strip()
    if not pend:
        return cab + "\nNo se identificaron observaciones con los documentos cargados."
    lineas = [cab, "", f"Se solicita a la empresa subsanar lo siguiente en un plazo de {plazo}:"]
    for i, r in enumerate(pend, 1):
        tipo = "no se evidencia en los documentos presentados" if r["estado"] in ("no_hallada", "no_atendido") else "requiere precisión o sustento adicional"
        lineas.append(f"{i}. {r['punto']} — {tipo}.")
    return "\n".join(lineas)


# ---------- Cifras: las compara el código, no el modelo ----------
_NUM = re.compile(r"\d{1,3}(?:[ .,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?")


def _valor(s: str) -> float:
    s = s.strip()
    if re.fullmatch(r"\d{1,3}(?:[ .,]\d{3})+", s):  # separador de miles: 19 935 / 19,935 / 19.935
        return float(re.sub(r"[ .,]", "", s))
    s = s.replace(" ", "")
    if "," in s and "." in s:
        s = s.replace(",", "") if s.rfind(".") > s.rfind(",") else s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")
    return float(s)


def cifras(texto: str) -> list[tuple[float, str]]:
    return [(_valor(m.group()), re.sub(r"\s+", " ", texto[max(0, m.start() - 35):m.end() + 20]).strip()) for m in _NUM.finditer(texto)]


def contrastar_cifras(ref: str, resp: str, ignorar_menores_a: float = 32) -> dict:
    """Cifras que aparecen en un texto y no en el otro (p. ej. solicitud vs respuesta de la empresa).
    Ignora números chicos (días, numerales) salvo que se cambie el umbral."""
    a = {v: c for v, c in cifras(ref) if v >= ignorar_menores_a}
    b = {v: c for v, c in cifras(resp) if v >= ignorar_menores_a}
    return {"solo_en_referencia": [{"valor": v, "contexto": a[v]} for v in a if v not in b],
            "solo_en_respuesta": [{"valor": v, "contexto": b[v]} for v in b if v not in a],
            "coinciden": sorted(set(a) & set(b)), "aviso": "Diferencias a revisar por una persona; pueden ser cambios legítimos."}


# ---------- Pregunta libre con citas ----------
SIS_PREG = ("Responde SOLO con los fragmentos dados. Si no alcanzan, di que no hay evidencia. Cita literal y id. "
            'Responde SOLO un JSON: {"respuesta": "<texto>", "fuente": "<id>", "cita": "<texto literal>"}.')


def preguntar(pregunta: str, indice: Indice, llm, filtro: dict | None = None, k: int = 4) -> dict:
    hits = indice.buscar(pregunta, k, filtro)
    pasajes = [{"id": c["id"], "doc": c["doc"], "pagina": c["pagina"], "texto": c["texto"][:300], "puntaje": round(s, 2), "id_documento": c.get("id_documento")} for s, c in hits]
    if not hits:
        return {"respuesta": "No hay evidencia en los documentos cargados.", "pasajes": [], "verificada": False}
    frag = "\n".join(f"[{c['id']}] ({c['doc']}, p. {c['pagina']}) {c['texto']}" for _, c in hits)
    r = _json(llm.responder(SIS_PREG, f"Pregunta: {pregunta}\n\nFragmentos:\n{frag}\n\nResponde solo con el JSON."))
    if not r or "respuesta" not in r:
        return {"respuesta": "Sin modelo disponible: estos son los fragmentos más relacionados.", "pasajes": pasajes, "verificada": False, "origen": "recuperacion"}
    it = verificar_item({"estado": "evidencia_encontrada", "fuente": r.get("fuente"), "cita": r.get("cita", "")}, indice.por_id)
    return {"respuesta": r["respuesta"] if it["verificada"] else "No se pudo verificar la cita del modelo; revise los fragmentos.",
            "fuente": r.get("fuente"), "cita": it["cita"], "verificada": it["verificada"], "pasajes": pasajes, "origen": "modelo"}
