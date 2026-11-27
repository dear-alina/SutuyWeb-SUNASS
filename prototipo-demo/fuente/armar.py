"""Arma un solo HTML: CSS reales del frontend + estilos del prototipo + JS + logos en base64."""
import base64, pathlib, sys

AQUI = pathlib.Path(__file__).parent
FRONT = pathlib.Path(sys.argv[1])
SALIDA = pathlib.Path(sys.argv[2])

css = "\n".join(f"/* ==== frontend/src/estilos/{n} ==== */\n" + (FRONT / "src/estilos" / n).read_text(encoding="utf-8")
                for n in ["tokens.css", "globales.css", "ingreso.css", "app.css", "eps.css", "sunass.css"])
css += "\n" + (AQUI / "extra.css").read_text(encoding="utf-8")
js = "\n".join((AQUI / n).read_text(encoding="utf-8") for n in ["motor.js", "pantallas.js", "app.js"])
b64 = lambda p, t: f"data:{t};base64," + base64.b64encode((FRONT / "public" / p).read_bytes()).decode()
# Cada logo una sola vez, como constante
logos = ('const LOGO_CUADRADO = "' + b64("logo-sutuyweb.jpg", "image/jpeg") + '";\n'
         + 'const LOGO_HORIZONTAL = "' + b64("logo-sutuyweb-horizontal.png", "image/png") + '";\n')
js = js.replace("__LOGO_CUADRADO__", "${LOGO_CUADRADO}").replace("__LOGO_HORIZONTAL__", "${LOGO_HORIZONTAL}")
js = js.replace('"use strict";', '"use strict";\n' + logos, 1)

html = f"""<!doctype html>
<html lang="es-PE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SutuyWeb · prototipo navegable</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<script>
{js}
</script>
</body>
</html>
"""
SALIDA.write_text(html, encoding="utf-8")
print(SALIDA, round(SALIDA.stat().st_size / 1024), "KB")
