## Context

- Motivación: ver proposal.md, «Why». Comportamiento esperado: spec `sesion-y-registro`.
- **Frontend existente** (rama `frontend`, sin fusionar):
  - `frontend/src/servicios/api/cliente-api.ts` (`solicitarApi`): `fetch` a `${NEXT_PUBLIC_API_URL}/api/v1/...` con `credentials: "include"` y `Content-Type: application/json` en todas las peticiones; ante error lee el problem+json (`codigo`, `detail`, `errores`) y lanza `ErrorDeApi`.
  - `frontend/src/servicios/api/sesiones.ts`: `iniciarSesion({institucion, ruc, usuario, clave})`, `obtenerPerfil()`, `cerrarSesion()` y `obtenerRutaInicio(perfil)` según `perfil.rol`. El tipo provisional `Perfil` es `{rol, area, codigoEps, proveedor}`.
  - `frontend/src/app/(publico)/ingreso/page.tsx`: pestañas Sunass/EPS; el RUC solo aparece en EPS; trata `credenciales_invalidas` y `validacion_fallida`, y para otros códigos muestra `detail`.
  - No existen todavía `/solicitar-acceso` (el login ya enlaza ahí), `/admin/solicitudes-acceso`, `/eps/tramites` ni `/sunass/inicio` (destinos de `obtenerRutaInicio`).
  - Estilos reutilizables en `src/estilos/globales.css`: `campo`, `campo__clave`, `boton`, `aviso-error`, `sr-only` y `ms` (íconos). No hay pruebas automáticas configuradas.
- **Base de datos** (cambio `crear-tablas-acceso`, aplicado en local y en el remoto): `eps` (con `ruc` opcional), `perfiles` (PK = `auth.users.id`), `"solicitudesAcceso"`. RLS activo sin políticas y privilegios revocados a `anon` y `authenticated`. Su D1 fija el flujo: el registro crea la cuenta de Auth y una solicitud pendiente sin perfil; aprobar crea el perfil; rechazar borra la cuenta.
- **Contratos** (cambio `acordar-convenciones-y-contratos`): `/api/v1`, camelCase, problem+json con `codigo` y `trazaId`, paginación `datos`/`paginacion`, cookie `HttpOnly`/`Secure`/`SameSite=Lax`, CSRF, Microsoft reservado (503). Ese contrato decía «correo y clave»; se ajusta allí para aceptar el cuerpo que ya envía el frontend.
- El dataset no trae RUC: el seed de `crear-tablas-acceso` recibe RUC sintéticos `99000000001`…`99000000020` (el prefijo `99` no existe en Perú).

## Goals / Non-Goals

**Goals:**
- Que la pantalla de ingreso del frontend funcione contra el backend sin cambiar su código.
- Completar en el frontend lo mínimo para registrar, aprobar, ingresar, navegar con el rol correcto y cerrar sesión.
- Dejar la base del backend (estructura, errores, validación, sesión, pruebas, OpenAPI) que reutilizarán los siguientes módulos.

**Non-Goals:**
- Rediseñar la pantalla de ingreso o implementar las vistas de trámites y expedientes: las páginas de inicio quedan mínimas.
- Microsoft Entra ID (solo rutas reservadas), recuperación de clave, confirmación de correo y correos de aviso.
- Expedientes, documentos y copiloto.
- Despliegue.

## Decisions

### D1. Estructura del backend
- `src/app.js` exporta `crearApp()` (middlewares, rutas y manejador de errores); `src/servidor.js` solo hace `listen()`. Así Supertest prueba la app sin abrir puertos.
- Módulos en `src/modulos/<modulo>/` con `rutas.js`, `esquemas.js` (Zod) y `servicio.js`; lo transversal en `src/compartido/`.
- JavaScript ESM, Express 5 (propaga los errores de funciones `async` al manejador sin envoltorios).
- `src/config.js` valida las variables de entorno con Zod al arrancar y falla con un mensaje claro si falta alguna.

### D2. Acceso a Supabase: Auth con `supabase-js`, datos con `pg`
- **Auth:** dos clientes de `@supabase/supabase-js` sin persistencia de sesión:
  - con la clave pública: `signInWithPassword`, `refreshSession` y `getClaims` (verifica el JWT localmente con las claves públicas del proyecto);
  - con la clave secreta (`service_role`): `auth.admin.createUser`, `deleteUser`, `signOut` y búsqueda por correo.
- **Datos:** `pg` con `DATABASE_URL` (conexión directa o pooler de sesión). Permite transacciones reales, necesarias para aprobar (crear perfil + marcar solicitud).
- Las tablas tienen RLS sin políticas, así que el backend usa un rol de servidor (`postgres` o `service_role` vía la conexión), nunca `anon` ni `authenticated`.
- *Alternativa descartada:* usar solo `supabase-js` (PostgREST) para los datos. No ofrece transacciones de varias sentencias y obliga a funciones RPC en la base.

