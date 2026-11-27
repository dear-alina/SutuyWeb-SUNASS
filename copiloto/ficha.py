"""Ficha de verificación de un expediente (vista SRT). Conecta DS02/DS10/DS11 + normativa + requisitos.
No concluye ni decide: presenta evidencia con fuente; la determinación es del especialista."""
from __future__ import annotations

import json
from pathlib import Path

import datos_ia, extraccion, motor, reglas_ufi

REQ = {"uso_excepcional_fondo": Path(__file__).parent / "requisitos_ufi.json"}
INTERNO = ("Metas internas del flujograma del Anexo 2 (propuesta de gestión, NO plazo legal): 24 h en SRT/Equipo SRT/OAJ y "
           "5 dh en DRE/GG/CD. Confirmar los valores en el PDF.")


def _f(df):
    return df.astype(object).where(df.notna(), None).to_dict("records")


def ficha(eid: str, indice, llm, d: dict, corte) -> dict:
    p = d["ds02"][d["ds02"].id_expediente == eid]
    if p.empty:
        return {"error": f"expediente {eid} no encontrado"}
    r = p.iloc[0]
    tramite = r.tipo_procedimiento
    cab = {k: r[k] for k in ("id_expediente", "cod_eps", "tipo_procedimiento", "base_normativa", "estado", "etapa_actual", "responsable_actual", "fecha_inicio")}
    # --- plazos rotulados por naturaleza (los calcula el código; el modelo no interviene)
    plazos = []
    if r.plazo_maximo_dh == r.plazo_maximo_dh:
        rest = datos_ia.dias_habiles(corte, r.fecha_limite) if r.estado == "en_tramite" else None
        plazos.append({"naturaleza": "normativo", "descripcion": f"Plazo máximo {int(r.plazo_maximo_dh)} DH (suspensión acumulada {int(r.dias_suspension_dh)} DH)",
                       "fecha_limite": r.fecha_limite, "dh_restantes_al_corte": rest, "fuente": "DS02", "aviso": "Cómputo del dataset (inicio + plazo + suspensión, días hábiles con feriados nacionales); no es un plazo legal."})
    paginas = {}
    for c in indice.chunks:
        if c.get("expediente") == eid and c.get("origen") != "dato":
            paginas.setdefault((c["doc"], c["pagina"]), []).append(c["texto"])
    for (doc, pag), t in paginas.items():
        e = extraccion.extraer(" ".join(t))
        if e["tipo"] == "oficio" and e["campos"].get("plazo_oficio_dh"):
            plazos.append({"naturaleza": "de_oficio", "descripcion": f"Oficio {e['campos'].get('numero')}: {e['campos']['plazo_oficio_dh']} DH para subsanar",
                           "fuente": f"{doc}, p. {pag}"})
    plazos.append({"naturaleza": "interno", "descripcion": INTERNO, "fuente": "Expediente General, Anexo 2"})
    # --- pendientes detectados por reglas (no por el modelo)
    pend = []
    h = d.get("ds02h")
    if h is not None:
        hh = h[h.id_expediente == eid]
        pend += [{"tipo": "fechas_incoherentes", "detalle": f"Hito {x.nro_hito}: fecha_fin anterior a fecha_inicio"} for x in hh.itertuples() if x.fecha_fin < x.fecha_inicio]
    docs = d["ds11"][d["ds11"].id_expediente == eid] if "ds11" in d else None
    if "ds10" in d and docs is not None:
        a = d["ds10"][(d["ds10"].id_expediente == eid) & (d["ds10"].estado_actuacion == "realizada")]
        pend += [{"tipo": "actuacion_sin_documento", "detalle": f"{x.id_actuacion}: {x.descripcion} (sin documento en DS11; puede ser un paso interno)"} for x in a.itertuples() if x.id_actuacion not in set(docs.id_actuacion)]
    # --- normativa aplicable (solo lo que haya en normativa/) y requisitos con evidencia
    norma = [{"fuente": c["id"], "doc": c["doc"], "pagina": c["pagina"], "texto": c["texto"][:400]}
             for _, c in indice.buscar(f"{tramite} {r.base_normativa} plazo requisitos", 3, {"origen": "norma"})]
    req = []
    if tramite in REQ:
        req = motor.evaluar(json.loads(REQ[tramite].read_text(encoding="utf-8"))["requisitos"], indice, llm, "requisitos", {"expediente": eid})
    reglas = []
    if tramite == "uso_excepcional_fondo" and "ds05" in d and r.monto_solicitado == r.monto_solicitado:
        reglas.append(reglas_ufi.monto_vs_saldo(float(r.monto_solicitado), r.cod_eps, r.fecha_inicio, d["ds05"]))
    return {"cabecera": cab, "normativa": norma or "No hay articulado cargado en normativa/; solo la referencia: " + str(r.base_normativa),
            "plazos": plazos, "pendientes": pend, "requisitos": req, "reglas_de_datos": reglas,
            "documentos": _f(docs[["id_documento", "id_actuacion", "tipo_documento", "numero_documento", "fecha_documento", "asunto", "nivel_acceso", "vinculo"]]) if docs is not None else [],
            "aviso": "Evidencia para el especialista: el sistema no determina cumplimiento ni decide. Datos de la muestra sintéticos."}
