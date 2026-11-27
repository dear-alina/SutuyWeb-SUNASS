"""Incorpora la actualización de datos (p. ej. corte 20/11/2026) a los datasets base.

Uso:  python incorporar_actualizacion.py <carpeta_datos_sprint> <carpeta_actualizacion> <carpeta_salida>
Reglas (según el LEAME de la actualización): se reemplaza por clave si ya existía y se agregan las nuevas.
No modifica los archivos originales: escribe copias en la carpeta de salida.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import pandas as pd

# base -> (archivo de actualización, clave de reemplazo; None = solo agregar)
REGLAS = {
    "ds02_procedimientos.csv": ("ds02_procedimientos_actualizados.csv", ["id_expediente"]),
    "ds02_hitos_procedimientos.csv": ("ds02_hitos_nuevos_o_actualizados.csv", ["id_expediente", "nro_hito"]),
    "ds04_ejecucion_inversiones.csv": ("ds04_ejecucion_2026T3.csv", None),
    "ds05_fondo_inversiones_reservas.csv": ("ds05_fondos_hasta_2026-10.csv", ["cod_eps", "anio_mes", "tipo_fondo"]),
    "ds10_bitacora_actuaciones.csv": ("ds10_actuaciones_nuevas_o_actualizadas.csv", ["id_actuacion"]),
    "ds11_indice_documentos.csv": ("ds11_documentos_nuevos.csv", ["id_documento"]),
}


def _leer(p: Path) -> pd.DataFrame:
    return pd.read_csv(p, encoding="utf-8-sig", dtype=str, keep_default_na=False)


def combinar(base: pd.DataFrame, upd: pd.DataFrame, clave: list[str] | None) -> tuple[pd.DataFrame, int, int]:
    if list(base.columns) != list(upd.columns):
        raise ValueError(f"Las columnas no coinciden: {set(base.columns) ^ set(upd.columns)}")
    if clave is None:
        return pd.concat([base, upd], ignore_index=True), 0, len(upd)
    kb = base[clave].apply(tuple, axis=1); ku = set(upd[clave].apply(tuple, axis=1))
    reemplazadas = int(kb.isin(ku).sum())
    out = pd.concat([base[~kb.isin(ku)], upd], ignore_index=True)
    return out, reemplazadas, len(ku) - reemplazadas


def incorporar(base_dir, upd_dir, salida) -> dict:
    base_dir, upd_dir, salida = Path(base_dir), Path(upd_dir), Path(salida)
    salida.mkdir(parents=True, exist_ok=True)
    for f in base_dir.glob("*.csv"):
        shutil.copy(f, salida / f.name)
    resumen = {}
    for archivo, (nom_upd, clave) in REGLAS.items():
        if not (base_dir / archivo).exists() or not (upd_dir / nom_upd).exists():
            resumen[archivo] = "omitido (falta un archivo)"; continue
        out, rep, nue = combinar(_leer(base_dir / archivo), _leer(upd_dir / nom_upd), clave)
        out.to_csv(salida / archivo, index=False, encoding="utf-8")
        resumen[archivo] = {"filas": len(out), "reemplazadas": rep, "nuevas": nue}
    return resumen


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    for k, v in incorporar(*sys.argv[1:]).items():
        print(k, "->", v)
