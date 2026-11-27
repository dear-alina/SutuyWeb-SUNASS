## Purpose

Define cómo el backend inicia y cierra sesiones, entrega el perfil del usuario autenticado y gestiona las solicitudes de acceso de las EPS, de modo que el frontend pueda ingresar y registrar usuarios sin tocar Supabase ni guardar tokens.

## ADDED Requirements

### Requirement: Inicio de sesión con correo y clave
`POST /api/v1/sesiones` SHALL recibir `institucion` (`sunass` o `eps`), `usuario` (el correo), `clave` y, cuando `institucion` es `eps`, `ruc`. El backend SHALL verificar las credenciales con Supabase Auth y SHALL exigir un perfil activo. Además:
- con `institucion = eps`, el perfil SHALL tener `rol = eps` y su EPS SHALL tener el `ruc` recibido;
- con `institucion = sunass`, el perfil SHALL tener `rol` `sunass` o `admin`.

Si cualquiera de estas comprobaciones falla, el backend SHALL responder 401 con `codigo: "credenciales_invalidas"` sin indicar cuál falló. Si la persona no tiene perfil pero sí una solicitud de acceso pendiente, SHALL responder 403 con `codigo: "acceso_pendiente"`. Con éxito, SHALL responder 200 con el perfil y SHALL establecer la sesión.

#### Scenario: Ingreso correcto de una persona de Sunass
- **WHEN** una persona con perfil `sunass` activo envía `institucion: "sunass"`, su correo y su clave
- **THEN** la API responde 200 con su perfil y establece la sesión

#### Scenario: Ingreso correcto de una EPS
- **WHEN** una persona con perfil `eps` activo de la EPS con RUC `99000000002` envía `institucion: "eps"`, ese RUC, su correo y su clave
- **THEN** la API responde 200 con su perfil, que incluye `codigoEps: "EPS02"`

#### Scenario: RUC que no corresponde
- **WHEN** una persona con perfil `eps` envía credenciales válidas con el RUC de otra EPS
- **THEN** la API responde 401 con `codigo: "credenciales_invalidas"`

#### Scenario: Pestaña equivocada
- **WHEN** una persona con perfil `eps` envía credenciales válidas con `institucion: "sunass"`
- **THEN** la API responde 401 con `codigo: "credenciales_invalidas"`

#### Scenario: Clave incorrecta
- **WHEN** el correo existe pero la clave no es correcta
- **THEN** la API responde 401 con `codigo: "credenciales_invalidas"` y no establece la sesión

#### Scenario: Solicitud aún pendiente
- **WHEN** una persona cuya solicitud de acceso está pendiente envía su correo y su clave
- **THEN** la API responde 403 con `codigo: "acceso_pendiente"`

#### Scenario: Falta el RUC en la pestaña de la EPS
- **WHEN** se envía `institucion: "eps"` sin `ruc`
- **THEN** la API responde 422 con `codigo: "validacion_fallida"` y un error en el campo `ruc`

### Requirement: Sesión en cookies protegidas
La sesión SHALL viajar solo en cookies `HttpOnly`, `Secure` y `SameSite=Lax`. Ninguna respuesta SHALL incluir tokens de Supabase ni claves. El backend SHALL renovar la sesión automáticamente mientras sea válida. Una petición sin sesión, con la sesión vencida sin posibilidad de renovación o de un usuario cuyo perfil ya no está activo SHALL responderse con 401.

#### Scenario: Cookies sin tokens en el cuerpo
- **WHEN** el inicio de sesión es correcto
- **THEN** la respuesta fija cookies `HttpOnly` y el cuerpo no contiene `access_token`, `refresh_token` ni otra clave

#### Scenario: Petición sin cookie
- **WHEN** se pide `GET /api/v1/perfil` sin cookie de sesión
- **THEN** la API responde 401

#### Scenario: Perfil desactivado
- **WHEN** una persona con sesión válida tiene su perfil con `activo = false`
- **THEN** su siguiente petición recibe 401 y la sesión se borra

### Requirement: Perfil y cierre de sesión
`GET /api/v1/perfil` SHALL devolver el perfil del usuario autenticado con `usuarioId`, `nombre`, `cargo`, `correo`, `rol`, `area`, `codigoEps`, `nombreEps` y `proveedor`; los campos sin valor SHALL ir con `null`. `DELETE /api/v1/sesiones/actual` SHALL cerrar la sesión, borrar las cookies y responder 204.

