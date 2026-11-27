## Purpose

Define el comportamiento que el frontend puede esperar de la API HTTP del backend: forma de los datos, validación, errores, listados, sesión y permisos. Así ambas partes se integran sin depender de nombres internos.

## ADDED Requirements

### Requirement: Rutas versionadas y nombres de los campos
La API SHALL publicarse bajo el prefijo `/api/v1`. Las rutas SHALL usar recursos en plural, con segmentos en minúsculas separados por guion (`/api/v1/solicitudes-acceso`). Los parámetros de ruta, los parámetros de consulta y todas las claves JSON de peticiones y respuestas SHALL estar en camelCase, en español, sin tildes ni ñ. Las únicas excepciones SHALL ser los campos definidos por un estándar (por ejemplo, los de RFC 9457).

#### Scenario: Clave en otro formato
- **WHEN** se revisa cualquier respuesta JSON de la API, salvo los campos de RFC 9457
- **THEN** todas sus claves, también las anidadas, cumplen la expresión `^[a-z][a-zA-Z0-9]*$`

### Requirement: Identificadores y códigos diferenciados
Cada recurso SHALL exponer su identificador técnico como `<entidad>Id` (UUID en texto) y, si tiene un código legible, como `codigo<Entidad>` (por ejemplo, `expedienteId` y `codigoExpediente` = `UFI-2026-0001`; `codigoEps` = `EPS02`). Las rutas de un recurso individual SHALL usar el identificador técnico.

#### Scenario: Obtener un expediente
- **WHEN** el frontend pide `GET /api/v1/expedientes/{expedienteId}` con un UUID válido de un expediente visible
- **THEN** la respuesta incluye `expedienteId` y `codigoExpediente` como campos separados

### Requirement: Campos obligatorios, opcionales y anulables
Toda respuesta SHALL incluir todas las claves de su esquema. Cuando no exista un valor, la clave SHALL ir con `null` y no omitirse. Las claves que pueden faltar SHALL existir solo en los cuerpos de petición que lo declaren.

#### Scenario: Hito en curso
- **WHEN** se devuelve un hito que aún no termina
- **THEN** la clave `finalizadoEn` está presente con valor `null`

### Requirement: Fechas, instantes y unidades
- Las fechas civiles SHALL viajar como `AAAA-MM-DD` y se interpretan en la zona `America/Lima`.
- Los instantes SHALL viajar en ISO 8601 en UTC con sufijo `Z`.
- Los montos en soles SHALL viajar como cadena decimal con dos decimales.
- Los porcentajes SHALL ir de 0 a 100.
- Las duraciones y los plazos SHALL ser enteros, con la unidad en el nombre del campo (por ejemplo, `plazoMaximoDiasHabiles`, `duracionMs`).

#### Scenario: Monto y fecha
- **WHEN** se devuelve un expediente con monto solicitado y fecha de inicio
- **THEN** el monto aparece como `"1250000.00"` y la fecha como `"2026-11-27"`

### Requirement: Códigos de catálogo estables
Los campos de catálogo (`estado`, `tipoProcedimiento`, `area`, `rol`, `nivelAcceso`, `canalRecepcion`, `resultado`) SHALL usar los mismos códigos en minúsculas que el dataset oficial, sin traducirlos (por ejemplo, `en_tramite` o `uso_excepcional_fondo`). Un valor que no pertenezca al catálogo SHALL rechazarse como error de validación.

#### Scenario: Filtro con un estado desconocido
- **WHEN** el frontend pide `GET /api/v1/expedientes?estado=enTramite`
- **THEN** la API responde 422 y en `errores` indica el campo `estado`

### Requirement: Validación de entradas
La API SHALL validar el cuerpo, los parámetros de ruta y los parámetros de consulta antes de ejecutar cualquier operación. Una petición con campos desconocidos o con valores inválidos SHALL rechazarse sin efectos.

#### Scenario: Campo no permitido
- **WHEN** una petición incluye un campo que el esquema no define
- **THEN** la API responde 422 y no modifica ningún dato

