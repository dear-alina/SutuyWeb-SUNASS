## 1. Base del backend

- [x] 1.1 Crear `backend/package.json` (ESM, scripts `dev`, `start`, `test`, `openapi`) e instalar Express, Zod, `@supabase/supabase-js`, `pg`, `cookie-parser`, `cors`, `helmet`, `express-rate-limit` y `@asteasolutions/zod-to-openapi`; de desarrollo, Vitest y Supertest. Confirmar las versiones vigentes con la documentación antes de instalar. Verificar que `npm install` termina sin errores y que `backend/node_modules` está ignorado por git.
- [x] 1.2 Crear `backend/.env.example` con valores ficticios (`PUERTO`, `SUPABASE_URL`, `SUPABASE_CLAVE_PUBLICA`, `SUPABASE_CLAVE_SECRETA`, `DATABASE_URL`, `ORIGENES_PERMITIDOS`, `COOKIE_SEGURA`) y `src/config.js`, que los valida con Zod (design.md D1). Verificar que arrancar sin `.env` falla con un mensaje que nombra la variable faltante y que `git check-ignore backend/.env` imprime la ruta.
- [x] 1.3 Crear `src/app.js` (`crearApp()`) y `src/servidor.js` (`listen()`) con helmet, CORS con credenciales para los orígenes permitidos, `cookie-parser` y JSON (design.md D1, D7). Verificar con una prueba que una ruta inexistente responde 404 `ruta_no_encontrada` en problem+json.
- [x] 1.4 Crear `src/compartido/problema.js` y `validar(esquema)` (design.md D6): problem+json con `codigo` y `trazaId`, 422 `validacion_fallida` con `errores[{campo, mensaje}]`, 400 `cuerpo_invalido` y 500 `error_interno`. Verificar con pruebas que un JSON mal formado da 400 y un campo desconocido da 422 con el campo nombrado.
- [x] 1.5 Crear `src/compartido/bd.js` (pool de `pg` y ayuda de transacción) y `src/compartido/supabase.js` (clientes pública y secreta sin persistencia, design.md D2). Crear `pruebas/preparar.js`, que aborta si `SUPABASE_URL` o `DATABASE_URL` no apuntan a localhost (design.md D9). Verificar que las pruebas abortan con una URL remota y que con la local `select count(*) from eps` devuelve 20.

## 2. Sesión y perfil

- [x] 2.1 Crear `src/compartido/sesion.js` (cookies `sw_acceso` y `sw_renovacion`, design.md D3) y el middleware `requerirSesion` con renovación automática y verificación del perfil activo. Verificar con pruebas: sin cookie → 401; token vencido con renovación válida → 200 y cookies nuevas; perfil desactivado → 401 y cookies borradas.
- [x] 2.2 Implementar `POST /api/v1/sesiones` (design.md D4) con su esquema Zod. Verificar con pruebas cada escenario de «Inicio de sesión con correo y clave» y de «Sesión en cookies protegidas»: ingreso Sunass y EPS correctos, RUC de otra EPS, pestaña equivocada, clave incorrecta, solicitud pendiente (403), falta de RUC (422), cookies `HttpOnly` y cuerpo sin tokens.
- [x] 2.3 Implementar `GET /api/v1/perfil` y `DELETE /api/v1/sesiones/actual`. Verificar con pruebas que el perfil de un Admin tiene `area` y `codigoEps` en `null`, que todas las claves del perfil están presentes y que tras cerrar sesión el perfil responde 401.
- [x] 2.4 Reservar `GET /api/v1/sesiones/microsoft` y `/microsoft/retorno` con 503 `proveedor_no_configurado`. Verificar con una prueba.

## 3. Solicitudes de acceso

