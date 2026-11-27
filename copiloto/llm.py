"""Clientes de modelo. Todos exponen  responder(sistema, usuario) -> str | None.

- Ollama: modelo local (por ejemplo llama3.1:8b). Nada sale del computador.
- ConCache: guarda cada respuesta en un JSON; sirve para la demo SIN modelo (respuestas pregrabadas, declaradas como tales).
- SinLLM: sin modelo; el motor cae a "solo recuperación" y marca como evidencia parcial lo que encuentra para revisión humana.
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.request
from pathlib import Path


class SinLLM:
    nombre = "sin_llm"

    def responder(self, sistema: str, usuario: str):
        return None


class Ollama:
    def __init__(self, modelo: str | None = None, url: str | None = None, timeout: int = 180):
        self.modelo = modelo or os.environ.get("COPILOTO_MODELO", "llama3.1:8b")
        self.url = (url or os.environ.get("OLLAMA_URL", "http://localhost:11434")).rstrip("/")
        self.timeout = timeout
        self.nombre = f"ollama:{self.modelo}"

    def disponible(self) -> bool:
        try:
            with urllib.request.urlopen(self.url + "/api/tags", timeout=2) as r:
                nombres = [m["name"] for m in json.load(r).get("models", [])]
            return any(n.split(":")[0] == self.modelo.split(":")[0] for n in nombres)
        except Exception:
            return False

    def responder(self, sistema: str, usuario: str):
        cuerpo = {"model": self.modelo, "stream": False, "format": "json",
                  "options": {"temperature": 0, "num_ctx": 8192},
                  "messages": [{"role": "system", "content": sistema}, {"role": "user", "content": usuario}]}
        req = urllib.request.Request(self.url + "/api/chat", json.dumps(cuerpo).encode(),
                                     {"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as r:
                return json.load(r)["message"]["content"]
        except Exception:
            return None


class ConCache:
    """Envuelve otro cliente: lee de caché y, si hay modelo real, graba lo nuevo (modo 'grabar')."""

    def __init__(self, base, ruta: str | Path, grabar: bool = True):
        self.base, self.ruta, self.grabar = base, Path(ruta), grabar
        self.datos = json.loads(self.ruta.read_text(encoding="utf-8")) if self.ruta.exists() else {}
        self.nombre = f"cache+{base.nombre}"

    @staticmethod
    def clave(sistema: str, usuario: str) -> str:
        return hashlib.sha1((sistema + "\x00" + usuario).encode()).hexdigest()

    def responder(self, sistema: str, usuario: str):
        k = self.clave(sistema, usuario)
        if k in self.datos:
            return self.datos[k]
        r = self.base.responder(sistema, usuario)
        if r is not None and self.grabar:
            self.datos[k] = r
            self.ruta.write_text(json.dumps(self.datos, ensure_ascii=False, indent=1), encoding="utf-8")
        return r


def elegir(cache: str | Path | None = None):
    """COPILOTO_LLM = ollama | sin | auto (por defecto: usa Ollama si responde; si no, solo caché/recuperación)."""
    modo = os.environ.get("COPILOTO_LLM", "auto")
    base = SinLLM()
    if modo != "sin":
        o = Ollama()
        if modo == "ollama" or o.disponible():
            base = o
    return ConCache(base, cache) if cache else base