### Requirement: Formato de errores
Todo error SHALL responderse con `Content-Type: application/problem+json`. La respuesta SHALL incluir los campos de RFC 9457 (`type`, `title`, `status`, `detail`, `instance`), un `codigo` estable en minúsculas con guion bajo y un `trazaId`. Cuando hay errores de campo, SHALL incluir `errores`: una lista de objetos con `campo` y `mensaje`. Los códigos HTTP SHALL usarse así:
- 400: cuerpo mal formado.
- 401: sin sesión o sesión vencida.
- 403: autenticado sin permiso para la acción.
- 404: el recurso no existe o el usuario no puede verlo.
- 409: transición inválida o conflicto de estado (por ejemplo, `solicitud_resuelta`).
- 429: demasiados intentos (`demasiados_intentos`).
- 422: validación fallida.
- 503 o 504: servicio dependiente no disponible o sin respuesta a tiempo.

#### Scenario: Error de validación
- **WHEN** una petición tiene un campo obligatorio vacío
- **THEN** la API responde 422 con `codigo: "validacion_fallida"` y un elemento de `errores` que nombra ese campo

### Requirement: Listados paginados
Los listados SHALL responder con un objeto que tenga `datos` (la lista) y `paginacion` (`pagina`, `tamanoPagina`, `total`, `totalPaginas`). SHALL aceptar los parámetros `pagina` (desde 1), `tamanoPagina` (por defecto 20, máximo 100) y `orden` (nombre de campo; con prefijo `-` es descendente), además de los filtros declarados para cada recurso. Un recurso individual SHALL devolverse como objeto, sin envoltorio.

#### Scenario: Tamaño de página excesivo
- **WHEN** el frontend pide `tamanoPagina=500`
- **THEN** la API responde 422 indicando el campo `tamanoPagina`

#### Scenario: Segunda página
- **WHEN** hay 37 expedientes visibles y se pide `pagina=2&tamanoPagina=20`
- **THEN** `datos` contiene 17 elementos y `paginacion.totalPaginas` es 2

### Requirement: Sesión gestionada por el backend
El inicio de sesión SHALL pasar siempre por el backend:
- `POST /api/v1/sesiones` acepta `institucion` (`sunass` o `eps`, la pestaña de la pantalla de ingreso), `usuario` (el correo), `clave` y, cuando `institucion` es `eps`, `ruc` (11 dígitos). Con `eps`, el perfil SHALL ser de rol `eps` y su EPS SHALL tener ese `ruc`; con `sunass`, el perfil SHALL ser de rol `sunass` o `admin`.
- `DELETE /api/v1/sesiones/actual` cierra la sesión.
- `GET /api/v1/perfil` devuelve el usuario autenticado con `usuarioId`, `nombre`, `cargo`, `correo`, `rol`, `area`, `codigoEps`, `nombreEps` y `proveedor` de acceso (`correo` o `microsoft`).

La sesión SHALL viajar en una cookie `HttpOnly`, `Secure` y `SameSite=Lax`. El frontend SHALL NOT recibir ni guardar tokens ni claves de Supabase. Los métodos que modifican datos SHALL exigir protección contra CSRF. Los intentos de inicio de sesión SHALL limitarse; al superar el límite, la API SHALL responder 429 con `codigo: "demasiados_intentos"`. Las rutas `GET /api/v1/sesiones/microsoft` y `GET /api/v1/sesiones/microsoft/retorno` SHALL quedar reservadas para el acceso con Microsoft Entra ID; mientras no esté configurado, SHALL responder 503 con `codigo: "proveedor_no_configurado"`.

#### Scenario: Inicio de sesión correcto
- **WHEN** una persona de una EPS con acceso aprobado envía `institucion: "eps"`, el RUC de su EPS, su correo y su clave
- **THEN** la API responde con su perfil, establece la cookie de sesión y el cuerpo no contiene tokens