#### Scenario: Perfil de un Admin
- **WHEN** un Admin autenticado pide su perfil
- **THEN** recibe `rol: "admin"`, `area: null` y `codigoEps: null`

#### Scenario: Cierre de sesión
- **WHEN** un usuario autenticado cierra sesión y luego pide su perfil
- **THEN** el cierre responde 204 y el perfil responde 401

### Requirement: Solicitud de acceso de una EPS
`POST /api/v1/solicitudes-acceso` SHALL ser público y SHALL recibir `ruc`, `nombre`, `correo`, `clave` y, opcionalmente, `cargo`. El backend SHALL:
- rechazar con 422 en el campo `ruc` un RUC que no pertenezca a ninguna EPS del catálogo;
- rechazar con 409 y `codigo: "solicitud_pendiente"` un correo que ya tiene una solicitud pendiente;
- rechazar con 409 y `codigo: "correo_registrado"` un correo que ya tiene cuenta;
- crear la cuenta en Supabase Auth y la solicitud `pendiente` sin crear perfil, de modo que la cuenta no pueda ingresar hasta que la aprueben;
- no dejar cuentas sin solicitud si falla el registro.

Con éxito SHALL responder 201 con `solicitudAccesoId`, `estado: "pendiente"` y `solicitadoEn`.

#### Scenario: Registro correcto
- **WHEN** se envía una solicitud con el RUC de `EPS02`, nombre, correo nuevo y clave
- **THEN** la API responde 201 con `estado: "pendiente"` y la cuenta no puede ingresar todavía

#### Scenario: RUC desconocido
- **WHEN** se envía una solicitud con un RUC que no está en el catálogo
- **THEN** la API responde 422 con un error en el campo `ruc` y no crea ninguna cuenta

#### Scenario: Solicitud duplicada
- **WHEN** se envía una segunda solicitud con un correo que ya tiene una pendiente
- **THEN** la API responde 409 con `codigo: "solicitud_pendiente"`

### Requirement: Resolución de solicitudes por el Admin
Solo un usuario con `rol = admin` SHALL poder:
- listar las solicitudes con `GET /api/v1/solicitudes-acceso`, paginadas y filtrables por `estado`;
- aprobar con `POST /api/v1/solicitudes-acceso/{solicitudAccesoId}/aprobacion`, que SHALL crear el perfil `eps` activo con área `ep` y la EPS de la solicitud, y marcarla `aprobada` con quién y cuándo, todo en una sola operación;
- rechazar con `POST /api/v1/solicitudes-acceso/{solicitudAccesoId}/rechazo`, que SHALL exigir `motivoRechazo`, marcar la solicitud `rechazada` con quién y cuándo, y eliminar la cuenta de Supabase Auth.

Resolver una solicitud que ya no está pendiente SHALL responderse con 409 y `codigo: "solicitud_resuelta"`. Un usuario autenticado sin rol `admin` SHALL recibir 403.

#### Scenario: Aprobación e ingreso
- **WHEN** el Admin aprueba una solicitud pendiente y luego esa persona ingresa con `institucion: "eps"`, el RUC de su EPS, su correo y su clave
- **THEN** la aprobación responde 200 y el ingreso responde 200 con `rol: "eps"`

#### Scenario: Rechazo
- **WHEN** el Admin rechaza una solicitud con un motivo
- **THEN** la solicitud queda `rechazada` con ese motivo y la cuenta ya no puede ingresar

#### Scenario: Rechazo sin motivo
- **WHEN** el Admin intenta rechazar sin `motivoRechazo`
- **THEN** la API responde 422 en el campo `motivoRechazo`

#### Scenario: Solicitud ya resuelta
- **WHEN** el Admin intenta aprobar una solicitud ya aprobada
- **THEN** la API responde 409 con `codigo: "solicitud_resuelta"`

#### Scenario: Una EPS intenta listar solicitudes
- **WHEN** un usuario `eps` autenticado pide `GET /api/v1/solicitudes-acceso`
- **THEN** la API responde 403

### Requirement: Protección contra abuso y CSRF
El backend SHALL limitar los intentos de inicio de sesión y de registro; al superar el límite SHALL responder 429 con `codigo: "demasiados_intentos"`. Toda petición que modifique datos SHALL venir de un origen permitido y con cuerpo `application/json`; si no, SHALL rechazarse con 403 sin efectos.

