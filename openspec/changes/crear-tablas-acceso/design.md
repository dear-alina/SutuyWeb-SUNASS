## Context

- `bd/` está vacía. El proyecto de Supabase `dahkomqcscgbzuxmuesz` no tiene tablas propias.
- Las convenciones vienen de `acordar-convenciones-y-contratos` (D1–D4 y D6), un cambio todavía sin archivar:
  - tablas y columnas en camelCase entre comillas
  - `<entidad>Id` es un UUID y `codigo<Entidad>` un código legible
  - restricciones con prefijo de tipo
  - catálogos en snake_case
  - migraciones `AAAAMMDDHHmmss_descripcion.sql`
  - sesión con cookie gestionada por el backend
- El prototipo (`HACKATON SUNASS/Prototipo`) guardaba `login` y `clave` en datos simulados (`data/usuarios.ts`). El MVP no los traslada.
- El copiloto v3 (servicio RAG con FastAPI) evalúa los documentos de un expediente contra requisitos. Necesita que el backend le diga qué expediente evalúa, qué documentos puede usar según su `nivelAcceso` y qué requisitos aplicar. Hoy guarda esos datos en archivos CSV y JSON propios.
- Normativa revisada (compendio consolidado del RGT de SUNASS y El Peruano):
  - El RGT se aprobó con la RCD 028-2021-SUNASS-CD.
  - La RCD 033-2022 modificó el art. 46. La RCD 124-2025-SUNASS-CD (El Peruano, 26/10/2025) modificó, entre otros, los arts. 39, 45, 47, 48 y 49 y los anexos IX y X; no modificó el 89. Las RCD 037-2024 y 028-2026 modificaron el art. 90. No hubo renumeración.
  - Art. 39.2 vigente: la solicitud de revisión periódica exige 9 documentos (PMO; información del anexo X; propuesta de costos de servicios colaterales; tres actas de acuerdo; dos juegos de archivos de cálculo; plan de consulta pública). Según el art. 39.3, algunos solo se presentan en ciertos supuestos.
  - Plazos: el DS 006-2026-JUS (El Peruano, 30/04/2026) aprobó un nuevo TUO de la Ley 27444 y derogó el DS 004-2019-JUS. El cómputo en días hábiles pasó al art. 134.1.
  - Art. 89.2: la solicitud de uso excepcional del fondo exige (1) un informe que explicite el caso fortuito o de fuerza mayor, (2) los documentos que sustentan la propuesta y (3) la propuesta de devolución o de exoneración.
- En esta máquina:
  - No hay Supabase CLI global. Se usará `npx supabase`.
  - Docker Desktop está instalado, pero hay que iniciarlo para la base local.

## Goals / Non-Goals

**Goals:**
- Que las tablas mínimas de identidad y acceso estén creadas, probadas en local y aplicadas al proyecto remoto.
- Que las reglas de integridad (catálogos, coherencia, unicidad) vivan en la base de datos. Así un error del backend no deja datos incoherentes.
- Que exista lo mínimo para la demo del copiloto: un expediente con código único, su EPS, su procedimiento, sus documentos con nivel de acceso y los requisitos de su procedimiento con base normativa.

**Non-Goals:**
- Endpoints del backend, cookies, CSRF y Admin API: van en el cambio del backend que implemente la sesión.
- Hitos, actuaciones y la importación completa de los datasets ds02–ds11. `"codigoActuacion"` se guarda como texto, sin FK, hasta que exista la tabla de actuaciones.
- Plazos, días hábiles y evaluación de requisitos: son lógica del backend y del copiloto, no de la base.
- Configurar Microsoft Entra ID: el valor `microsoft` del catálogo queda solo reservado.
- Subir archivos a Storage (solo se guarda la ruta en `"rutaArchivo"`) y pgvector.
- Confirmación de correo, recuperación de clave y plantillas de correo de Supabase Auth.

## Decisions

