## Purpose

Define la interfaz interna entre el backend y el copiloto. Cubre cómo se indexan los documentos de un expediente, cómo se evalúan sus requisitos y se responden preguntas con citas a los documentos autorizados, qué ocurre cuando no hay evidencia o el servicio falla, y cómo se protege el acceso. Así dos personas pueden desarrollar cada lado por separado.

## ADDED Requirements

### Requirement: Acceso exclusivo del backend
El copiloto SHALL aceptar peticiones solo del backend, autenticadas con `Authorization: Bearer <token de servicio>`. Cada petición SHALL incluir además la cabecera `X-Rol` con el rol del usuario que originó la acción, calculado por el backend. El copiloto SHALL atender solo los roles `sunass` y `admin`. El copiloto SHALL NOT exponerse al navegador. Si accede a la base de datos, su acceso SHALL limitarse a sus propias tablas y a la lectura de los documentos que necesita, sin privilegios que salten las políticas de la base.

#### Scenario: Petición sin token de servicio
- **WHEN** llega una petición sin token o con un token incorrecto
- **THEN** el copiloto responde 401 en formato problem+json y no procesa la petición

#### Scenario: Rol no permitido
- **WHEN** llega una petición con token válido y `X-Rol: eps`
- **THEN** el copiloto responde 403 con `codigo: "acceso_denegado"` y no procesa la petición

### Requirement: Campos JSON en camelCase
Todas las claves JSON que el copiloto recibe y devuelve SHALL estar en camelCase, incluido su documento OpenAPI, aunque internamente use otra convención. Los parámetros de ruta y de consulta SHALL estar en camelCase. Los valores de catálogo SHALL conservar el estilo del dataset (`restringido_partes`, `uso_excepcional_fondo`).

#### Scenario: Respuesta del copiloto
- **WHEN** se revisa cualquier respuesta del copiloto o su documento OpenAPI, salvo los campos de RFC 9457
- **THEN** todas las claves cumplen la expresión `^[a-z][a-zA-Z0-9]*$`

### Requirement: Indexación de los documentos de un expediente
`POST /v1/expedientes/{expedienteId}/archivos` SHALL recibir un archivo (PDF, DOCX o texto) y la lista `documentos`, con `documentoId`, `codigoDocumento` y `nivelAcceso` de cada documento que contiene el archivo, tal como están en la base de datos. El copiloto SHALL asociar cada página al documento cuyo `codigoDocumento` aparece en ella y SHALL guardar con cada fragmento su `documentoId`, su `codigoDocumento`, su `nivelAcceso` y su página. Las páginas que no correspondan a ningún documento de la lista SHALL NOT indexarse. El copiloto SHALL responder 201 con la cantidad de fragmentos indexados por documento. Los documentos indexados SHALL quedar disponibles para consultas sin reiniciar el servicio.

#### Scenario: Subir el expediente de uso excepcional
- **WHEN** el backend sube el PDF de `UFI-2026-0001` con la lista de sus documentos
- **THEN** el copiloto responde 201 e indica cuántos fragmentos indexó de cada `codigoDocumento`

#### Scenario: Página de un documento no declarado
- **WHEN** el archivo contiene páginas de un `codigoDocumento` que no está en la lista `documentos`
- **THEN** esas páginas no se indexan y la respuesta no las cuenta

### Requirement: Evidencia solo de documentos autorizados
Toda evaluación y toda pregunta SHALL recibir `expedienteId` y `documentoIds`: los documentos que el usuario puede ver, según el backend. El copiloto SHALL buscar evidencia únicamente en los fragmentos de esos documentos. Antes de llamar al copiloto, el backend SHALL verificar que el usuario puede ver el expediente y SHALL calcular `documentoIds` según el `nivelAcceso` de cada documento. Si algún documento de `documentoIds` no está indexado, el copiloto SHALL responder 409 con `codigo: "indexacion_pendiente"`.

