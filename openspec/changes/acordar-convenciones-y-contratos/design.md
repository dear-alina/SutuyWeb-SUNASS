## Context

Estado del repositorio:
- Hay carpetas vacías (`frontend/`, `backend/`, `copiloto/`, `bd/`), un `.gitignore`, el README y OpenSpec sin specs. Todavía ninguna parte se puede ejecutar.
- El frontend (Next.js con TypeScript) lo desarrolla otra persona.
- El copiloto (FastAPI) también lo implementa otra persona. Nosotros hacemos el backend (Express con Zod en JavaScript) y su integración con el copiloto.

El prototipo (`HACKATON SUNASS/Prototipo`) es una referencia funcional:
- Su lógica pura (`lib/plazos.ts`, `lib/flujos/*`, `lib/permisos.ts`, `lib/avisos.ts`) y sus pruebas de Vitest sirven como casos de referencia.
- Sus datos simulados no pasan al MVP. Ver proposal.md, «Why».

## Goals / Non-Goals

**Goals:**
- Un estándar de nombres que se pueda aplicar igual en JS, TS, JSON, PostgreSQL y Python.
- Contratos de comportamiento (en las specs) y una única fuente para los esquemas exactos (el código, que genera OpenAPI).
- Responsabilidades y aprobación de cambios compartidos por escrito.

**Non-Goals:**
- Iniciar aplicaciones, instalar dependencias o crear migraciones. Eso corresponde al cambio `iniciar-backend-sesion-expedientes`.
- Renombrar el prototipo.
- Elegir el modelo del copiloto o su forma de indexar.

## Decisions

### D1. camelCase de extremo a extremo, salvo dentro de Python
Las claves JSON, las columnas y las tablas de PostgreSQL y las variables de JS/TS van en camelCase. Así el backend devuelve las filas de `pg` sin convertirlas.
- **Costo:** en PostgreSQL hay que poner comillas dobles en todo identificador con mayúsculas. Si se olvidan, PostgreSQL convierte el nombre a minúsculas y la consulta falla con `column "codigoeps" does not exist`. Ese fallo es ruidoso y no corrompe nada.
- **Python:** usa snake_case en atributos, con alias camelCase en Pydantic v2 (`alias_generator=to_camel`, `populate_by_name=True`). Una prueba verifica las claves de entrada, de salida y del `openapi.json`.
- *Alternativa descartada:* snake_case en la BD con una capa de conversión en el backend. Agrega una conversión en cada consulta y un lugar más donde equivocarse.

### D2. Los valores de catálogo conservan el estilo del dataset
`en_tramite`, `uso_excepcional_fondo` y `restringido_partes` se importan tal cual. Solo se mapean los nombres de columna.
- Los códigos de error siguen el mismo estilo (`validacion_fallida`).
- El área `"Equipo SRT"`, que solo existe en el prototipo, pasa a `equipo_srt`.
- *Alternativa descartada:* convertirlos a camelCase. Obligaría a mantener una tabla de traducción por catálogo en cada importación y actualización del dataset.

### D3. Excepciones con fuente
| Elemento | Regla | Fuente |
|---|---|---|
| Constantes inmutables | `UPPER_SNAKE` | Google JS/TS Style Guide |
| Variables de entorno | `UPPER_SNAKE`; `NEXT_PUBLIC_` solo para valores no secretos | POSIX, Next.js |
| Archivos JS y carpetas | kebab-case | Google JS Style Guide |
| Archivos Python | snake_case | PEP 8 |
| Migraciones | `AAAAMMDDHHmmss_descripcion.sql` (la marca de tiempo es la versión que usa Supabase CLI en `supabase_migrations.schema_migrations`) | Supabase CLI |
| Rutas HTTP | Segmentos en kebab-case; parámetros en camelCase | Microsoft Azure REST API Guidelines |
| Esquemas `auth` y `storage`, extensiones | Nombres originales | Supabase |

Fechas: ISO 8601 en datos, contratos y nombres de archivo; `dd/mm/aaaa` en lo que lee una persona (RAE, DPD).

### D4. Identificadores
`<entidad>Id` es siempre un UUID generado por la BD; `codigo<Entidad>` es siempre un código legible y estable. Dentro de su propia tabla, la PK se llama igual que la FK (`expedientes."expedienteId"`). Las restricciones y los índices llevan como prefijo su tipo: `"pkExpedientes"`, `"fkHitosExpedienteId"`, `"uqExpedientesCodigoExpediente"`, `"ckExpedientesEstado"`, `"ixHitosExpedienteIdIniciadoEn"`.

### D5. El código es la fuente de los esquemas
- **Backend:** Zod genera OpenAPI 3.1 en `backend/openapi.json`. La librería exacta se elige al instalar.
- **Copiloto:** FastAPI genera `copiloto/openapi.json`.
- **Verificación:** CI regenera ambos y falla si hay diferencias con lo versionado.
- **Frontend:** genera sus tipos desde `backend/openapi.json`.
- **Ejemplos compartidos backend–copiloto:** se validan con Zod y con Pydantic.
- **Specs:** describen el comportamiento y no copian esquemas.
- *Alternativa descartada:* escribir el OpenAPI a mano como fuente. Habría dos definiciones (YAML y Zod) que terminarían divergiendo.

### D6. Sesión
- Cookie httpOnly gestionada por el backend.
- Las EPS entran con correo y clave de Supabase Auth después de que el Admin apruebe su acceso.
- Microsoft Entra ID (proveedor `azure` de Supabase) queda reservado hasta que SUNASS confirme su tenant. El módulo de sesiones admite varios proveedores, y el perfil y los permisos no dependen del proveedor.
- *Alternativa descartada:* token Bearer. Obliga al frontend a guardar tokens y no encaja con el flujo de redirecciones de OAuth.

