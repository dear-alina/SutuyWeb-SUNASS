"""Datos para la IA: (1) validación de calidad de las tablas, (2) fichas de expedientes como fuente citable.

Las fichas permiten que el copiloto cite datos estructurados ("DS02 · RP-2026-0001") igual que un PDF.
Los plazos los calcula el código con el calendario nacional de feriados (regla deducida; por validar con la DRE).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

CORTE = pd.Timestamp("2026-09-30")
TRAMITES_RETO = ["revision_periodica", "cambio_programa_inversiones", "uso_excepcional_fondo"]
PASCUA = {2022: ("04-14", "04-15"), 2023: ("04-06", "04-07"), 2024: ("03-28", "03-29"),
          2025: ("04-17", "04-18"), 2026: ("04-02", "04-03"), 2027: ("03-25", "03-26")}


def feriados() -> list[str]:
    out = []
    for y in range(2021, 2028):
        f = ["01-01", "05-01", "06-29", "07-28", "07-29", "08-30", "10-08", "11-01", "12-08", "12-25"]
        if y >= 2022: f += ["08-06", "12-09"]
        if y >= 2023: f += ["07-23"]
        if y >= 2024: f += ["06-07"]
        out += [f"{y}-{m}" for m in f + list(PASCUA.get(y, ()))]
    return out


def dias_habiles(a, b) -> int:
    return int(np.busday_count(pd.Timestamp(a).date(), pd.Timestamp(b).date(), holidays=feriados()))


def cargar(carpeta) -> dict[str, pd.DataFrame]:
    """Lee los CSV que existan (ds01..ds09). Falta alguno -> simplemente se omite su regla."""
    c = Path(carpeta)
    fechas = {"ds02_procedimientos": ["fecha_inicio", "fecha_limite", "fecha_conclusion"],
              "ds02_hitos_procedimientos": ["fecha_inicio", "fecha_fin"]}
    out = {}
    for f in sorted(c.glob("ds*.csv")):
        clave = f.stem.split("_")[0] + ("h" if "hitos" in f.stem else "loc" if "localidades" in f.stem else "")
        out[clave] = pd.read_csv(
            f, encoding="utf-8-sig", dtype={"ubigeo": str}, parse_dates=fechas.get(f.stem, []))
    return out


def calidad(d: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Reglas de validación. Cada fila: regla, n, detalle, severidad. No modifica ni 'arregla' datos."""
    out = []
    def add(regla, n, detalle="", sev="info"): out.append({"regla": regla, "n": int(n), "detalle": detalle, "severidad": sev})
    if "ds02" in d: add("Expedientes (DS02)", len(d["ds02"]))
    if "ds02h" in d: add("Hitos (DS02)", len(d["ds02h"]))
    if "ds03" in d:
        p = d["ds03"].drop_duplicates("cod_proyecto"); sin = p[p.cui.isna()]
        add("Proyectos sin CUI (DS03)", len(sin), f"{int(d['ds03'].cui.isna().sum())} filas; por tipo: {sin.tipo_inversion.value_counts().to_dict()}", "alta")
        if "ds08" in d:
            x = p[p.cui.notna() & ~p.cui.isin(d["ds08"].cui)]
            add("CUI de DS03 ausentes en DS08 (MEF)", len(x), ", ".join(x.cod_proyecto.astype(str)), "media")
        if "ds04" in d:
            h = d["ds04"][~d["ds04"].cod_proyecto.isin(d["ds03"].cod_proyecto)]
            add("Filas DS04 con cod_proyecto inexistente en DS03", len(h), ", ".join(sorted(h.cod_proyecto.unique())[:8]), "alta")
    if "ds04" in d:
        dup = d["ds04"].duplicated(["cod_eps", "cod_proyecto", "anio_trimestre"], keep=False)
        add("Filas DS04 duplicadas (proyecto-trimestre)", dup.sum(), "", "media")
    if "ds02h" in d:
        malo = d["ds02h"][d["ds02h"].fecha_fin < d["ds02h"].fecha_inicio]
        add("Hitos con fecha_fin anterior a fecha_inicio", len(malo), ", ".join(malo.id_expediente.head(5)), "alta")
        if "ds02" in d:
            add("Hitos de expedientes inexistentes", (~d["ds02h"].id_expediente.isin(d["ds02"].id_expediente)).sum(), "", "alta")
    if "ds05" in d:
        s = d["ds05"]; ch = (s.saldo_inicial + s.deposito_efectuado + s.intereses - s.uso_ejecutado - s.uso_excepcional - s.saldo_final).abs()
        add("Meses DS05 donde el saldo no cuadra (> 1 sol)", (ch > 1).sum(), "", "media")
    return pd.DataFrame(out)


def fichas(d: dict[str, pd.DataFrame], corte: pd.Timestamp = CORTE) -> list[dict]:
    """Una ficha de texto por expediente en trámite (fuente citable para el copiloto)."""
    if "ds02" not in d:
        return []
    p = d["ds02"]; p = p[(p.estado == "en_tramite") & p.tipo_procedimiento.isin(TRAMITES_RETO)]
    eps = d.get("ds01"); h = d.get("ds02h")
    chunks = []
    for r in p.itertuples():
        nombre = eps[eps.cod_eps == r.cod_eps].nombre_eps.iloc[0] if eps is not None and (eps.cod_eps == r.cod_eps).any() else r.cod_eps
        rest = dias_habiles(corte, r.fecha_limite)
        nombre = str(nombre).rstrip(".")
        desde = f"{rest} días hábiles restantes desde el corte" if rest >= 0 else f"plazo superado por {-rest} días hábiles al corte"
        txt = (f"Expediente {r.id_expediente} de {nombre}. Trámite: {r.tipo_procedimiento}. Inicio: {r.fecha_inicio:%d/%m/%Y}. "
               f"Plazo máximo: {int(r.plazo_maximo_dh)} días hábiles; suspensión acumulada: {int(r.dias_suspension_dh)} días hábiles. "
               f"Fecha límite calculada: {r.fecha_limite:%d/%m/%Y} ({desde} {corte:%d/%m/%Y}; cálculo por validar con la DRE). "
               f"Etapa actual: {r.etapa_actual}. Responsable actual: {r.responsable_actual}.")
        if h is not None:
            hh = h[h.id_expediente == r.id_expediente].sort_values("nro_hito")
            txt += " Hitos: " + "; ".join(f"{x.nro_hito}. {x.descripcion} ({x.responsable})" for x in hh.itertuples()) + "."
        chunks.append({"id": f"DS02#{r.id_expediente}", "doc": "DS02 (datos de la muestra, sintéticos)", "pagina": 1,
                       "texto": txt, "expediente": r.id_expediente, "tramite": r.tipo_procedimiento, "origen": "dato"})
    return chunks
