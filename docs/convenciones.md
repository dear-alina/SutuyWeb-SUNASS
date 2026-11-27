# Convenciones de nombres

Reglas comunes para el frontend, el backend, el copiloto y la base de datos. Las decisiones y sus alternativas descartadas están en el cambio de OpenSpec `acordar-convenciones-y-contratos` (design.md, D1–D4).

## Regla general

- El dominio se nombra en español, **sin tildes ni ñ**: `tamanoPagina`, `numero`, `anio`.
- **camelCase** en JavaScript, TypeScript, claves JSON, parámetros HTTP y en tablas, columnas, restricciones e índices de PostgreSQL.
- **PascalCase** para tipos, clases, esquemas y componentes: `Expediente`, `SolicitudAcceso`, `TarjetaExpediente`.
- **snake_case** solo dentro del código Python. Hacia afuera el copiloto expone camelCase (ver «Python» más abajo).
- Una excepción solo vale si está en la tabla de [Excepciones](#excepciones) con su fuente.

## Código

| Elemento | Regla | Ejemplos |
|---|---|---|
| Funciones | Verbo en infinitivo + complemento | `calcularFechaLimite`, `listarExpedientes`, `crearApp` |
| Booleanos | Prefijo `es`, `tiene`, `puede` o `debe` | `esAdmin`, `tieneFechaInconsistente`, `puedeRealizarPaso`, `puedeVerVencimiento` |
| Identificador técnico | `<entidad>Id`, siempre UUID generado por la BD | `expedienteId`, `epsId`, `usuarioId`, `documentoId` |
| Código legible | `codigo<Entidad>`, estable y visible para personas | `codigoExpediente` (`UFI-2026-0001`), `codigoEps` (`EPS02`), `codigoDocumento` (`DOC-000001`) |
| Referencia a una persona | `<accion>PorId` | `registradoPorId`, `resueltoPorId` |
| Instantes | Participio + `En` | `iniciadoEn`, `finalizadoEn`, `solicitadoEn`, `actualizadoEn` |
| Unidades | La unidad va en el nombre | `plazoMaximoDiasHabiles`, `diasHabilesSuspension`, `duracionMs` |
| Siglas | Se escriben como una palabra | `codigoEps`, `nombreEps`, `ruc`; tipo `EpsResumen` (no `codigoEPS` ni `EPSResumen`) |
| Singular y plural | Una entidad en singular; colecciones y listas en plural | `expediente`, `expedientes`, `documentoIds`, `citas` |

## Archivos y configuración

| Elemento | Regla | Ejemplos |
|---|---|---|
| Archivos y carpetas JS/TS | kebab-case | `solicitudes-acceso/`, `calcular-plazos.js` |
| Componentes React | PascalCase, igual que el componente | `TarjetaExpediente.tsx` |
| Archivos Python | snake_case | `consultas.py`, `indexar_documentos.py` |
| Constantes inmutables | `UPPER_SNAKE` | `TAMANO_PAGINA_MAXIMO`, `TIEMPO_ESPERA_COPILOTO_MS` |
| Variables de entorno | `UPPER_SNAKE`; prefijo `NEXT_PUBLIC_` solo para valores no secretos | `SUPABASE_URL`, `COPILOTO_TOKEN_SERVICIO`, `NEXT_PUBLIC_API_URL` |
| Migraciones | `AAAAMMDDHHmmss_descripcion.sql`, generadas con `npx supabase migration new` | `20261127001651_crear-tablas-acceso.sql` |

## PostgreSQL

- Tablas en **plural** y camelCase: `eps`, `perfiles`, `"solicitudesAcceso"`.
- Columnas en camelCase. La PK se llama igual que la FK que la referencia: `perfiles."usuarioId"`, `eps."epsId"`.
- Todo identificador con mayúsculas va **entre comillas dobles**, siempre, en DDL y en consultas:

  ```sql
  select "codigoEps", nombre from eps where "epsId" = $1;
  ```

  Sin comillas, PostgreSQL convierte el nombre a minúsculas y la consulta falla con `column "codigoeps" does not exist`.
- Restricciones e índices llevan su tipo como prefijo, seguido de la tabla y las columnas:

  | Prefijo | Tipo | Ejemplo |
  |---|---|---|
  | `pk` | Clave primaria | `"pkSolicitudesAcceso"` |
  | `fk` | Clave foránea | `"fkPerfilesEpsId"` |
  | `uq` | Única | `"uqEpsCodigoEps"` |
  | `ck` | Check | `"ckPerfilesRol"` |
  | `ix` | Índice | `"ixSolicitudesAccesoEstadoSolicitadoEn"` |

- Funciones de la BD: verbo en infinitivo, camelCase y entre comillas: `"fijarActualizadoEn"()`.

## HTTP

- Prefijo de versión: `/api/v1` en el backend y `/v1` en el copiloto.
- Segmentos de ruta en kebab-case y recursos en plural: `/api/v1/solicitudes-acceso`, `/api/v1/expedientes/{expedienteId}`.
- Parámetros de ruta y de consulta en camelCase: `?pagina=2&tamanoPagina=20&orden=-iniciadoEn`.
- Claves JSON en camelCase. Deben cumplir `^[a-z][a-zA-Z0-9]*$`, salvo los campos de RFC 9457 (`type`, `title`, `status`, `detail`, `instance`).

  ```json
  {
    "expedienteId": "3f1c2a9e-7b4d-4c1e-9a2f-5d6e7f8a9b0c",
    "codigoExpediente": "UFI-2026-0001",
    "tipoProcedimiento": "uso_excepcional_fondo",
    "estado": "en_tramite",
    "montoSolicitado": "1250000.00",
    "fechaInicio": "2026-11-27",
    "pasoIniciadoEn": "2026-11-27T14:05:00Z",
    "finalizadoEn": null,
    "permisos": { "puedeRealizarPaso": true }
  }
  ```

## Valores de catálogo

Los **valores** de catálogo conservan el estilo del dataset oficial (minúsculas con guion bajo) y no se traducen. Solo se mapean los **nombres de columna**.

| Campo | Valores (dataset) |
|---|---|
| `estado` (expediente) | `en_tramite`, `concluido`, `archivado` |
| `tipoProcedimiento` | `cambio_programa_inversiones`, `reajuste_ipm`, `reporte_periodico`, `revision_periodica`, `uso_excepcional_fondo`, `verificacion_incremento` |
| `nivelAcceso` | `publico`, `restringido_partes`, `interno` |
| `tipoDocumento` | `carta_ep`, `informe`, `oficio`, `resolucion_consejo_directivo`, … |

- Los códigos de error siguen el mismo estilo: `validacion_fallida`, `credenciales_invalidas`, `copiloto_no_disponible`.
- Los catálogos propios del MVP también: `rol` = `admin`, `sunass`, `eps`; estado de solicitud = `pendiente`, `aprobada`, `rechazada`.
- El área `"Equipo SRT"` del prototipo pasa a `equipo_srt`. Admin es un **rol**, no un área.

## Fechas

| Uso | Formato | Ejemplo |
|---|---|---|
| Fecha civil en datos y contratos | `AAAA-MM-DD`, zona `America/Lima` | `"2026-11-27"` |
| Instante en datos y contratos | ISO 8601 en UTC con `Z` | `"2026-11-27T14:05:00Z"` |
| Nombres de archivo | ISO 8601 | `20261127001651_crear-tablas-acceso.sql` |
| Texto que lee una persona | `dd/mm/aaaa` | 27/11/2026 |

## Python

- Atributos y funciones en snake_case dentro del copiloto.
- Los modelos Pydantic v2 exponen camelCase con `alias_generator=to_camel` y `populate_by_name=True`, y se serializan con `by_alias=True`.
- Una prueba verifica que las claves de entrada, de salida y del `openapi.json` cumplen `^[a-z][a-zA-Z0-9]*$`.

## Excepciones

| Elemento | Regla | Fuente |
|---|---|---|
| Constantes inmutables | `UPPER_SNAKE` | Google JavaScript / TypeScript Style Guide |
| Variables de entorno | `UPPER_SNAKE`; `NEXT_PUBLIC_` solo para valores no secretos | POSIX; documentación de Next.js |
| Archivos JS y carpetas | kebab-case | Google JavaScript Style Guide |
| Archivos y código Python | snake_case | PEP 8 |
| Migraciones | `AAAAMMDDHHmmss_descripcion.sql` (la marca de tiempo es la versión que guarda Supabase CLI en `supabase_migrations.schema_migrations`) | Supabase CLI |
| Rutas HTTP | Segmentos en kebab-case; parámetros en camelCase | Microsoft Azure REST API Guidelines |
| Campos de error | `type`, `title`, `status`, `detail`, `instance` | RFC 9457 |
| Valores de catálogo | Estilo del dataset (`en_tramite`) | Dataset oficial del desafío |
| Esquemas `auth` y `storage`, extensiones | Nombres originales | Supabase |
| Fechas legibles | `dd/mm/aaaa` | RAE, *Diccionario panhispánico de dudas* |

## Del prototipo al MVP

El mapeo de nombres del prototipo y del dataset (`cod_eps` → `codigoEps`, `hito_actual` → `codigoHitoActual`, etc.) está en design.md, D8, del cambio `acordar-convenciones-y-contratos`. Los datos simulados del prototipo (usuarios y claves de prueba, EPS de demostración, reloj simulado) no pasan al MVP.