#### Scenario: Documento no autorizado
- **WHEN** un expediente tiene un documento `interno` y el backend lo excluye de `documentoIds`
- **THEN** ninguna cita de la respuesta referencia ese documento

#### Scenario: Documento sin indexar
- **WHEN** `documentoIds` incluye un documento que todavía no se subió
- **THEN** el copiloto responde 409 con `codigo: "indexacion_pendiente"`

### Requirement: Citas verificadas
Cada cita SHALL tener `documentoId`, `codigoDocumento`, `pagina`, `fragmento` y `puntaje`. El `fragmento` SHALL aparecer en el texto indexado de esa página, salvo diferencias de tildes, mayúsculas y espacios. Una cita que no se pueda verificar así SHALL descartarse, y el resultado que dependía de ella SHALL rebajarse e indicarlo en `motivo`.

#### Scenario: Cita inventada por el modelo
- **WHEN** el modelo devuelve un fragmento que no está en la página citada
- **THEN** la cita se descarta y el resultado no queda como `evidencia_encontrada`

### Requirement: Evaluación de requisitos sin decidir
`POST /v1/expedientes/{expedienteId}/evaluaciones-requisitos` SHALL recibir `documentoIds` y `requisitos`: una lista con `codigoRequisito`, `descripcion`, `baseNormativa` y, opcionalmente, `tipoDocumentoEsperado` y `palabrasClave`, tal como están en el catálogo de requisitos. La respuesta SHALL contener:
- `resultados`: uno por requisito, con `codigoRequisito`, `estado`, `motivo`, `citas`, `esVerificada` y `debeRevisarse`;
- `borrador` de observaciones (texto o `null`);
- `modelo` (`nombre`, `version`), `generadoEn` (instante en UTC) y `duracionMs`.

El `estado` SHALL ser `evidencia_encontrada`, `evidencia_parcial`, `no_hallada` o `no_determinable`. El copiloto SHALL NOT afirmar que un requisito se cumple ni decidir sobre el expediente: `debeRevisarse` SHALL ser siempre `true` y la decisión SHALL quedar en manos de una persona. Un resultado `evidencia_encontrada` SHALL incluir al menos una cita verificada.

#### Scenario: Requisito con evidencia
- **WHEN** se evalúa `UFI-R01` y un documento autorizado contiene el informe que explica el caso fortuito o de fuerza mayor
- **THEN** el resultado es `evidencia_encontrada`, tiene al menos una cita con documento y página, y `debeRevisarse` es `true`

#### Scenario: Requisito sin documento
- **WHEN** ningún documento autorizado contiene evidencia de un requisito
- **THEN** el resultado es `no_hallada`, `citas` es `[]` y el motivo lo explica

### Requirement: Preguntas con citas
`POST /v1/preguntas` SHALL recibir `expedienteId`, `pregunta`, `documentoIds` y, opcionalmente, `consultaId` y `maximoCitas`. La respuesta completa SHALL llegar en una sola respuesta HTTP, sin envío progresivo, y SHALL contener `consultaId`, `estado` (`respondida` o `sin_evidencia`), `respuesta` (texto o `null`), `citas`, `modelo`, `generadoEn` y `duracionMs`. Una respuesta `respondida` SHALL incluir al menos una cita.

#### Scenario: Respuesta con evidencia
- **WHEN** la pregunta puede responderse con los documentos autorizados
- **THEN** el copiloto responde 200 con `estado: "respondida"`, un texto en `respuesta` y al menos una cita

### Requirement: Sin evidencia suficiente
Cuando no encuentre evidencia suficiente para una pregunta, el copiloto SHALL responder 200 con `estado: "sin_evidencia"`, `respuesta: null` y `citas: []`. El backend SHALL informar al usuario que no se encontró evidencia en los documentos del expediente y SHALL NOT mostrar ningún texto generado sin citas. El backend SHALL tratar como `sin_evidencia` una respuesta `respondida` que llegue sin citas.