#### Scenario: Demasiados intentos
- **WHEN** se superan los intentos permitidos de inicio de sesión desde la misma IP en la ventana de tiempo
- **THEN** la API responde 429 con `codigo: "demasiados_intentos"`

#### Scenario: Origen no permitido
- **WHEN** llega un `POST /api/v1/sesiones` con un encabezado `Origin` que no está en la lista permitida
- **THEN** la API responde 403 y no inicia sesión

### Requirement: Validación y errores uniformes
Toda entrada SHALL validarse antes de ejecutar la operación; un campo desconocido o un valor inválido SHALL responderse con 422, `codigo: "validacion_fallida"` y la lista `errores` con `campo` y `mensaje`. Todo error SHALL responderse en `application/problem+json` con `type`, `title`, `status`, `detail`, `instance`, `codigo` y `trazaId`. Las rutas `GET /api/v1/sesiones/microsoft` y `GET /api/v1/sesiones/microsoft/retorno` SHALL responder 503 con `codigo: "proveedor_no_configurado"` mientras Microsoft Entra ID no esté configurado.

#### Scenario: Campo desconocido
- **WHEN** el inicio de sesión incluye un campo `esAdmin`
- **THEN** la API responde 422 con `codigo: "validacion_fallida"`

#### Scenario: Microsoft no configurado
- **WHEN** se pide `GET /api/v1/sesiones/microsoft`
- **THEN** la API responde 503 con `codigo: "proveedor_no_configurado"`

### Requirement: Contrato publicado en OpenAPI
El backend SHALL generar `backend/openapi.json` (OpenAPI 3.1) desde los mismos esquemas Zod que validan las peticiones, y el documento versionado SHALL coincidir con el código.

#### Scenario: Documento al día
- **WHEN** se regenera `backend/openapi.json` sin haber cambiado los esquemas
- **THEN** el archivo no cambia

### Requirement: Formulario de solicitud de acceso
La página `/solicitar-acceso` SHALL pedir RUC de la empresa, nombre completo, cargo (opcional), correo, clave y confirmación de clave. Antes de enviar SHALL validar que el RUC tenga 11 dígitos, que el correo tenga formato válido, que la clave tenga al menos 8 caracteres y que la confirmación coincida; los errores SHALL mostrarse junto a su campo y anunciarse a lectores de pantalla. Al enviar SHALL llamar a `POST /api/v1/solicitudes-acceso` sin la confirmación, SHALL mostrar en su campo los errores de `errores` que devuelva la API y SHALL mostrar un mensaje claro para `solicitud_pendiente` y `correo_registrado`. Con 201 SHALL mostrar que la solicitud quedó pendiente de aprobación y un enlace a `/ingreso`.

#### Scenario: Confirmación distinta
- **WHEN** la clave y su confirmación no coinciden
- **THEN** la página no envía la solicitud y muestra el error en el campo de confirmación

#### Scenario: Solicitud enviada
- **WHEN** la persona completa el formulario con datos válidos y la API responde 201
- **THEN** la página muestra que la solicitud está pendiente de aprobación y ofrece volver a `/ingreso`

#### Scenario: RUC desconocido
- **WHEN** la API responde 422 con un error en el campo `ruc`
- **THEN** el mensaje aparece junto al campo RUC y el foco pasa a ese campo

### Requirement: Bandeja de solicitudes del Admin
La página `/admin/solicitudes-acceso` SHALL listar las solicitudes pendientes con nombre, cargo, correo, EPS y fecha de solicitud en `dd/mm/aaaa`, paginadas. Cada solicitud SHALL ofrecer «Aprobar» y «Rechazar»; «Rechazar» SHALL exigir un motivo antes de enviar. Después de aprobar o rechazar, la lista SHALL actualizarse y SHALL anunciarse el resultado. Si la API responde `solicitud_resuelta`, SHALL mostrarse el mensaje y actualizarse la lista.

#### Scenario: Aprobar una solicitud
- **WHEN** el Admin pulsa «Aprobar» en una solicitud pendiente
- **THEN** la solicitud desaparece de la lista de pendientes y se anuncia que fue aprobada

#### Scenario: Rechazar sin motivo
- **WHEN** el Admin intenta rechazar sin escribir un motivo
- **THEN** la página no envía el rechazo y muestra el error en el campo del motivo

#### Scenario: Sin pendientes
- **WHEN** no hay solicitudes pendientes
- **THEN** la página muestra que no hay solicitudes por revisar

