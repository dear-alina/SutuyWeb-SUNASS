## Why

Para que el backend pueda implementar el inicio de sesión y el registro de las EPS (`POST /api/v1/sesiones`, `GET /api/v1/perfil` y `/api/v1/solicitudes-acceso`, definidos en `acordar-convenciones-y-contratos`), la base de datos tiene que guardar algunas cosas que Supabase Auth no cubre:
- Quién es cada persona en el sistema: su rol, su área y su EPS.
- Qué EPS existen.
- Las solicitudes de acceso pendientes de aprobación.

Además, la demo del copiloto necesita evaluar un expediente concreto. Para eso la base debe guardar:
- Expedientes con un identificador único, su EPS y su procedimiento.
- Los documentos vinculados a cada expediente, con su `nivelAcceso`, para que el backend decida qué documentos puede consultar el copiloto.
- Los requisitos de cada procedimiento tomados del Reglamento General de Tarifas (RGT): art. 89.2 para el uso excepcional del fondo y art. 39.2, modificado por la RCD 124-2025-SUNASS-CD, para la revisión periódica (arts. 45–49).

El proyecto de Supabase (`dahkomqcscgbzuxmuesz`) está vacío y `bd/` todavía no tiene migraciones aplicadas. Esta es la primera pieza de base de datos.

## What Changes

**Estructura de Supabase CLI en `bd/supabase/`**
- Configuración, migraciones versionadas, datos sintéticos de prueba y pruebas pgTAP.

**Tablas nuevas en el esquema `public`**, con nombres en camelCase entre comillas:
- `eps`: catálogo de empresas prestadoras con código legible (`EPS01`…).
  - Se siembra con las 20 EPS sintéticas del dataset `ds01_catalogo_eps`, solo código y nombre.
- `perfiles`: datos de negocio de cada usuario de Supabase Auth.
  - Rol: `admin`, `sunass` o `eps`.
  - Área, EPS, proveedor de acceso y si está activo.
- `solicitudesAcceso`: registro de una EPS en espera de que el Admin la apruebe o la rechace.
- `expedientes`: código legible único (`UFI-2026-0001`), EPS, tipo de procedimiento, estado, fecha de inicio, plazo máximo en días hábiles y monto solicitado.
- `documentos`: código legible único (`DOC-000001`), expediente, tipo de documento, número, fecha, asunto, folios, `nivelAcceso` y la ruta del archivo en Storage (opcional).
- `requisitos`: catálogo de requisitos por tipo de procedimiento, con su base normativa, el tipo de documento que lo sustenta (si exige uno) y si todavía es candidato (texto de la norma sin verificar).

**Reglas en la propia base de datos**
- Catálogos cerrados.
- Coherencia entre rol, área y EPS.
- Una sola solicitud pendiente por correo.
- Formatos de `codigoExpediente` y `codigoDocumento`, y catálogos de procedimiento, estado, tipo de documento y nivel de acceso con los valores del dataset.
- Borrado en cascada del perfil cuando se elimina el usuario de Auth.

**Acceso cerrado**
- RLS está activado y no hay políticas para `anon` ni `authenticated`.
- Se revocan sus privilegios. Solo el backend, desde el servidor, accede a estas tablas.

**Datos de prueba de la demo**
- Requisitos de uso excepcional del fondo (los 3 del art. 89.2 del RGT) y de revisión periódica (los 9 del art. 39.2 vigente).
- Dos expedientes ficticios del dataset con sus documentos de `ds11` (incluida la actualización al 20/11/2026): `UFI-2026-0001` (EPS07) y `RP-2026-0002` (EPS04).

**Script para crear el primer Admin**
- Recibe el correo de un usuario ya creado en Supabase Auth y le asigna el perfil `admin`.
- No guarda claves en el repositorio.

**Aplicación en el proyecto remoto**
- Las migraciones se aplican a `dahkomqcscgbzuxmuesz` con `npx supabase db push`, después de probarlas en local.

## Capabilities

### New Capabilities
- `acceso-usuarios`: comportamiento de los datos que sostienen la identidad y el acceso:
  - catálogo de EPS
  - perfiles con rol y área
  - solicitudes de acceso
  - restricción de acceso directo a estas tablas
- `expedientes-documentos`: comportamiento de los datos que identifican un expediente y sus documentos:
  - expediente con código único, EPS y procedimiento
  - documentos vinculados con nivel de acceso
  - catálogo de requisitos por procedimiento con base normativa
  - datos de la demo y restricción de acceso directo

### Modified Capabilities
<!-- Ninguna: openspec/specs/ está vacío. -->

## Impact

- **Partes:** solo `bd/` cambia aquí.
  - El backend usará estas tablas en los cambios que implementen la sesión, las solicitudes y los expedientes.
  - El copiloto no accede a la base, pero consume `documentoId`, `codigoDocumento`, `nivelAcceso` y `codigoRequisito`, que le pasa el backend (contrato `contrato-copiloto`). Sus requisitos deben usar los mismos códigos que el catálogo.
  - El frontend no se ve afectado.
- **Archivos nuevos:**
  - `bd/supabase/config.jsonc`
  - `bd/supabase/migrations/<AAAAMMDDHHmmss>_crear-tablas-acceso.sql`
  - `bd/supabase/seed.sql`
  - `bd/supabase/tests/acceso.test.sql`
  - `bd/supabase/tests/expedientes.test.sql`
  - `bd/scripts/promover-admin.sql`
- **Herramientas:**
  - Supabase CLI vía `npx`, sin instalación global.
  - Docker Desktop para la base local.
- **Supabase remoto:** se crean 6 tablas en `public`. No se tocan `auth` ni `storage`.
- **Dependencia:** usa las convenciones de nombres del cambio `acordar-convenciones-y-contratos`. También usa su corrección del `.gitignore` para `bd/supabase/.temp/`.
- **Sin secretos en el repositorio:** la clave de la base y la `service_role` se ingresan solo en local.