### D7. Responsabilidades
| Elemento | Nosotros modificamos | Requiere coordinación | Solo ejecutamos o consultamos |
|---|---|---|---|
| `backend/**` | ✔ | Cambios incompatibles en la API | |
| `bd/` | ✔ preparar y probar en local | Aplicar en el proyecto compartido (lo hace una persona designada, después del PR) | |
| `frontend/**` | | Issue o PR a su responsable | ✔ |
| `copiloto/**` | | Contrato | ✔ |
| Specs `contrato-*`, `config.yaml`, README, `.gitignore` raíz, CI, CODEOWNERS, `CONTRIBUTING.md` | | ✔ aprueban ambos responsables | |
| `.claude/`, `.agents/` | | Regenerar con `openspec update` | ✔ |

### D8. Mapeo del prototipo al MVP (propuesta para aplicar en los próximos cambios)
| Actual (CSV / prototipo) | Propuesto | Significado |
|---|---|---|
| `id_expediente`, `Expediente.id` | `codigoExpediente` + `expedienteId` (UUID) | Código legible frente a clave técnica |
| `cod_eps`, `Eps.cod_eps`, `codEps` | `codigoEps` | Mismo concepto (confirmado en `puedeVerExpediente` y `rucDe`) |
| `nombre_eps` | `eps.nombre` | Razón social |
| `tipo_procedimiento`, `procedimiento` | `tipoProcedimiento` | Catálogo |
| `plazo_maximo_dh`, `plazoMaximoDh` | `plazoMaximoDiasHabiles` | |
| `dias_suspension_dh`, `suspensionDatasetDh` | `diasHabilesSuspension` | |
| `fecha_limite`, `fechaLimiteDataset` | `fechaLimite` | |
| `hito_actual` | `codigoHitoActual` (solo importación) | Código de hito |
| `pasoActual` | `codigoPasoActual` | Paso del flujo (`p3`); **no es el mismo concepto que `hito_actual`** |
| `responsable_actual` | `areaActual` | Sigla del área |
| `inicioPaso` | `pasoIniciadoEn` | Instante |
| `equipo: string[]` | `"integrantesEquipo"` (`usuarioId`, `funcion`) | La función deja de depender de la posición |
| `revision` | `"revisionesRequisito"` | |
| `nro_hito`, `nro` | `hitos.numero` | |
| `hito`, `Hito.codigo` | `codigoHito` | |
| `pasoId` | `codigoPaso` | |
| `responsable` (ds02_hitos) | `area` | Sigla del área |
| `responsable` (ds10) | `cargoResponsable` | Cargo: **no es el mismo concepto** |
| `fecha_inicio`+`horaInicio`, `fecha_fin`+`horaFin` | `iniciadoEn`, `finalizadoEn` | Instantes |
| `dato_a_revisar` | `tieneFechaInconsistente` | fin < inicio |
| `Hito.documento` | `numeroDocumento` / `documentoId` | Número del documento frente a archivo |
| `usuario`, `usuarioNombre` | `registradoPorId` | |
| `canal` | `canalRecepcion` | |
| `id_actuacion`, `id_documento` | `codigoActuacion`, `codigoDocumento` (+ UUID) | `ACT-000001`, `DOC-000001` |
| `nivel_acceso` | `nivelAcceso` | Filtra permisos y citas |
| `area = "Admin"` | `rol = admin` | Admin es un rol, no un área |
| `puedeRealizar`, `veVencimiento` | `puedeRealizarPaso`, `puedeVerVencimiento` | |
| `Requisito.pagina/pasaje` | cita `{documentoId, pagina, fragmento}` | |

**No se trasladan:** `login`/`clave`, `CLAVE_PRUEBA`, `USUARIOS`, `EPS_DEMO`, `rucDe`, «Continuar como…», `avanzar_dia`/`avanzar_hora`, `AHORA_INICIAL`, `RepositorioLocal`/IndexedDB y `REQUISITOS`/`DOCUMENTOS`/`PREGUNTAS` simulados.

### D9. Herramientas de prueba (se instalan en el cambio siguiente)
- **Vitest:** pruebas unitarias.
- **Supertest:** HTTP en el mismo proceso; requiere que `crearApp()` esté separado de `listen()`.
- **Supabase CLI local con pgTAP:** migraciones, RLS y la regla de camelCase.
- **Bruno:** pruebas manuales; colecciones versionadas en `backend/colecciones/`.
- **pytest con `TestClient`:** del lado del copiloto (lo hace su responsable).
- **Aislamiento:** las pruebas abortan si `SUPABASE_URL` o `DATABASE_URL` no apuntan a localhost, y los datos de prueba son sintéticos.

## Risks / Trade-offs

- [Olvidar las comillas en SQL] → falla de forma ruidosa. Además, una prueba de pgTAP o un script revisa `information_schema.columns` en busca de `_` fuera de los esquemas exceptuados.
- [Las convenciones quedan solo en papel] → `config.yaml` obliga a cada propuesta a citarlas, y las pruebas de contrato verifican las claves.
- [El frontend ya avanzó con otros nombres] → el contrato se revisa en el PR del frontend antes de archivar este cambio.
- [El tenant de Microsoft no llega] → el acceso por correo y clave cubre el MVP y la ruta reservada responde 503 `proveedor_no_configurado`.

## Migration Plan

Solo documentación. Si se revierte, se eliminan los archivos nuevos y se restauran `config.yaml` y `.gitignore`.

## Open Questions

- Usuarios de GitHub de cada responsable, para `.github/CODEOWNERS`.
- Persona designada para aplicar las migraciones en el proyecto compartido de Supabase.
- Tenant de Microsoft 365 de SUNASS (confirmarlo con su área de TI).
