"""Reglas de datos para Uso excepcional del Fondo de Inversiones (las calcula el CÓDIGO, no la IA).

Son reglas CANDIDATAS: confirmar con el art. 89 del RGT o con la DRE antes de presentarlas como exigencia legal.
Los datos de la muestra son sintéticos.
"""
from __future__ import annotations

import pandas as pd


def saldo_previo(ds05: pd.DataFrame, cod_eps: str, fecha_inicio, tipo_fondo: str = "fondo_inversiones") -> dict | None:
    """Saldo final del último mes cerrado ANTES de la fecha de la solicitud."""
    ref = pd.Timestamp(fecha_inicio).strftime("%Y-%m")
    x = ds05[(ds05.cod_eps == cod_eps) & (ds05.tipo_fondo == tipo_fondo) & (ds05.anio_mes < ref)].sort_values("anio_mes")
    if x.empty:
        return None
    r = x.iloc[-1]
    return {"mes": r.anio_mes, "saldo": float(r.saldo_final), "fuente": "DS05 (muestra sintética)"}


def monto_vs_saldo(monto: float, cod_eps: str, fecha_inicio, ds05: pd.DataFrame) -> dict:
    s = saldo_previo(ds05, cod_eps, fecha_inicio)
    if s is None:
        return {"resultado": "no_determinable", "motivo": "No hay saldo previo del fondo en DS05."}
    return {**s, "monto_solicitado": monto, "excede_saldo": monto > s["saldo"],
            "nota": "Regla candidata: confirmar con el art. 89 o con la DRE."}


def contrastar_con_fondo(id_expediente: str, monto_solicitado: float | None, monto_autorizado: float | None, ds05: pd.DataFrame) -> dict:
    """¿El uso excepcional registrado en el fondo coincide con lo solicitado/autorizado en los documentos?"""
    f = ds05[ds05.id_expediente_uso_excepcional == id_expediente]
    if f.empty:
        return {"registrado_en_fondo": False}
    uso = float(f.iloc[0].uso_excepcional)
    cerca = lambda a, b: None if a is None else abs(a - b) < 0.01
    return {"registrado_en_fondo": True, "mes": f.iloc[0].anio_mes, "uso_excepcional": uso,
            "coincide_con_solicitado": cerca(monto_solicitado, uso), "coincide_con_autorizado": cerca(monto_autorizado, uso)}