- [x] 3.1 Implementar `POST /api/v1/solicitudes-acceso` (design.md D5). Verificar con pruebas: registro correcto (201, `pendiente`, la cuenta no puede ingresar), RUC desconocido (422 en `ruc` y sin cuenta creada), pendiente duplicada (409 `solicitud_pendiente`) y correo con cuenta (409 `correo_registrado`).
- [x] 3.2 Implementar `requerirRol("admin")` y `GET /api/v1/solicitudes-acceso` con paginación (`datos`, `paginacion`) y filtro por `estado`. Verificar con pruebas que un `eps` recibe 403 y que `tamanoPagina=500` da 422.
- [x] 3.3 Implementar `.../aprobacion` en una transacción y `.../rechazo` con `motivoRechazo` obligatorio y borrado de la cuenta de Auth. Verificar con pruebas: aprobar y luego ingresar como EPS → 200 con `rol: "eps"`; rechazar → solicitud `rechazada` y la cuenta ya no ingresa; rechazo sin motivo → 422; aprobar una ya resuelta → 409 `solicitud_resuelta`.

## 4. Protección

- [x] 4.1 Implementar `protegerCsrf` (Origin o Referer permitido y JSON en métodos que modifican, design.md D7). Verificar con pruebas que un `POST /api/v1/sesiones` con `Origin` ajeno responde 403 y no inicia sesión.
- [x] 4.2 Agregar los límites de intentos de ingreso y de registro con 429 `demasiados_intentos`. Verificar con una prueba que el intento 11 desde la misma IP responde 429.

## 5. Contrato y documentación

- [x] 5.1 Registrar los esquemas en `@asteasolutions/zod-to-openapi` y crear `npm run openapi`, que escribe `backend/openapi.json` (design.md D8). Verificar con una prueba que el archivo versionado coincide con el generado y que todas sus claves de propiedades cumplen `^[a-z][a-zA-Z0-9]*$`.
- [x] 5.2 Crear `backend/README.md` breve: cómo configurar `.env` con `npx supabase status`, cómo correr `npm run dev`, `npm test` y `npm run openapi`. Verificar que no contiene claves reales.
- [x] 5.3 En la rama `acordar-convenciones-y-contratos`, ajustar `contrato-api`: cuerpo de `POST /api/v1/sesiones` (`institucion`, `usuario`, `clave`, `ruc`), campos del perfil, requisito de solicitudes de acceso y códigos `acceso_pendiente`, `demasiados_intentos`, `solicitud_pendiente`, `correo_registrado` y `solicitud_resuelta`. Verificar con `openspec validate acordar-convenciones-y-contratos --strict`.
- [x] 5.4 En la rama `crear-tablas-acceso`, agregar al seed los RUC sintéticos `99000000001`…`99000000020` y verificar con `npx supabase db reset` y `npx supabase test db`. Con confirmación de la usuaria, actualizar los RUC en el remoto y verificarlos con una consulta de solo lectura.

## 6. Frontend (rama `frontend`)

Se trabaja en la rama `frontend` (por ejemplo, en un `git worktree` aparte), en commits propios. El PR lo revisa la responsable del frontend.

- [x] 6.1 Crear `frontend/.env.example` con `NEXT_PUBLIC_API_URL=http://localhost:4000`, ampliar el tipo `Perfil` en `src/servicios/api/sesiones.ts` (design.md D13), crear `src/servicios/api/solicitudes-acceso.ts` y `src/utilidades/mensajes-error.ts`, y hacer que `/ingreso` use esos mensajes. Verificar con `npm run build` sin errores de tipos.
- [x] 6.2 Crear `src/componentes/comunes/RutaProtegida.tsx` (con `usePerfil()`), `src/componentes/comunes/Encabezado.tsx` con «Cerrar sesión» y los layouts `src/app/eps/layout.tsx`, `src/app/sunass/layout.tsx` y `src/app/admin/layout.tsx` (design.md D11, D14). Verificar a mano los escenarios de «Rutas protegidas por rol» y «Cierre de sesión visible»: sin sesión → `/ingreso`; `eps` en `/admin/...` → `/eps/tramites`; cerrar sesión → `/ingreso`.
- [x] 6.3 Crear las páginas mínimas `src/app/eps/tramites/page.tsx` y `src/app/sunass/inicio/page.tsx` y eliminar la carpeta vacía `src/app/(publico)/ingresar/` (design.md D14). Verificar que ingresar como EPS y como Sunass lleva a su página sin 404 y muestra el nombre del usuario.
- [x] 6.4 Crear `src/app/(publico)/solicitar-acceso/page.tsx` (design.md D12). Verificar a mano los escenarios de «Formulario de solicitud de acceso»: confirmación distinta, RUC desconocido con foco en el campo, solicitud enviada, y 409 `solicitud_pendiente`.
- [x] 6.5 Crear `src/app/admin/solicitudes-acceso/page.tsx` (design.md D12). Verificar a mano los escenarios de «Bandeja de solicitudes del Admin»: aprobar, rechazar sin motivo, rechazar con motivo, lista vacía y fechas en `dd/mm/aaaa`.
- [ ] 6.6 Revisar accesibilidad y adaptación: recorrer las páginas nuevas solo con teclado, con un lector de pantalla para los errores (`role="alert"`, `aria-invalid`) y a 320 px de ancho sin desplazamiento horizontal. Verificar además con `npm run build` sin errores ni advertencias de tipos.

