## 1. Preparación

- [x] 1.1 Confirmar que el `.gitignore` ignora `bd/supabase/.temp/`, con la regla `**/supabase/.temp/` de `acordar-convenciones-y-contratos`. Si todavía no está, coordinarlo con ese cambio. Verificar con `git check-ignore bd/supabase/.temp/x`: debe imprimir la ruta.
- [x] 1.2 Ejecutar `npx supabase init` dentro de `bd/` y verificar que existen `bd/supabase/config.jsonc` (formato de Supabase CLI 3.x; antes era `config.toml`) y `bd/supabase/migrations/`. Verificar también que `git check-ignore bd/supabase/migrations/x.sql` no imprime nada.
- [x] 1.3 Iniciar Docker Desktop y ejecutar `npx supabase start` desde `bd/`. Verificar que el comando muestra la URL de la API local y de Studio.

## 2. Migración

- [x] 2.1 Crear `bd/supabase/migrations/<AAAAMMDDHHmmss>_crear-tablas-acceso.sql` con `npx supabase migration new crear-tablas-acceso`. Verificar el nombre del archivo.
- [x] 2.2 Definir la tabla `eps`:
  - `"epsId"` (uuid con `gen_random_uuid()`)
  - `"codigoEps"` (check `^EPS[0-9]{2}$`)
  - `nombre`
  - `ruc` (nullable, check `^[0-9]{11}$`)
  - `"creadoEn"`
  - restricciones `"pkEps"`, `"uqEpsCodigoEps"`, `"uqEpsNombre"` y `"uqEpsRuc"`

  Verificar con `npx supabase db reset` sin errores.
- [x] 2.3 Definir la función de trigger que actualiza `"actualizadoEn"` y la tabla `perfiles`:
  - `"usuarioId"` como PK, con FK a `auth.users` y `on delete cascade`
  - `nombre`, `cargo`, `rol`, `area`, `"epsId"`, `proveedor` (por defecto `correo`) y `activo` (por defecto `true`)
  - `"creadoEn"` y `"actualizadoEn"`
  - restricciones `"ckPerfilesRol"`, `"ckPerfilesArea"`, `"ckPerfilesProveedor"` y `"ckPerfilesRolAreaEps"`
  - índice `"ixPerfilesEpsId"`

  Verificar con `npx supabase db reset`.
- [x] 2.4 Definir `"solicitudesAcceso"`:
  - `"solicitudAccesoId"`
  - `"usuarioId"`: FK a `auth.users`, nullable, `on delete set null`
  - `"epsId"`, `nombre`, `cargo`, `correo`
  - `estado`, por defecto `pendiente`
  - `"motivoRechazo"`, `"solicitadoEn"`, `"resueltoEn"`
  - `"resueltoPorId"`: FK a `perfiles`, `on delete restrict` (quien resolvió se desactiva, no se borra)
  - restricciones:
    - `"ckSolicitudesAccesoEstado"`
    - `"ckSolicitudesAccesoResolucion"`: si está pendiente, sin datos de resolución; si está resuelta, con `"resueltoEn"` y `"resueltoPorId"`; si está rechazada, con motivo
    - índice único parcial `"uqSolicitudesAccesoCorreoPendiente"` sobre `lower(correo)` donde `estado = 'pendiente'`

  Verificar con `npx supabase db reset`.
- [x] 2.5 Activar RLS en las tres tablas y ejecutar `revoke all ... from anon, authenticated`. Verificar que las tablas tienen RLS activado y sin políticas (prueba pgTAP) y que la API REST local responde `permission denied` con la clave `anon`.

- [x] 2.6 Agregar a la misma migración la tabla `expedientes` (design.md D8):
  - `"expedienteId"`, `"codigoExpediente"`, `"epsId"` (FK a `eps`, `on delete restrict`), `"tipoProcedimiento"`, `estado`, `"fechaInicio"`, `"plazoMaximoDiasHabiles"`, `"montoSolicitado"` (`numeric(14,2)`) y `"creadoEn"`
  - restricciones `"pkExpedientes"`, `"uqExpedientesCodigoExpediente"`, `"fkExpedientesEpsId"`, `"ckExpedientesCodigoExpediente"`, `"ckExpedientesTipoProcedimiento"`, `"ckExpedientesEstado"` y `"ckExpedientesCodigoTipo"`
  - índice `"ixExpedientesEpsId"`

  Verificar con `npx supabase db reset`.
- [x] 2.7 Definir `documentos` (design.md D8):
  - `"documentoId"`, `"codigoDocumento"`, `"expedienteId"` (FK, `on delete restrict`), `"codigoActuacion"`, `"tipoDocumento"`, `"numeroDocumento"`, `"fechaDocumento"`, `asunto`, `folios`, `"nivelAcceso"`, `"rutaArchivo"` y `"creadoEn"`
  - restricciones `"pkDocumentos"`, `"uqDocumentosCodigoDocumento"`, `"fkDocumentosExpedienteId"`, `"ckDocumentosCodigoDocumento"`, `"ckDocumentosCodigoActuacion"`, `"ckDocumentosTipoDocumento"` y `"ckDocumentosNivelAcceso"`
  - índice `"ixDocumentosExpedienteId"`

  Verificar con `npx supabase db reset`.
