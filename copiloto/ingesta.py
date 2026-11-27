"""Ingesta: PDF/DOCX/TXT -> fragmentos (chunks) con metadatos y página.

Cada fragmento lleva documento, página y los metadatos que le pases (expediente, trámite...).
Esos metadatos permiten filtrar la búsqueda y citar la fuente exacta.
"""
from __future__ import annotations

import json
import re
import subprocess
import zipfile
from pathlib import Path

EXT_TEXTO = {".txt", ".md"}


def leer_paginas(ruta: Path) -> list[str]:
    """Devuelve una lista de páginas (texto). PDF vía pdftotext; DOCX sin dependencias; resto como texto."""
    ruta = Path(ruta)
    ext = ruta.suffix.lower()
    if ext == ".pdf":
        try:
            r = subprocess.run(["pdftotext", "-layout", str(ruta), "-"], capture_output=True, check=True)
            pag = r.stdout.decode("utf-8", "replace").split("\f")
            while pag and not pag[-1].strip():  # pdftotext deja un salto de página final vacío
                pag.pop()
            return pag  # se conservan páginas vacías para no correr la numeración
        except (FileNotFoundError, subprocess.CalledProcessError):
            try:
                from pypdf import PdfReader  # alternativa si no hay pdftotext
                return [(p.extract_text() or "") for p in PdfReader(str(ruta)).pages]
            except Exception as e:  # PDF escaneado o librería ausente
                raise RuntimeError(f"No se pudo leer {ruta.name}: instala poppler (pdftotext) o pypdf") from e
    if ext == ".docx":
        xml = zipfile.ZipFile(ruta).read("word/document.xml").decode("utf-8", "replace")
        parrafos = re.findall(r"<w:p[ >].*?</w:p>", xml, re.S)
        txt = [re.sub(r"<[^>]+>", "", re.sub(r"</w:t>\s*<w:t[^>]*>", "", p)) for p in parrafos]
        return ["\n\n".join(t for t in txt if t.strip())]
    if ext in EXT_TEXTO:  # un .txt con saltos de página (\f) conserva la numeración de páginas
        t = ruta.read_text(encoding="utf-8-sig", errors="replace")
        pag = t.split("\f")
        while len(pag) > 1 and not pag[-1].strip():
            pag.pop()
        return pag
    raise ValueError(f"Formato no soportado: {ext}")


_ID = re.compile(r"^\s*(DOC-\d{6})\s*·\s*(ACT-\d{6})\s*$", re.M)


def limpiar_repetidos(paginas: list[str], minimo: float = 0.6) -> list[str]:
    """Quita líneas que se repiten en >= 60 % de las páginas (encabezados y pies), que contaminan la búsqueda."""
    if len(paginas) < 2:
        return paginas
    def clave(x: str) -> str:  # ignora espacios y un "·" final (el encabezado cambia levemente entre páginas)
        return re.sub(r"[\s·]+$", "", re.sub(r"\s+", " ", x).strip())
    cuenta: dict[str, int] = {}
    for p in paginas:
        for l in {clave(x) for x in p.splitlines() if x.strip()}:
            cuenta[l] = cuenta.get(l, 0) + 1
    rep = {l for l, c in cuenta.items() if c >= minimo * len(paginas)}
    return ["\n".join(x for x in p.splitlines() if clave(x) not in rep) for p in paginas]


def trocear(texto: str, max_pal: int = 140, solape: int = 25) -> list[str]:
    """Parte por párrafos (líneas en blanco) y agrupa hasta ~max_pal palabras; párrafos largos se ventanean."""
    parrafos = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", texto)]
    parrafos = [p for p in parrafos if len(p) > 3]
    piezas, actual = [], []
    n = 0
    for p in parrafos:
        palabras = p.split()
        if len(palabras) > max_pal:  # párrafo largo: ventanas con solape
            if actual:
                piezas.append(" ".join(actual)); actual, n = [], 0
            paso = max_pal - solape
            for i in range(0, len(palabras), paso):
                piezas.append(" ".join(palabras[i:i + max_pal]))
                if i + max_pal >= len(palabras):
                    break
            continue
        if n + len(palabras) > max_pal and actual:
            piezas.append(" ".join(actual)); actual, n = [], 0
        actual.append(p); n += len(palabras)
    if actual:
        piezas.append(" ".join(actual))
    return piezas


def ingerir(ruta, **meta) -> list[dict]:
    ruta = Path(ruta)
    if re.fullmatch(r"[A-Z]{2,4}-\d{4}-\d{4}", ruta.stem):  # el nombre del archivo es el id del expediente
        meta.setdefault("expediente", ruta.stem)
    chunks = []
    for pag, texto in enumerate(limpiar_repetidos(leer_paginas(ruta)), start=1):
        ids = {}
        m = _ID.search(texto)
        if m:  # pie con id de documento y actuación (vincula con DS11 y DS10)
            ids = {"id_documento": m.group(1), "id_actuacion": m.group(2)}
            texto = _ID.sub("", texto)
        for i, pieza in enumerate(trocear(texto), start=1):
            chunks.append({"id": f"{ruta.stem}#p{pag}-{i}", "doc": ruta.name, "pagina": pag, "texto": pieza, **ids, **meta})
    return chunks


def ingerir_carpeta(carpeta, meta_por_archivo: dict | None = None, **meta_comun) -> list[dict]:
    """Ingiere todos los archivos soportados. meta_por_archivo: {'nombre.pdf': {'expediente': 'CPI-2026-0003'}}"""
    meta_por_archivo = meta_por_archivo or {}
    chunks = []
    for f in sorted(Path(carpeta).iterdir()):
        if f.suffix.lower() in EXT_TEXTO | {".pdf", ".docx"}:
            chunks += ingerir(f, **{**meta_comun, **meta_por_archivo.get(f.name, {})})
    return chunks


def guardar(chunks: list[dict], ruta) -> None:
    Path(ruta).write_text(json.dumps(chunks, ensure_ascii=False, indent=1), encoding="utf-8")


def cargar(ruta) -> list[dict]:
    return json.loads(Path(ruta).read_text(encoding="utf-8"))
