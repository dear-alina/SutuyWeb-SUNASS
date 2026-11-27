## Purpose

Define la interfaz interna entre el backend y el copiloto. Cubre cómo se consulta, cómo se responde con citas a los documentos, qué ocurre cuando no hay evidencia o el servicio falla, y cómo se protege el acceso. Así dos personas pueden desarrollar cada lado por separado.

## ADDED Requirements

### Requirement: Acceso exclusivo del backend
El copiloto SHALL aceptar peticiones solo del backend, autenticadas con `Authorization: Bearer <token de servicio>`. El copiloto SHALL NOT exponerse al navegador. Su acceso a la base de datos SHALL limitarse a sus propias tablas y a la lectura de los documentos que necesita, sin privilegios que salten las políticas de la base.

#### Scenario: Petición sin token de servicio
- **WHEN** llega una petición sin token o con un token incorrecto
- **THEN** el copiloto responde 401 en formato problem+json y no procesa la consulta

### Requirement: Campos JSON en camelCase
Todas las claves JSON que el copiloto recibe y devuelve SHALL estar en camelCase, incluido su documento OpenAPI, aunque internamente use otra convención. El copiloto SHALL aceptar peticiones con claves en camelCase.

#### Scenario: Respuesta del copiloto
- **WHEN** se revisa cualquier respuesta del copiloto o su documento OpenAPI, salvo los campos de RFC 9457
- **THEN** todas las claves cumplen la expresión `^[a-z][a-zA-Z0-9]*$`

### Requirement: Consulta limitada a documentos autorizados
`POST /v1/consultas` SHALL recibir `consultaId`, `expedienteId`, `pregunta`, `documentoIds` (los documentos que el usuario puede ver, según el backend) y, opcionalmente, `maximoCitas`. El copiloto SHALL buscar evidencia únicamente en los documentos de `documentoIds`. Antes de consultar, el backend SHALL verificar que el usuario puede ver el expediente y SHALL calcular la lista según el `nivelAcceso` de cada documento.

#### Scenario: Documento no autorizado
- **WHEN** un expediente tiene un documento `interno` y quien consulta es un usuario de la EPS
- **THEN** el backend no incluye ese documento en `documentoIds` y ninguna cita de la respuesta lo referencia

### Requirement: Respuesta completa con citas
El copiloto SHALL devolver la respuesta completa en una sola respuesta HTTP, sin envío progresivo. La respuesta SHALL contener:
- `consultaId`;
- `estado` (`respondida` o `sin_evidencia`);
- `respuesta` (texto o `null`);
- `citas`: una lista de objetos con `documentoId`, `codigoDocumento`, `pagina`, `fragmento` y `puntaje`;
- `modelo` (`nombre`, `version`);
- `generadoEn` (instante en UTC);
- `duracionMs`.

Una respuesta con `estado: "respondida"` SHALL incluir al menos una cita.

#### Scenario: Respuesta con evidencia
- **WHEN** la pregunta puede responderse con los documentos autorizados
- **THEN** el copiloto responde 200 con `estado: "respondida"`, un texto en `respuesta` y al menos una cita con documento y página

### Requirement: Sin evidencia suficiente
Cuando no encuentre evidencia suficiente, el copiloto SHALL responder 200 con `estado: "sin_evidencia"`, `respuesta: null` y `citas: []`. El backend SHALL informar al usuario que no se encontró evidencia en los documentos del expediente y SHALL NOT mostrar ningún texto generado sin citas. El backend SHALL tratar como `sin_evidencia` una respuesta `respondida` que llegue sin citas.

#### Scenario: Pregunta sin respaldo
- **WHEN** ningún documento autorizado contiene información para responder
- **THEN** el copiloto responde `estado: "sin_evidencia"` y el backend devuelve al frontend ese estado sin texto de respuesta

#### Scenario: Respuesta sin citas
- **WHEN** el copiloto devuelve `estado: "respondida"` con `citas` vacía
- **THEN** el backend la entrega al frontend como `sin_evidencia`

### Requirement: Fallos del servicio
El copiloto SHALL informar sus errores en formato problem+json: 503 con `codigo: "copiloto_no_disponible"` cuando no puede atender, y 409 con `codigo: "indexacion_pendiente"` cuando algún documento solicitado aún no está indexado. El backend SHALL aplicar un tiempo máximo de espera de 30 segundos y SHALL NOT reintentar automáticamente las consultas. Ante un fallo, el frontend SHALL recibir del backend 503 (`copiloto_no_disponible`) o 504 (`copiloto_tiempo_agotado`). Las demás funciones del sistema SHALL seguir operando.

#### Scenario: Copiloto caído
- **WHEN** el copiloto no responde dentro del tiempo máximo
- **THEN** el backend responde 504 con `codigo: "copiloto_tiempo_agotado"` y la consulta de expedientes sigue funcionando

### Requirement: Estado del servicio
El copiloto SHALL exponer `GET /salud`. Esta ruta SHALL responder 200 solo cuando el servicio puede atender consultas.

#### Scenario: Verificación de salud
- **WHEN** el backend consulta `GET /salud` con el copiloto listo
- **THEN** recibe 200

### Requirement: Contrato publicado en OpenAPI
El copiloto SHALL publicar un documento OpenAPI generado a partir de sus propios modelos y versionado en el repositorio. Los ejemplos de petición y respuesta del contrato SHALL validarse automáticamente en ambos lados (backend y copiloto). Un cambio incompatible SHALL requerir un cambio de OpenSpec aprobado por los responsables del backend y del copiloto.

#### Scenario: Ejemplo compartido inválido
- **WHEN** un ejemplo de respuesta del contrato deja de cumplir el esquema de cualquiera de los dos lados
- **THEN** las pruebas de contrato fallan
