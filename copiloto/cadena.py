"""Copiloto documental: clasifica los documentos de un expediente por rol y los conecta.
Conexión 'menciona' = el texto de un documento nombra a otro (con cita literal); 'anexo_de' = misma actuación; 'secuencia' = documento
anterior de la ruta (inferido por fecha, no por texto). Ausencia de un rol no es un error: depende de la etapa del trámite."""
from __future__ import annotations

import re

ROLES = ("solicitud", "oficio", "respuesta", "informe", "resolucion")


def rol(tipo: str, asunto) -> str:
    a = (asunto or "").lower()
    if tipo == "carta_ep":
        return "solicitud" if a.startswith("solicitud") else "respuesta" if ("subsan" in a or "respuesta" in a) else "carta"
    return {"oficio": "oficio", "informe": "informe", "resolucion_consejo_directivo": "resolucion", "anexo": "anexo"}.get(tipo, "otro")


def _ventana(t: str, a: int, b: int, n: int = 40) -> str:
    i, j = max(0, a - n), min(len(t), b + n)
    s = t[i:j]
    if i > 0 and " " in s:
        s = s.split(" ", 1)[1]
    if j < len(t) and " " in s:
        s = s.rsplit(" ", 1)[0]
    return s.strip()


def cadena(eid: str, indice, ds11) -> dict:
    docs = ds11[ds11.id_expediente == eid].sort_values(["fecha_documento", "id_documento"])
    texto = {}
    for c in indice.chunks:
        if c.get("expediente") == eid and c.get("id_documento"):
            texto.setdefault(c["id_documento"], []).append(c)
    numeros = {r.numero_documento: r.id_documento for r in docs.itertuples() if isinstance(r.numero_documento, str) and r.tipo_documento != "anexo"}
    out, previo = [], None
    for r in docs.itertuples():
        rl, con = rol(r.tipo_documento, r.asunto), []
        for num, cod in numeros.items():
            for c in texto.get(r.id_documento, []) if cod != r.id_documento else []:
                m = re.search(re.escape(num).replace(r"\ ", r"\s+").replace(r"\-", r"\s*-\s*"), c["texto"], re.I)
                if m:
                    con.append({"codigo_documento": cod, "tipo": "menciona", "cita": _ventana(c["texto"], m.start(), m.end()), "codigo_fragmento": c["id"]})
                    break
        if rl == "anexo":
            padre = [x for x in out if x["codigo_actuacion"] == r.id_actuacion and x["rol_documental"] in ("solicitud", "respuesta", "carta")]
            if padre:
                con.append({"codigo_documento": padre[-1]["codigo_documento"], "tipo": "anexo_de"})
        elif rl in ROLES:
            if previo and all(x["codigo_documento"] != previo for x in con):
                con.append({"codigo_documento": previo, "tipo": "secuencia"})
            previo = r.id_documento
        out.append({"codigo_documento": r.id_documento, "codigo_actuacion": r.id_actuacion, "rol_documental": rl, "tipo_documento": r.tipo_documento,
                    "numero_documento": r.numero_documento if isinstance(r.numero_documento, str) else None, "fecha_documento": r.fecha_documento,
                    "asunto": r.asunto, "nivel_acceso": r.nivel_acceso, "vinculo": r.vinculo, "conexiones": con})
    return {"documentos": out, "roles_sin_documento": [x for x in ROLES if x not in {d["rol_documental"] for d in out}],
            "aviso": "Un rol sin documento no es un error: depende de la etapa del trámite. 'secuencia' es inferido por fecha; 'menciona' tiene cita literal."}