### D1. Las claves solo viven en Supabase Auth
Flujo del registro de una EPS:
1. El backend crea el usuario en Supabase Auth con la Admin API.
2. Crea una fila `pendiente` en `"solicitudesAcceso"` que apunta a ese usuario. No crea perfil.
3. El inicio de sesión exige un perfil con `activo = true`, así que la cuenta no entra hasta que la aprueben.
4. Si el Admin aprueba, el backend crea el perfil `eps` y marca la solicitud como aprobada, en una sola transacción.
5. Si el Admin la rechaza, el backend marca la solicitud y borra el usuario de Auth.

Para que la solicitud rechazada se conserve como historial, `"solicitudesAcceso"."usuarioId"` usa `on delete set null`.

En cambio, `"resueltoPorId"` usa `on delete restrict`. Una solicitud resuelta tiene que registrar quién la resolvió (spec `acceso-usuarios`), así que no puede quedar en null. Por eso, un Admin que resolvió solicitudes no se borra: se desactiva con `activo = false`.

- *Alternativa descartada:* guardar la clave en la solicitud y crear el usuario de Auth al aprobar. Habría que guardar una clave fuera de Auth, aunque fuera cifrada.
- *Alternativa descartada:* crear el perfil con `activo = false` desde el registro. Mezcla a los solicitantes con los usuarios reales y obliga a filtrar en todas las consultas.

### D2. `perfiles` comparte la PK con `auth.users`
`perfiles."usuarioId"` es a la vez la PK y una FK a `auth.users(id)` con `on delete cascade`. Así la relación es 1:1 y el perfil no puede quedar huérfano. Es el patrón que recomienda Supabase para los datos de usuario en `public`.
- `nombre` y `cargo` se guardan en el perfil y no en `raw_user_meta_data`. Así el backend los consulta y los valida como cualquier otra columna.
- El correo no se copia en `perfiles`. Su fuente es `auth.users`. El backend lo obtiene de la sesión o de la Admin API.

### D3. Catálogos como `CHECK`, no como tablas
Los catálogos se validan con restricciones con nombre:
- `"ckPerfilesRol"`: `rol`
- `"ckPerfilesArea"`: `area`
- `"ckPerfilesProveedor"`: `proveedor`
- `"ckSolicitudesAccesoEstado"`: `estado`
- `"ckExpedientesTipoProcedimiento"`, `"ckExpedientesEstado"`, `"ckDocumentosTipoDocumento"`, `"ckDocumentosNivelAcceso"` y `"ckRequisitosTipoProcedimiento"`, con los valores del dataset sin traducir (D2 de las convenciones)

La coherencia entre rol, área y EPS va en una restricción de tabla, `"ckPerfilesRolAreaEps"`.
- Son pocos valores y casi no cambian. Si cambian, se agrega una migración.
- *Alternativa descartada:* tablas de catálogo con FK. Por ahora son más tablas sin beneficio. Se puede revisar cuando los catálogos crezcan.
- *Alternativa descartada:* tipos `enum` de PostgreSQL. Quitar un valor de un enum es incómodo y los errores son menos claros que con un `CHECK` con nombre.

### D4. Acceso solo desde el servidor
Las seis tablas quedan cerradas para los roles que usan los clientes de Supabase:
- Se ejecuta `enable row level security` en las seis tablas y no se crean políticas.
- Además se revocan los privilegios: `revoke all on table ... from anon, authenticated`.

Así PostgREST no devuelve nada aunque alguien obtenga la clave `anon`. Además, el frontend nunca habla con Supabase (contrato `contrato-api`).

El backend accede con credenciales de servidor, que solo existen en su `.env` y no se versionan:
- la conexión directa a PostgreSQL
- la `service_role` para la Admin API de Auth

Cómo protege el backend esas credenciales le toca al cambio del backend.