### Requirement: Rutas protegidas por rol
Las secciones `eps/`, `sunass/` y `admin/` del frontend SHALL consultar `GET /api/v1/perfil` antes de mostrar su contenido. Sin sesión (401) SHALL llevar a `/ingreso`. Si el rol del perfil no corresponde a la sección (`eps` → `eps/`, `sunass` → `sunass/`, `admin` → `admin/`), SHALL llevar a la ruta de inicio de ese rol. Mientras consulta SHALL mostrar un estado de carga. Las páginas de inicio `/eps/tramites` y `/sunass/inicio` SHALL existir, aunque su contenido sea mínimo.

#### Scenario: Sin sesión
- **WHEN** alguien sin sesión abre `/sunass/inicio`
- **THEN** el frontend lo lleva a `/ingreso`

#### Scenario: Rol equivocado
- **WHEN** un usuario `eps` abre `/admin/solicitudes-acceso`
- **THEN** el frontend lo lleva a `/eps/tramites`

#### Scenario: Ingreso de una EPS
- **WHEN** una EPS aprobada ingresa correctamente
- **THEN** llega a `/eps/tramites`, que muestra su nombre y su EPS

### Requirement: Cierre de sesión visible
Toda vista autenticada SHALL mostrar el nombre y el rol del usuario y un botón «Cerrar sesión» accesible con teclado. Al pulsarlo, el frontend SHALL llamar a `DELETE /api/v1/sesiones/actual` y SHALL llevar a `/ingreso` aunque la llamada falle.

#### Scenario: Cerrar sesión
- **WHEN** un usuario autenticado pulsa «Cerrar sesión»
- **THEN** llega a `/ingreso` y, si vuelve a abrir una sección protegida, el frontend lo lleva otra vez a `/ingreso`

### Requirement: Acceso al registro desde el ingreso
La pantalla `/ingreso` SHALL mostrar, debajo de «Ingresar» y en ambas pestañas, un botón «Registrarse» que lleve a `/solicitar-acceso`.

#### Scenario: Ir al registro
- **WHEN** una persona pulsa «Registrarse» en la pantalla de ingreso
- **THEN** llega al formulario de solicitud de acceso

### Requirement: Modo de demostración en el ingreso
Cuando el modo de demostración esté activo y haya una clave de demostración configurada en el entorno local, la pantalla `/ingreso` SHALL rellenar el formulario con la primera cuenta ficticia y SHALL ofrecer un selector «Cuenta de demostración» con las cuentas ficticias (Admin, especialista de Sunass y EPS) dentro de un desplegable discreto al pie de la pantalla, cerrado por defecto, de modo que la vista se parezca a la de un entorno real. Elegir una cuenta SHALL rellenar la pestaña, el RUC, el usuario y la clave, de modo que baste con pulsar «Ingresar». Sin el modo activo, el formulario SHALL aparecer vacío y sin selector. La clave de demostración SHALL NOT versionarse en el repositorio; las cuentas demo SHALL poder crearse o actualizarse con un script que la lee del entorno.

#### Scenario: Ingreso con un clic
- **WHEN** el modo de demostración está activo y la persona abre `/ingreso` y pulsa «Ingresar» sin escribir nada
- **THEN** ingresa con la primera cuenta de demostración y llega a la sección de su rol

#### Scenario: Cambiar de cuenta de demostración
- **WHEN** la persona abre el desplegable de cuentas de demostración y elige la cuenta de una EPS
- **THEN** el formulario cambia a la pestaña «Empresa prestadora» con el RUC, el usuario y la clave de esa cuenta

#### Scenario: Modo de demostración apagado
- **WHEN** el modo de demostración no está activo
- **THEN** no aparece el desplegable de cuentas y los campos están vacíos

#### Scenario: Selector discreto
- **WHEN** el modo de demostración está activo y se abre `/ingreso`
- **THEN** el formulario se ve como el de un entorno real y el selector de cuentas solo aparece al abrir el enlace «Cuentas de demostración» del pie

### Requirement: Estado del envío en el ingreso
Mientras se envía el inicio de sesión, el botón «Ingresar» SHALL deshabilitarse y SHALL indicar «Ingresando…», para evitar envíos dobles. Si falla, SHALL volver a habilitarse y conservar lo ingresado.

#### Scenario: Envío en curso
- **WHEN** la persona pulsa «Ingresar» y la API aún no responde
- **THEN** el botón muestra «Ingresando…» y no admite otro envío