#### Scenario: Credenciales inválidas
- **WHEN** el correo o la clave no son válidos, el RUC no es el de su EPS o la pestaña no corresponde a su rol
- **THEN** la API responde 401 con `codigo: "credenciales_invalidas"` sin indicar qué falló

#### Scenario: Acceso aún no aprobado
- **WHEN** una persona cuya solicitud de acceso está pendiente intenta ingresar con su correo y su clave
- **THEN** la API responde 403 con `codigo: "acceso_pendiente"`

#### Scenario: Petición sin sesión
- **WHEN** se pide `GET /api/v1/expedientes` sin cookie de sesión o con la sesión vencida
- **THEN** la API responde 401

### Requirement: Solicitudes de acceso de las EPS
`POST /api/v1/solicitudes-acceso` SHALL ser público y SHALL recibir `ruc`, `nombre`, `correo`, `clave` y, opcionalmente, `cargo`. SHALL responder 201 con `solicitudAccesoId`, `estado: "pendiente"` y `solicitadoEn`, sin crear perfil. SHALL responder 422 en el campo `ruc` si el RUC no pertenece a una EPS del catálogo, 409 con `codigo: "solicitud_pendiente"` si el correo ya tiene una solicitud pendiente y 409 con `codigo: "correo_registrado"` si ya tiene cuenta. Solo el rol `admin` SHALL poder listar las solicitudes (`GET /api/v1/solicitudes-acceso`, paginado y filtrable por `estado`), aprobarlas (`POST /api/v1/solicitudes-acceso/{solicitudAccesoId}/aprobacion`) o rechazarlas con `motivoRechazo` (`POST /api/v1/solicitudes-acceso/{solicitudAccesoId}/rechazo`). Resolver una solicitud que ya no está pendiente SHALL responderse con 409 y `codigo: "solicitud_resuelta"`.

#### Scenario: Registro de una EPS
- **WHEN** se envía una solicitud con el RUC de una EPS del catálogo y un correo nuevo
- **THEN** la API responde 201 con `estado: "pendiente"` y esa persona no puede ingresar hasta que el Admin la apruebe

#### Scenario: Aprobación
- **WHEN** el Admin aprueba una solicitud pendiente
- **THEN** la persona puede ingresar con `institucion: "eps"`, el RUC de su EPS, su correo y su clave

#### Scenario: Solicitud ya resuelta
- **WHEN** el Admin intenta aprobar una solicitud ya rechazada
- **THEN** la API responde 409 con `codigo: "solicitud_resuelta"`

### Requirement: Permisos calculados por el backend
El backend SHALL aplicar los permisos en cada petición según el perfil del usuario.
- Un usuario de una EPS SHALL ver solo los expedientes de su EPS.
- Un recurso que el usuario no puede ver SHALL responderse como 404.
- Una acción no permitida sobre un recurso visible SHALL responderse como 403.
- Las respuestas SHALL incluir los permisos que necesite el frontend, ya calculados (por ejemplo, `permisos.puedeRealizarPaso`), para que el frontend no repita las reglas.

#### Scenario: Expediente de otra EPS
- **WHEN** un usuario de EPS02 pide un expediente de EPS05
- **THEN** la API responde 404

#### Scenario: Listado filtrado por EPS
- **WHEN** un usuario de EPS02 lista expedientes sin filtros
- **THEN** todos los elementos de `datos` tienen `eps.codigoEps` igual a `"EPS02"`

### Requirement: Contrato publicado en OpenAPI
El backend SHALL publicar su contrato como un documento OpenAPI 3.1 generado a partir de los mismos esquemas que validan las peticiones. El documento SHALL versionarse en el repositorio y SHALL coincidir siempre con el código. Un cambio incompatible en el contrato SHALL requerir un cambio de OpenSpec aprobado por el responsable del frontend.

#### Scenario: Esquema desactualizado
- **WHEN** se modifica un esquema de validación sin regenerar el documento OpenAPI versionado
- **THEN** la verificación automática del repositorio falla