### D5. Primer Admin sin secretos en el repositorio
1. La persona responsable crea el usuario en el dashboard, en Authentication → Users → Add user, con correo y clave.
2. Ejecuta `bd/scripts/promover-admin.sql`. El script recibe el correo como variable y crea o actualiza su perfil con `rol = 'admin'`, sin área ni EPS y activo. Si el correo no existe en `auth.users`, falla con `raise exception`.

El script se ejecuta en el SQL Editor, o con `psql` si está disponible.

### D6. Datos de prueba
- `bd/supabase/seed.sql` inserta, siempre con `on conflict do nothing`:
  - las 20 EPS sintéticas de `ds01_catalogo_eps` (solo `codigoEps` y `nombre`);
  - los requisitos de `uso_excepcional_fondo` y `revision_periodica` (D9);
  - dos expedientes ficticios del dataset con sus documentos de `ds11`, con el estado y los documentos de la actualización al 20/11/2026: `UFI-2026-0001` (EPS07, `concluido`, 7 documentos) y `RP-2026-0002` (EPS04, `en_tramite`, 15 documentos). Entre los dos cubren los tres niveles de acceso.
- `npx supabase db reset` lo usa en local.
- En el remoto se carga solo una vez, después del `db push`, pegando el mismo archivo en el SQL Editor. Esto se hace porque `db push` no ejecuta el seed por defecto.
- Son datos sintéticos, así que pueden estar en el repositorio público (`openspec/config.yaml`).

### D7. Pruebas
- Las pruebas pgTAP van en `bd/supabase/tests/acceso.test.sql` y `bd/supabase/tests/expedientes.test.sql`, y se ejecutan con `npx supabase test db`.
- Cubren cada escenario de las specs `acceso-usuarios` y `expedientes-documentos`.
- Las pruebas de acceso cambian de rol dentro de la transacción (`set local role anon` / `authenticated`).
- Solo se ejecutan contra la base local, nunca contra el remoto.

### D8. Expedientes y documentos
- `expedientes`:
  - `"expedienteId"` (UUID) y `"codigoExpediente"` (único, `^(CPI|RP|RPI|RTI|UFI|VCI)-[0-9]{4}-[0-9]{4}$`).
  - `"epsId"` (FK a `eps`, `on delete restrict`), `"tipoProcedimiento"`, `estado`, `"fechaInicio"` (date), `"plazoMaximoDiasHabiles"` (entero, opcional), `"montoSolicitado"` (`numeric(14,2)`, opcional) y `"creadoEn"`.
  - `"ckExpedientesCodigoTipo"`: el prefijo del código corresponde al procedimiento (`UFI` → `uso_excepcional_fondo`, `RP` → `revision_periodica`, `CPI` → `cambio_programa_inversiones`, `RPI` → `reporte_periodico`, `RTI` → `reajuste_ipm`, `VCI` → `verificacion_incremento`).
- `documentos`:
  - `"documentoId"` (UUID), `"codigoDocumento"` (único, `^DOC-[0-9]{6}$`) y `"expedienteId"` (FK a `expedientes`, `on delete restrict`).
  - `"codigoActuacion"` (texto opcional, `^ACT-[0-9]{6}$`), `"tipoDocumento"`, `"numeroDocumento"`, `"fechaDocumento"` (date), `asunto`, `folios`, `"nivelAcceso"` (obligatorio), `"rutaArchivo"` (opcional) y `"creadoEn"`.
  - Índice `"ixDocumentosExpedienteId"`.
- No se exige que `"fechaDocumento"` sea posterior a `"fechaInicio"`: el dataset tiene un caso así (DOC-000412) y esa regla de calidad le toca al backend.
- *Alternativa descartada:* identificar expedientes y documentos solo por su código. Los códigos son visibles y podrían cambiar de formato; el UUID es la clave técnica (D4 de las convenciones).