### D3. Sesión en dos cookies
- Al ingresar, el backend guarda `access_token` en la cookie `sw_acceso` (vida = `expires_in`) y `refresh_token` en `sw_renovacion` (vida 30 días). Ambas `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api`.
- `requerirSesion`:
  1. Verifica `sw_acceso` con `getClaims`.
  2. Si venció y hay `sw_renovacion`, llama a `refreshSession` y vuelve a fijar las dos cookies.
  3. Carga el perfil con su EPS; si no existe o no está activo, borra las cookies y responde 401.
  4. Deja el perfil en `req.perfil`.
- Cierre: `auth.admin.signOut(access_token)` (revoca el refresh) y borrado de cookies.
- En desarrollo (`http://localhost`) los navegadores aceptan `Secure`; `COOKIE_SEGURA=false` queda solo como escape para entornos que no lo acepten.
- *Alternativa descartada:* sesiones propias en una tabla. Duplica lo que ya hace Supabase Auth.
- *Alternativa descartada:* un solo JWT propio firmado por el backend. Habría que gestionar la revocación y la renovación a mano.

### D4. Inicio de sesión que acepta el cuerpo del frontend
- Esquema: `{institucion: "sunass"|"eps", usuario: email, clave: string, ruc?: /^\d{11}$/}` con `.strict()`; `ruc` obligatorio si `institucion = "eps"` (refinamiento, error en el campo `ruc`).
- Orden: `signInWithPassword` → perfil activo + EPS → comprobación de institución y RUC → cookies. Si el paso de perfil o de institución falla, se cierra la sesión recién creada en Supabase antes de responder.
- Sin perfil: si hay una solicitud `pendiente` para ese usuario → 403 `acceso_pendiente`; si no → 401 `credenciales_invalidas`.
- Todas las demás fallas → 401 `credenciales_invalidas` con el mismo `detail`, para no revelar si existe el correo ni qué comprobación falló.

### D5. Registro y resolución (sigue D1 de `crear-tablas-acceso`)
- **Registro:**
  1. Busca la EPS por `ruc` (422 en `ruc` si no existe).
  2. 409 `solicitud_pendiente` si hay una pendiente para `lower(correo)`.
  3. `auth.admin.createUser({email, password, email_confirm: true})`; si Auth dice que el correo existe → 409 `correo_registrado`.
  4. Inserta la solicitud `pendiente` con `usuarioId`. Si falla, `deleteUser` y se propaga el error.
- **Aprobación** (transacción `pg`): `select ... for update` de la solicitud; si no está `pendiente` → 409 `solicitud_resuelta`; inserta el perfil `eps`/`ep` con `nombre` y `cargo` de la solicitud; actualiza `estado`, `resueltoEn`, `resueltoPorId`.
- **Rechazo:** transacción que marca `rechazada` con motivo; después `deleteUser(usuarioId)` (la FK queda en `null` por `on delete set null`). Si el borrado de Auth falla, la solicitud ya quedó rechazada y la cuenta no puede ingresar porque no tiene perfil; se registra el error para reintentarlo.
- La clave solo pasa por el backend hacia Supabase Auth; nunca se guarda ni se registra en logs.

### D6. Errores, validación y trazas
- `compartido/problema.js`: clase `Problema(status, codigo, titulo, detalle, errores?)` y manejador final que responde `application/problem+json` con `type: "urn:sutuyweb:error:<codigo>"`, `instance` = ruta y `trazaId` (UUID por petición, también en el encabezado `X-Traza-Id`).
- `validar(esquema)` aplica Zod a `body`, `params` y `query`; un `ZodError` se convierte en 422 `validacion_fallida` con `errores[{campo, mensaje}]`.
- JSON mal formado → 400 `cuerpo_invalido`. Ruta inexistente → 404 `ruta_no_encontrada`. Error no previsto → 500 `error_interno` sin detalles internos.

### D7. CSRF, CORS y límite de intentos
- **CORS:** solo los orígenes de `ORIGENES_PERMITIDOS` (por defecto `http://localhost:3000`), con `credentials: true`.
- **CSRF** en `POST`, `PUT`, `PATCH` y `DELETE`: se exige `Origin` (o `Referer`) en la lista permitida y `Content-Type: application/json` cuando hay cuerpo. Un formulario de otro sitio no puede enviar JSON sin preflight, y la cookie `SameSite=Lax` no viaja en peticiones `POST` de otro sitio. El frontend ya cumple ambas condiciones.
- **Límite de intentos** (`express-rate-limit`, memoria del proceso): 10 intentos de ingreso por IP cada 15 minutos y 5 registros por IP cada hora → 429 `demasiados_intentos`. Suficiente para un solo proceso; con varios procesos haría falta un almacén compartido.

