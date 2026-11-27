"""Pregraba las respuestas del modelo para que la demo funcione SIN modelo (y rápido).

Con Ollama encendido:   python grabar_demo.py
Corre los requisitos de requisitos_demo.json y las preguntas de preguntas_demo.json sobre tus documentos
y guarda todo en indice/cache_respuestas.json. Después, aunque Ollama esté apagado, el servidor responde igual.
Declara siempre en la demo que son respuestas pregrabadas.
"""
import json, sys
from pathlib import Path

AQUI = Path(__file__).parent
sys.path.insert(0, str(AQUI))
import servidor, motor  # noqa: E402

req = json.loads((AQUI / "requisitos_demo.json").read_text(encoding="utf-8"))["requisitos"]
print("modelo:", servidor.LLM.nombre)
for modo, items in (("requisitos", req),):
    r = motor.evaluar(items, servidor.INDICE, servidor.LLM, modo)
    for x in r: print(f"  {x['id']}: {x['estado']} ({x['origen']}, verificada={x['verificada']})")
pf = AQUI / "preguntas_demo.json"
if pf.exists():
    for q in json.loads(pf.read_text(encoding="utf-8")):
        print(" ?", q, "->", motor.preguntar(q, servidor.INDICE, servidor.LLM)["respuesta"][:80])
print("Listo. Cache en indice/cache_respuestas.json (vacía si no había modelo).")
