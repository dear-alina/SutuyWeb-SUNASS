## Why

El frontend ya tiene la pantalla de ingreso y un cliente HTTP que llama a `POST /api/v1/sesiones`, `GET /api/v1/perfil` y `DELETE /api/v1/sesiones/actual`, pero `backend/` está vacío. Las tablas de identidad (`eps`, `perfiles`, `solicitudesAcceso`) ya están en Supabase. Falta el backend que conecte la pantalla con Supabase Auth y con la base de datos, para que las personas de Sunass y de las EPS puedan ingresar y para que una EPS pueda pedir acceso y el Admin aprobarlo. En el frontend también faltan pantallas: el login enlaza a `/solicitar-acceso`, que no existe, y después de ingresar redirige a `/eps/tramites`, `/sunass/inicio` o `/admin/solicitudes-acceso`, que tampoco existen y hoy terminarían en 404.

## What Changes

- Se crea el backend en `backend/` (Node.js, Express, JavaScript, Zod), organizado por módulos, con la separación entre `crearApp()` y `listen()` que exigen las pruebas.
- **Inicio de sesión** que responde a lo que el frontend ya envía:
  - Cuerpo `{institucion, usuario, clave, ruc}`: `usuario` es el correo; el `ruc` se exige y se verifica solo en la pestaña de la EPS.
  - Credenciales verificadas por Supabase Auth; rol, área y EPS leídos de `perfiles`.
  - Sesión en cookies `HttpOnly`, `Secure` y `SameSite=Lax`, renovada automáticamente; el cuerpo nunca lleva tokens.
  - Límite de intentos de ingreso.
- **Perfil** del usuario autenticado y **cierre de sesión**.
- **Solicitudes de acceso de las EPS**:
  - Registro público con RUC, nombre, cargo, correo y clave; queda pendiente.
  - El Admin lista, aprueba (crea el perfil `eps`) o rechaza (con motivo; borra el usuario de Auth) las solicitudes.
- Rutas de Microsoft Entra ID reservadas, que responden 503 mientras no esté configurado.
- Errores en problem+json con `codigo` y `trazaId`, validación de entradas con Zod y protección contra CSRF.
- `backend/openapi.json` generado desde los esquemas Zod.
- Script para crear el primer Admin sin guardar claves en el repositorio.
- **Frontend** (en la rama `frontend`, donde vive su código):
  - Página `/solicitar-acceso` con el formulario de registro de la EPS.
  - Bandeja `/admin/solicitudes-acceso` para aprobar o rechazar.
  - Páginas de inicio mínimas para `eps` y `sunass`, para que el ingreso no termine en 404.
  - Encabezado con «Cerrar sesión» y protección de rutas por rol.
  - Servicio `solicitudes-acceso.ts`, tipo `Perfil` completo y `frontend/.env.example`.
  - Botón «Registrarse» bajo «Ingresar», que lleva a `/solicitar-acceso`.
- **Modo de demostración** (solo en local): un selector de cuentas demo rellena el formulario de ingreso para entrar con un clic, y un script crea esas cuentas. Se activa por variables de entorno no versionadas; ninguna clave entra al repositorio.

## Capabilities

### New Capabilities
- `sesion-y-registro`: comportamiento del backend y de las pantallas para iniciar y cerrar sesión, consultar el perfil, solicitar acceso como EPS y resolver solicitudes como Admin, incluidos los permisos, la protección de la sesión y de las rutas y los errores.

### Modified Capabilities
<!-- Ninguna: openspec/specs/ está vacío. Los contratos (contrato-api) y las tablas (acceso-usuarios) siguen en cambios sin archivar; sus ajustes se hacen en esas ramas. -->

## Impact

- **Partes:**
  - `backend/` (nuevo), en la rama `implementar-sesion`.
  - `frontend/`, en la rama `frontend`: páginas, layouts, un componente de protección de rutas, el servicio de solicitudes y tipos. Su PR lo revisa la responsable del frontend.
  - `bd/` no cambia en estas ramas.
- **Dependencias del backend:** Express, Zod, `@supabase/supabase-js`, `pg`, `cookie-parser`, `cors`, `helmet`, `express-rate-limit`, `@asteasolutions/zod-to-openapi`; de desarrollo, Vitest y Supertest. Las versiones se confirman al instalar.
- **Depende de otros cambios sin fusionar:**
  - `crear-tablas-acceso`: las tablas (ya aplicadas en local y en el remoto) y los RUC sintéticos de las EPS (`99000000001`…`99000000020`) que se agregan al seed en esa rama.
  - `acordar-convenciones-y-contratos`: `contrato-api` se ajusta en esa rama al cuerpo de inicio de sesión, a las solicitudes de acceso y a los códigos de error nuevos.
- **Configuración:** `backend/.env.example` con valores ficticios. Las claves reales de Supabase (pública, secreta y conexión a PostgreSQL) viven solo en `backend/.env`, que no se versiona.
- **Supabase remoto:** ningún cambio de esquema. Crear el primer Admin y actualizar los RUC se hace con confirmación de la usuaria.