- [x] 2.8 Definir `requisitos` (design.md D9):
  - `"requisitoId"`, `"codigoRequisito"`, `"tipoProcedimiento"`, `numero`, `descripcion`, `"baseNormativa"`, `"tipoDocumentoEsperado"`, `"esCandidato"` (por defecto `false`) y `"creadoEn"`
  - restricciones `"pkRequisitos"`, `"uqRequisitosCodigoRequisito"`, `"uqRequisitosTipoProcedimientoNumero"`, `"ckRequisitosCodigoRequisito"`, `"ckRequisitosTipoProcedimiento"`, `"ckRequisitosTipoDocumentoEsperado"` y `"ckRequisitosDescripcion"`

  Verificar con `npx supabase db reset`.
- [x] 2.9 Activar RLS en `expedientes`, `documentos` y `requisitos` y ejecutar `revoke all ... from anon, authenticated`. Verificar con pgTAP que no tienen políticas.

## 3. Datos y scripts

- [x] 3.1 Crear `bd/supabase/seed.sql` con las 20 EPS sintéticas de `ds01_catalogo_eps` (`codigoEps`, `nombre`) y `on conflict do nothing`. Verificar que después de `npx supabase db reset`, `select count(*) from eps` devuelve 20.
- [x] 3.2 Crear `bd/scripts/promover-admin.sql`:
  - Toma el correo de una variable al inicio del script.
  - Busca el usuario en `auth.users`.
  - Crea o actualiza su perfil `admin` activo, sin área ni EPS.
  - Si el correo no existe, lanza `raise exception`.

  Verificar en local creando un usuario en Studio y ejecutando el script. Verificar también con un correo inexistente, que debe fallar.

- [x] 3.3 Verificar el texto vigente del art. 39.2 del RGT (RCD 028-2021 modificada por la RCD 124-2025-SUNASS-CD). Agregar a `bd/supabase/seed.sql`:
  - los requisitos `UFI-R01` a `UFI-R03` del art. 89.2, parafraseados, con `"baseNormativa"` y `"tipoDocumentoEsperado"` (el informe del num. 1 exige `informe`);
  - los 9 requisitos de `revision_periodica` del art. 39.2 vigente (`RP-R01` a `RP-R09`), con `"esCandidato" = true` solo si el texto no se pudo verificar;
  - los expedientes `UFI-2026-0001` (EPS07) y `RP-2026-0002` (EPS04) con sus datos de `ds02` y sus documentos de `ds11` y de `ds11_documentos_nuevos` (actualización al 20/11/2026).

  Verificar después de `npx supabase db reset`: 2 expedientes, 7 documentos de `UFI-2026-0001`, 15 de `RP-2026-0002` y 3 requisitos de `uso_excepcional_fondo`. Verificar que el seed no tiene nombres de personas, teléfonos ni enlaces de los expedientes reales.

## 4. Pruebas

- [x] 4.1 Escribir `bd/supabase/tests/acceso.test.sql` (pgTAP) con un caso por cada escenario de la spec `acceso-usuarios`:
  - catálogo de EPS
  - cascada desde `auth.users` y actualización de `"actualizadoEn"`
  - catálogos cerrados
  - coherencia entre rol, área y EPS
  - unicidad de solicitudes pendientes y datos de resolución
  - denegación para `anon` y `authenticated`

  Los usuarios de Auth de prueba se insertan en `auth.users` dentro de la transacción de la prueba. Verificar con `npx supabase test db`: todas pasan.
- [x] 4.2 Ejecutar `openspec validate crear-tablas-acceso --strict` y verificar que no hay errores.

- [x] 4.3 Escribir `bd/supabase/tests/expedientes.test.sql` (pgTAP) con un caso por cada escenario de la spec `expedientes-documentos`. Verificar con `npx supabase test db`: todas las pruebas pasan, también las de `acceso.test.sql`.
- [x] 4.4 Volver a ejecutar `openspec validate crear-tablas-acceso --strict` y verificar que no hay errores.

## 5. Aplicación en el proyecto remoto

- [x] 5.1 Pedirle a la usuaria que ejecute `! npx supabase login` y luego `! npx supabase link --project-ref dahkomqcscgbzuxmuesz` desde `bd/`; ahí ingresa la clave de la base. Verificar que `git status` no muestra archivos de `bd/supabase/.temp/`.
- [x] 5.2 Ejecutar `npx supabase db push --dry-run`. Verificar que lista solo la migración `crear-tablas-acceso`.
- [x] 5.3 Ejecutar `npx supabase db push`. Verificar con `npx supabase migration list` que la migración aparece aplicada en local y en el remoto.
- [x] 5.4 Cargar `bd/supabase/seed.sql` en el SQL Editor del proyecto remoto. Verificar en Table Editor que `eps` tiene 20 filas, `expedientes` 2 y `requisitos` al menos 3, y que las seis tablas muestran RLS activado.
- [ ] 5.5 Crear el primer Admin: agregar el usuario en Authentication → Users y ejecutar `bd/scripts/promover-admin.sql` con su correo. Verificar que `perfiles` tiene una fila `admin` activa.