## 7. Primer Admin y demo

- [ ] 7.1 Crear `backend/scripts/crear-admin.js` (design.md D10). Verificar en local que crea el usuario y su perfil `admin` y que con un correo ya usado falla con un mensaje claro. Con confirmación de la usuaria, ejecutarlo en el remoto (tarea 5.5 de `crear-tablas-acceso`).
- [x] 7.2 Demo de punta a punta: backend en `:4000` y el frontend de la rama `frontend` (con el grupo 6 hecho) en un `git worktree` con `NEXT_PUBLIC_API_URL=http://localhost:4000`. Verificar el recorrido completo: una EPS solicita acceso, intenta ingresar (aviso de pendiente), el Admin aprueba, la EPS ingresa y llega a `/eps/tramites`, cierra sesión; además, clave incorrecta, cookies `HttpOnly` en DevTools y ningún token en `localStorage`.
- [x] 7.3 Ejecutar `npm test`, `openspec validate implementar-sesion-y-registro --strict` y `git grep` de claves (`service_role`, `eyJ`, `sb_secret`) en la rama. Verificar que todo pasa y que no hay secretos versionados.

## 8. Modo de demostración

- [x] 8.1 Crear `backend/scripts/crear-cuentas-demo.js` y el script `npm run crear-cuentas-demo` (design.md D15), y agregar `CLAVE_DEMO=` a `backend/.env.example`. Verificar que dos ejecuciones seguidas en local terminan sin errores y que la base tiene los 4 perfiles demo con su rol, área y EPS.
- [x] 8.2 En la rama `frontend`, crear `src/utilidades/cuentas-demo.ts`, agregar a `/ingreso` el selector «Cuenta de demostración» y el botón «Registrarse», quitar el enlace «solicitar acceso» y agregar `NEXT_PUBLIC_MODO_DEMO=false` y `NEXT_PUBLIC_CLAVE_DEMO=` a `frontend/.env.example`. Verificar con `npm run build` sin errores de tipos.
- [x] 8.3 Activar el modo demo en `backend/.env` y `frontend/.env.local` (no versionados), ejecutar `npm run crear-cuentas-demo` y verificar en el navegador los escenarios de «Modo de demostración en el ingreso» y «Acceso al registro desde el ingreso»: ingreso con un clic con las 4 cuentas, cambio de cuenta, «Registrarse» y modo apagado sin selector. Verificar con `git grep` que ninguna clave demo está versionada.
- [ ] 8.4 Con confirmación de la usuaria, crear las cuentas demo en el proyecto remoto y verificarlas con una consulta de solo lectura.
- [x] 8.5 Hacer discreto el selector de demostración y pulir la vista de ingreso (design.md D15, «Presentación discreta» y «Detalles de la vista de ingreso»): `<details>` cerrado al pie, «Ingresando…» durante el envío y «Registrarse» como acción secundaria con su texto. Verificar con `npm run build` y en el navegador los escenarios «Selector discreto» y «Envío en curso», el ingreso con un clic y la vista a 320 px sin desbordes.