### D8. OpenAPI desde Zod
- Los esquemas se registran con `@asteasolutions/zod-to-openapi`; `npm run openapi` escribe `backend/openapi.json` (OpenAPI 3.1) de forma determinista. Una prueba compara el archivo versionado con el generado.

### D9. Pruebas
- Vitest + Supertest sobre `crearApp()`, contra el Supabase **local** (`npx supabase start` con la migración de `crear-tablas-acceso`).
- `pruebas/preparar.js` aborta si `SUPABASE_URL` o `DATABASE_URL` no apuntan a `localhost`/`127.0.0.1`.
- Cada prueba crea sus usuarios con correos `@prueba.test` y los borra al final; no depende de datos del remoto.

### D10. Primer Admin
- `backend/scripts/crear-admin.js` lee `ADMIN_CORREO` y `ADMIN_CLAVE` del entorno (o los pide por consola), crea el usuario en Auth con `email_confirm: true` y su perfil `admin` activo. No guarda nada en el repositorio. Para el remoto se ejecuta solo con confirmación de la usuaria.

## Frontend (rama `frontend`)

Se implementa en la rama `frontend`, donde vive el código, siguiendo `frontend/README.md` (kebab-case en archivos, PascalCase en componentes, dominio en español sin tildes ni ñ, WCAG 2.2 AA). Sus requisitos están en la spec: «Formulario de solicitud de acceso», «Bandeja de solicitudes del Admin», «Rutas protegidas por rol» y «Cierre de sesión visible».

### D11. Protección de rutas con un componente cliente por sección
- `src/componentes/comunes/RutaProtegida.tsx` (cliente) recibe los roles permitidos, llama a `obtenerPerfil()` y:
  - mientras espera, muestra «Cargando…» con `role="status"`;
  - con 401 (`ErrorDeApi` con `status` 401) hace `router.replace("/ingreso")`;
  - si el `rol` no está permitido, hace `router.replace(obtenerRutaInicio(perfil))`;
  - si todo está bien, entrega el perfil por un contexto (`usePerfil()`) y muestra el contenido.
- `src/app/eps/layout.tsx`, `src/app/sunass/layout.tsx` y `src/app/admin/layout.tsx` envuelven su sección con `RutaProtegida` y el `Encabezado`.
- La protección real está en el backend (cookies `HttpOnly`, permisos por petición); el frontend solo evita mostrar pantallas a quien no corresponde.
- *Alternativa descartada:* `middleware.ts` de Next.js. No puede leer la cookie si el backend está en otro origen y obligaría a duplicar la verificación de la sesión.

### D12. Formularios
- Reutilizan `campo`, `campo__clave`, `boton` y `aviso-error`.
- Validación en el navegador antes de enviar: RUC de 11 dígitos, correo, clave de al menos 8 caracteres, confirmación igual a la clave y motivo de rechazo no vacío. El backend vuelve a validar todo.
- Errores por campo con `aria-invalid` y `aria-describedby`; al fallar, el foco va al primer campo con error. Los errores de `errores` (422) se colocan en su campo; los códigos 409 se muestran en un `aviso-error` con `role="alert"`.
- El botón de envío se deshabilita mientras la petición está en curso para evitar envíos dobles.

### D13. Servicios y tipos
- `src/servicios/api/solicitudes-acceso.ts`: `solicitarAcceso(datos)`, `listarSolicitudes({estado, pagina, tamanoPagina})`, `aprobarSolicitud(solicitudAccesoId)` y `rechazarSolicitud(solicitudAccesoId, motivoRechazo)`, sobre `solicitarApi()`.
- `sesiones.ts`: el tipo `Perfil` se amplía con `usuarioId`, `nombre`, `cargo`, `correo` y `nombreEps`. Sigue siendo provisional hasta generarlo desde `backend/openapi.json`.
- Los mensajes de `credenciales_invalidas`, `acceso_pendiente`, `demasiados_intentos`, `solicitud_pendiente` y `correo_registrado` se definen en un solo lugar (`src/utilidades/mensajes-error.ts`) y los usan el ingreso y el registro.
- `frontend/.env.example` con `NEXT_PUBLIC_API_URL=http://localhost:4000`.

### D14. Encabezado y páginas de inicio mínimas
- `src/componentes/comunes/Encabezado.tsx`: logo, nombre y rol del usuario (de `usePerfil()`) y botón «Cerrar sesión», que llama a `cerrarSesion()` y lleva a `/ingreso` aunque la llamada falle.
- `/eps/tramites` y `/sunass/inicio`: título de la sección, saludo con el nombre y la EPS o el área, y el texto «Sección en construcción». Las vistas reales llegan en cambios posteriores.
- Se elimina la carpeta vacía `src/app/(publico)/ingresar/`, que duplica `ingreso/`.
- En `/ingreso`, el enlace «solicitar acceso» se reemplaza por un botón secundario «Registrarse» bajo «Ingresar», visible en ambas pestañas.

