"""Buscador BM25 en Python puro (sin instalar nada), con filtros por metadatos."""
from __future__ import annotations

import math
from collections import Counter

from texto import tokens


class Indice:
    def __init__(self, chunks: list[dict], k1: float = 1.5, b: float = 0.75):
        self.chunks = chunks
        self.k1, self.b = k1, b
        self.tf = [Counter(tokens(c["texto"])) for c in chunks]
        self.len = [sum(t.values()) for t in self.tf]
        self.avg = (sum(self.len) / len(self.len)) if self.len else 0
        df = Counter()
        for t in self.tf:
            df.update(t.keys())
        n = len(chunks)
        self.idf = {w: math.log(1 + (n - d + 0.5) / (d + 0.5)) for w, d in df.items()}
        self.por_id = {c["id"]: c for c in chunks}

    @staticmethod
    def _pasa(c: dict, filtro: dict | None) -> bool:
        for k, v in (filtro or {}).items():
            val = c.get(k)
            if isinstance(v, (list, tuple, set)):
                if val not in v:
                    return False
            elif val != v:
                return False
        return True

    def buscar(self, consulta: str, k: int = 5, filtro: dict | None = None) -> list[tuple[float, dict]]:
        q = tokens(consulta)
        res = []
        for i, c in enumerate(self.chunks):
            if not self._pasa(c, filtro) or not self.len[i]:
                continue
            s = 0.0
            for w in q:
                f = self.tf[i].get(w, 0)
                if f:
                    s += self.idf.get(w, 0) * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.len[i] / self.avg))
            if s > 0:
                res.append((s, c))
        res.sort(key=lambda x: -x[0])
        return res[:k]