#### Scenario: Pregunta sin respaldo
- **WHEN** ningún documento autorizado contiene información para responder
- **THEN** el copiloto responde `estado: "sin_evidencia"` y el backend devuelve al frontend ese estado sin texto de respuesta

#### Scenario: Respuesta sin citas
- **WHEN** el copiloto devuelve `estado: "respondida"` con `citas` vacía
- **THEN** el backend la entrega al frontend como `sin_evidencia`

### Requirement: Registro de decisiones de las personas
El copiloto SHALL registrar la decisión de una persona sobre una sugerencia. `POST /v1/decisiones` SHALL recibir `expedienteId`, `decision` (`revisado`, `no_es_correcto`, `confirma_falta` o `si_esta_en_expediente`), `registradoPorId` (el `usuarioId` del perfil) y, opcionalmente, `codigoRequisito` y `comentario`, y SHALL responder 201 con la decisión y su `registradoEn` (instante en UTC). `GET /v1/decisiones?expedienteId=` SHALL listar las decisiones de un expediente. Las decisiones SHALL conservarse aunque el servicio se reinicie.

#### Scenario: Decisión registrada
- **WHEN** el backend registra `confirma_falta` sobre `UFI-R03` de un expediente
- **THEN** el copiloto responde 201 con la decisión y su `registradoEn`, y la lista de decisiones de ese expediente la incluye

### Requirement: Fallos del servicio
El copiloto SHALL informar sus errores en formato problem+json, con un `codigo` estable: 503 con `codigo: "copiloto_no_disponible"` cuando no puede atender o no está configurado, y 422 con `codigo: "validacion_fallida"` cuando la petición no es válida. El backend SHALL aplicar un tiempo máximo de espera de 30 segundos y SHALL NOT reintentar automáticamente las consultas. Ante un fallo, el frontend SHALL recibir del backend 503 (`copiloto_no_disponible`) o 504 (`copiloto_tiempo_agotado`). Las demás funciones del sistema SHALL seguir operando.

#### Scenario: Copiloto caído
- **WHEN** el copiloto no responde dentro del tiempo máximo
- **THEN** el backend responde 504 con `codigo: "copiloto_tiempo_agotado"` y la consulta de expedientes sigue funcionando

### Requirement: Estado del servicio
El copiloto SHALL exponer `GET /v1/salud` sin token de servicio. Esta ruta SHALL responder 200 solo cuando el servicio puede atender consultas, e indicar el modelo en uso y la cantidad de fragmentos indexados.

#### Scenario: Verificación de salud
- **WHEN** el backend consulta `GET /v1/salud` con el copiloto listo
- **THEN** recibe 200 con `modelo` y `cantidadFragmentos`

### Requirement: Rutas fuera del contrato
El copiloto MAY exponer otras rutas (por ejemplo, de extracción de campos o contraste de cifras), pero el backend SHALL NOT depender de ellas hasta que un cambio de OpenSpec las agregue a este contrato. Los plazos, los días hábiles y las reglas de negocio SHALL calcularse en el backend; el copiloto SHALL NOT ser su fuente.

#### Scenario: Plazo de un expediente
- **WHEN** el frontend necesita la fecha límite de un expediente
- **THEN** la calcula el backend, no el copiloto

### Requirement: Contrato publicado en OpenAPI
El copiloto SHALL publicar un documento OpenAPI generado a partir de sus propios modelos y versionado en el repositorio. Los ejemplos de petición y respuesta del contrato SHALL validarse automáticamente en ambos lados (backend y copiloto). Un cambio incompatible SHALL requerir un cambio de OpenSpec aprobado por los responsables del backend y del copiloto.

#### Scenario: Ejemplo compartido inválido
- **WHEN** un ejemplo de respuesta del contrato deja de cumplir el esquema de cualquiera de los dos lados
- **THEN** las pruebas de contrato fallan
