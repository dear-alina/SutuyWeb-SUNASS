# Copiloto de IA para SutuWeb · v2 (RAG con verificación de citas) · Uso excepcional del Fondo (art. 89)

Módulo de **Thayli**: integración de IA y datos. Funciona **sin internet y sin modelo** (solo recuperación); con Ollama mejora.
Dependencias en `requirements.txt` (FastAPI, Pydantic v2, pandas, numpy). Los PDF del sprint ya vienen extraídos a texto (`documentos_sprint/`), así que **no necesitas poppler**.

## Qué cambió en la v2
- **Nunca dice "cumple"**: los estados son `evidencia_encontrada` · `evidencia_parcial` · `no_hallada` · `no_determinable`. Decide la persona.
- **Ingesta limpia**: quita el encabezado repetido de los PDF y guarda `id_documento` / `id_actuacion` (vínculo con DS11 y DS10).
- **`extraccion.py`**: saca campos con reglas (carta: monto, motivo; oficio: plazo y observaciones; informe: sentido; resolución: monto autorizado).
- **`reglas_ufi.py`**: monto vs. saldo del fondo (DS05) y fondo vs. resolución. Son reglas **candidatas**: confirmar con el art. 89 / DRE.
- **`incorporar_actualizacion.py`**: aplica la actualización al 20/11/2026 (reemplaza por clave y agrega).
- **Registro de decisiones** (`/registro`): quién confirmó qué y a qué hora (sirve para medir qué % de las sugerencias acepta el especialista).
- `requisitos_ufi.json`: **6 requisitos candidatos** sacados de los oficios de los expedientes ficticios. **No es el TUPA oficial.**

## Pruebas y actualización al 20/11
```
python pruebas/pruebas.py
```
Con la actualización al 20/11 (para el pitch):
```
python incorporar_actualizacion.py datos_demo datos_actualizacion_2026-11-20 datos_20nov
$env:COPILOTO_DATOS="datos_20nov"; $env:COPILOTO_CORTE="2026-11-20"   # y el mismo COPILOTO_TOKEN_SERVICIO
python servidor.py
```
Modelo local: `ollama pull llama3.1:8b` (16 GB) o `llama3.2:3b` (8 GB, con `$env:COPILOTO_MODELO="llama3.2:3b"`). Luego `python grabar_demo.py`
pregraba respuestas para la demo (indícalo en el pitch). Variables: `COPILOTO_LLM=sin|ollama|auto`, `COPILOTO_CORPUS`, `COPILOTO_DATOS`, `COPILOTO_CORTE`.

## v3 · contrato alineado con las convenciones del proyecto
- **FastAPI + Pydantic v2** (`pip install -r requirements.txt`). Python interno en snake_case; hacia afuera **camelCase** (`alias_generator=to_camel`), rutas bajo **`/v1`**, recursos en plural kebab-case, errores **RFC 9457** (`application/problem+json`, con `codigo` en estilo `validacion_fallida`).
- **Seguridad servicio a servicio**: el backend envía `Authorization: Bearer $COPILOTO_TOKEN_SERVICIO` (obligatoria; sin ella responde 503) y `X-Rol` (`sunass` o `admin`, variable `COPILOTO_ROLES`). La EPS y el público reciben 403. El **área SRT** la valida el backend.
- Identificadores legibles `codigoExpediente`, `codigoEps`, `codigoDocumento`, `codigoActuacion`, `codigoFragmento`; las personas se referencian por `registradoPorId` (UUID); booleanos `esVerificada`, `debeRevisarse`, `tieneMencionCronograma`; unidades en el nombre (`plazoDiasHabiles`, `diasHabilesRestantes`).
- Fechas `AAAA-MM-DD`, instantes UTC con `Z` (`registradoEn`), montos como cadena (`"436594.67"`). Catálogos con el estilo del dataset; `Equipo SRT` → `equipo_srt`, `resolucion_cd` → `resolucion_consejo_directivo`.
- `normativa/` se indexa como norma: **pega ahí el articulado oficial** (art. 89 RGT, RCD 124-2025, TUPA). Hoy solo trae la referencia del Expediente General.