### D15. Modo de demostración (solo local)
- **Cuentas** (lista sin claves, versionada en `backend/scripts/crear-cuentas-demo.js` y en `frontend/src/utilidades/cuentas-demo.ts`; deben coincidir):
  - Administrador: `admin@demo.sutuyweb.test` (pestaña Sunass).
  - Especialista DRE: `dre@demo.sutuyweb.test`, rol `sunass`, área `dre` (pestaña Sunass).
  - EPS02 Manantial: `eps02@demo.sutuyweb.test`, RUC `99000000002` (pestaña EPS).
  - EPS07: `eps07@demo.sutuyweb.test`, RUC `99000000007`, dueña del expediente de demostración `UFI-2026-0001` (pestaña EPS).
- **Clave:** una sola para todas, en `CLAVE_DEMO` (`backend/.env`) y `NEXT_PUBLIC_CLAVE_DEMO` (`frontend/.env.local`). Ninguno de los dos archivos se versiona; los `.env.example` traen el modo en `false` y la clave vacía.
- **Activación:** el selector aparece solo si `NEXT_PUBLIC_MODO_DEMO=true` y `NEXT_PUBLIC_CLAVE_DEMO` no está vacía.
- **Presentación discreta** (revelación progresiva): el formulario se muestra ya relleno con la primera cuenta, igual que en un entorno real. El selector va dentro de un `<details>` cerrado al pie, en la misma línea de texto pequeño que «Prototipo con nombres ficticios», con el resumen «Cuentas de demostración». Sin colores de aviso.
- **Detalles de la vista de ingreso:** «Ingresar» es la única acción principal; «Registrarse» queda como acción secundaria con borde, precedida por «¿Su empresa aún no tiene acceso?»; «Ingresar» muestra «Ingresando…» y se deshabilita durante el envío; los controles del pie mantienen un área táctil de 44 px.
- **Script:** `npm run crear-cuentas-demo` crea cada cuenta o le actualiza la clave (`auth.admin`) y hace `upsert` de su perfil (`pg`); se puede ejecutar varias veces.
- **Riesgo aceptado:** un valor `NEXT_PUBLIC_*` queda en el código que descarga el navegador. Por eso el modo demo nunca se activa en un despliegue público, y crear las cuentas demo en el proyecto remoto requiere confirmación.
- *Alternativa descartada:* claves demo fijas en el código o en el seed. Cualquiera con el repositorio podría ingresar.

## Risks / Trade-offs

- **[El frontend y este backend viven en ramas distintas sin fusionar]** → La spec describe el contrato entre ambos; la demo usa un `git worktree` con la rama `frontend`. Al fusionar no hay conflictos porque no comparten archivos.
- **[El frontend tiene otra responsable]** → Los cambios en `frontend/` van en commits propios en la rama `frontend` y su PR lo revisa ella antes de fusionar.
- **[El frontend no tiene pruebas automáticas]** → Este cambio verifica con `npm run build` (tipos) y un recorrido manual con teclado y a 320 px; configurar Vitest en el frontend queda para un cambio posterior.
- **[`contrato-api` y el seed de RUC se ajustan en otras ramas]** → Las tareas de este cambio incluyen hacer esos ajustes allí y verificarlos antes de archivar.
- **[Límite de intentos en memoria]** → Se pierde al reiniciar y no se comparte entre procesos. Aceptable para el MVP; anotado para producción.
- **[Fallo entre crear la cuenta de Auth y la solicitud]** → Se borra la cuenta en el mismo flujo (D5). Si ese borrado también falla, queda registrado con su `trazaId` para limpiarlo.
- **[Clave secreta de Supabase en el backend]** → Solo en `backend/.env` (ignorado por git); `.env.example` con valores ficticios; nunca en logs ni respuestas.
- **[Política de claves]** → La define Supabase Auth (longitud mínima del proyecto); el backend exige al menos 8 caracteres para dar un error claro antes de llamar a Auth.

## Migration Plan

1. Crear `backend/` e instalar dependencias.
2. Configurar `backend/.env` local con las claves de `npx supabase status`.
3. Implementar y probar en local.
4. Ajustar `contrato-api` y el seed de RUC en sus ramas; actualizar los RUC en el remoto con confirmación.
5. Crear el primer Admin (local y, con confirmación, en el remoto).
6. Implementar las pantallas en la rama `frontend`.
7. Demo de punta a punta con ambas ramas.

**Rollback:** el backend es nuevo; basta con no desplegarlo. No hay cambios de esquema en esta rama.