### D9. Requisitos tomados de la norma
- `requisitos`: `"requisitoId"` (UUID), `"codigoRequisito"` (único, `^(CPI|RP|RPI|RTI|UFI|VCI)-R[0-9]{2}$`, p. ej. `UFI-R01`), `"tipoProcedimiento"`, `numero`, `descripcion`, `"baseNormativa"` (p. ej. `RGT art. 89.2 num. 1`), `"tipoDocumentoEsperado"` (catálogo de tipos de documento, opcional) y `"esCandidato"` (boolean).
- Restricción `"uqRequisitosTipoProcedimientoNumero"`.
- `"tipoDocumentoEsperado"` indica que el requisito exige un documento vinculado (por ejemplo, un `informe`).
- `"esCandidato" = true` marca un requisito cuyo texto no se pudo verificar en la norma vigente. Los 3 de uso excepcional (art. 89.2) y los 9 de revisión periódica (art. 39.2 modificado por la RCD 124-2025) están verificados en el texto publicado, así que nacen con `false`.
- Las descripciones parafrasean la norma; no copian documentos de expedientes reales, que tienen datos personales.
- El copiloto usa los mismos `"codigoRequisito"`.
- *Alternativa descartada:* dejar los requisitos solo en archivos JSON del copiloto. Serían una segunda fuente que se desalinea de la base y del backend.

## Risks / Trade-offs

- **[La convención de camelCase obliga a poner comillas en cada identificador]** → Si falta una comilla, falla de forma ruidosa (`column ... does not exist`). Las pruebas pgTAP usan los nombres reales.
- **[Usuarios de Auth sin perfil ni solicitud]** Puede pasar si el backend falla entre crear el usuario y crear la solicitud. → El backend hará las dos cosas y, si falla la segunda, borrará el usuario. Esto queda anotado para el cambio del backend.
- **[`db push` aplica directamente sobre el proyecto compartido]** → Primero se ejecutan `db reset` y `test db` en local. Antes del push se ejecuta `npx supabase db push --dry-run`. El push lo hace la persona designada (D7 de las convenciones).
- **[El `.gitignore` actual ignora `supabase/.temp/` solo en la raíz]** → `supabase link` crea `bd/supabase/.temp/`, que podría incluir la referencia del proyecto. Antes de hacer `link`, se aplica la corrección que trae `acordar-convenciones-y-contratos` (`**/supabase/.temp/`) o se confirma que ya está aplicada.
- **[La norma cambia]** (como la RCD 124-2025 con el art. 39.2) → Los requisitos son datos: se corrigen con el seed o con una migración nueva, y `"esCandidato"` los marca mientras tanto.
- **[Datos ficticios confundidos con reales]** → El seed usa solo expedientes del dataset ficticio. Los PDF reales de los casos de EPSSMU y Emapa Pasco nunca entran al repositorio.
- **[Docker detenido]** → `supabase start` falla. Hay que iniciar Docker Desktop antes de las tareas locales.

## Migration Plan

1. Ejecutar `npx supabase init` dentro de `bd/`.
2. Escribir la migración, el seed, las pruebas y el script.
3. En local, ejecutar `npx supabase start`, `npx supabase db reset` y `npx supabase test db`.
4. Conectar con el proyecto remoto:
   - `npx supabase login`, que lo hace la usuaria en el navegador.
   - `npx supabase link --project-ref dahkomqcscgbzuxmuesz`, que pide la clave de la base y no se guarda en el repositorio.
5. Ejecutar `npx supabase db push --dry-run` y luego `npx supabase db push`.
6. Cargar `seed.sql` en el SQL Editor, crear el primer Admin y ejecutar `promover-admin.sql`.

**Rollback:** como el remoto no tiene datos todavía, se puede volver atrás con una migración nueva que borre las seis tablas. No se edita una migración que ya se aplicó.

## Open Questions

- ¿Quién será el Admin inicial? Solo cambia el correo que se pasa a `promover-admin.sql`, no el diseño.