## v3.2 · guardas sobre lo que dice el modelo
- **Cifras alteradas no pasan**: el verificador ya no acepta una cita casi igual si cambia un número (antes aceptaba `UFI- 2021` por `UFI- 2026-0001`).
- **Coherencia**: si el motivo del propio modelo niega lo pedido ("no se encuentra", "no se proporciona"…), el estado baja un nivel; y `evidencia_encontrada` exige que la cita contenga algún término clave del requisito (si no, baja a parcial y señala otro fragmento que sí lo tiene). Nunca sube un estado. Son heurísticas: la persona decide.
- **Prompt más estricto** (cambia la clave de la caché: vuelve a correr `python grabar_demo.py`).
- **UTF-8 declarado** en las respuestas JSON (PowerShell 5.1 mostraba `Ã³` en lugar de `ó`).

## Poner en marcha (PowerShell)
```
$env:COPILOTO_TOKEN_SERVICIO="cambia-esto"; $env:COPILOTO_CORPUS="documentos_sprint"
python servidor.py        # http://localhost:8765/v1  ·  docs en /docs · contrato en /openapi.json
```
Cada llamada: `-H "Authorization: Bearer cambia-esto" -H "X-Rol: sunass"`.

## API (/v1)
| Ruta | Cuerpo / parámetros | Devuelve |
|---|---|---|
| `GET /v1/salud` | — (sin token) | `modelo`, `cantidadFragmentos`, `documentos` |
| `GET /v1/calidad` | — | reglas de calidad de datos |
| `GET /v1/expedientes/{codigoExpediente}/ficha` | — | cabecera, normativa citada, plazos rotulados (`normativo` / `de_oficio` / `interno`), pendientes, requisitos con evidencia, reglas de datos, documentos |
| `GET /v1/expedientes/{codigoExpediente}/cadena-documental` | — | **copiloto documental**: documentos clasificados (`rolDocumental`: solicitud, oficio, respuesta, informe, resolución, anexo…) y conectados (`menciona` con cita literal, `anexo_de`, `secuencia` inferida por fecha), cada uno con `vinculo` al documento y `rolesSinDocumento` |
| `POST /v1/expedientes/{codigoExpediente}/evaluaciones-requisitos` | `{requisitos:[{codigoRequisito,texto,palabrasClave}], plazoDiasHabiles}` | resultados con estado, cita, documento y página + borrador |
| `POST /v1/expedientes/{codigoExpediente}/evaluaciones-informacion` | `{items:[…]}` | atendido / parcial / no_atendido, con cita |
| `POST /v1/preguntas` | `{pregunta, codigoExpediente?}` | respuesta con cita verificada, o pasajes; cada pasaje trae `codigoDocumento`, `rolDocumental`, `nivelAcceso` y `vinculo`; incluye `incertidumbre` (`alta`/`media` + motivos + advertencia) |
| `POST /v1/extracciones` | `{texto}` | `tipoDocumento` y `campos` |
| `POST /v1/contrastes-cifras` | `{referencia, respuesta}` | cifras que cambian entre dos textos |
| `POST /v1/decisiones` · `GET /v1/decisiones?codigoExpediente=` | `{codigoExpediente, codigoRequisito?, decision, registradoPorId, comentario?}` | decisión con `registradoEn` (UTC) |

`decision` ∈ `revisado`, `no_es_correcto`, `confirma_falta`, `si_esta_en_expediente`.

## Lo que verás con UFI-2026-0001 (sin modelo, solo recuperación)
Firma, monto, motivo, costos y cronograma salen como **evidencia parcial** (hay texto relacionado; el modelo debe confirmarlo) y el
**acuerdo de Directorio sale "no hallada"**. El Anexo 1 solo *menciona* cronograma y presupuesto ("el detalle numérico no se reproduce"), por eso nunca será evidencia plena.

## Límites y avisos
- Los expedientes son **material ficticio** de la hackatón; las tablas, una muestra sintética. Rotúlenlo en pantalla.
- `nivel_acceso` (DS11: público / interno / restringido_partes) debe respetarse en las vistas de EPS y ciudadanía.
- Sin OCR; sin modelo no hay confirmación semántica; las reglas de datos UFI son candidatas.
- En los documentos, el oficio da **10 DH** para subsanar mientras la carta de respuesta dice "máx. 2 DH": son plazos de capas distintas (de oficio vs. normativo). Muéstrenlos rotulados.
