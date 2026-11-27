## Purpose

Define cómo la base de datos identifica cada expediente y sus documentos vinculados, y cómo guarda los requisitos de cada procedimiento según la norma. Así el backend puede decidir qué documentos ve cada usuario y qué requisitos debe evaluar el copiloto.

## ADDED Requirements

### Requirement: Expediente con identificador y código únicos
La base de datos SHALL guardar cada expediente con:
- un identificador UUID generado por la base
- un `codigoExpediente` único con el formato `<prefijo>-AAAA-NNNN`, donde el prefijo es `CPI`, `RP`, `RPI`, `RTI`, `UFI` o `VCI`
- la EPS a la que pertenece, que SHALL existir en el catálogo de EPS
- su `tipoProcedimiento`, su `estado` y su fecha de inicio
- opcionalmente, su plazo máximo en días hábiles y su monto solicitado con dos decimales

El prefijo del código SHALL corresponder al tipo de procedimiento: `UFI` a `uso_excepcional_fondo`, `RP` a `revision_periodica`, `CPI` a `cambio_programa_inversiones`, `RPI` a `reporte_periodico`, `RTI` a `reajuste_ipm` y `VCI` a `verificacion_incremento`. Una EPS con expedientes SHALL NOT poder eliminarse.

#### Scenario: Código de expediente duplicado
- **WHEN** se intenta insertar un expediente con un `codigoExpediente` que ya existe
- **THEN** la base rechaza la inserción

#### Scenario: Prefijo que no corresponde al procedimiento
- **WHEN** se intenta guardar el expediente `RP-2026-0099` con `tipoProcedimiento = 'uso_excepcional_fondo'`
- **THEN** la base rechaza la operación

#### Scenario: Expediente de una EPS inexistente
- **WHEN** se intenta guardar un expediente con una EPS que no está en el catálogo
- **THEN** la base rechaza la operación

#### Scenario: Eliminar una EPS con expedientes
- **WHEN** se intenta eliminar la EPS de un expediente existente
- **THEN** la base rechaza la eliminación

### Requirement: Catálogos del dataset sin traducir
La base de datos SHALL aceptar solo los valores del dataset oficial:
- `tipoProcedimiento`: `cambio_programa_inversiones`, `reajuste_ipm`, `reporte_periodico`, `revision_periodica`, `uso_excepcional_fondo`, `verificacion_incremento`
- `estado` del expediente: `en_tramite`, `concluido`, `archivado`
- `tipoDocumento`: `acta`, `anexo`, `carta_ep`, `informe`, `memorandum`, `oficio`, `proveido`, `publicacion_diario_oficial`, `resolucion_consejo_directivo`, `resolucion_directoral`
- `nivelAcceso`: `publico`, `restringido_partes`, `interno`

Cualquier otro valor SHALL rechazarse.

#### Scenario: Estado en otro formato
- **WHEN** se intenta guardar un expediente con `estado = 'enTramite'`
- **THEN** la base rechaza la operación, porque el valor válido es `en_tramite`

#### Scenario: Nivel de acceso desconocido
- **WHEN** se intenta guardar un documento con `nivelAcceso = 'privado'`
- **THEN** la base rechaza la operación

### Requirement: Documentos vinculados a un expediente
La base de datos SHALL guardar cada documento con:
- un identificador UUID generado por la base
- un `codigoDocumento` único con el formato `DOC-` seguido de seis dígitos
- el expediente al que pertenece, que SHALL existir
- su tipo de documento y su `nivelAcceso`, ambos obligatorios
- opcionalmente, el código de la actuación (`ACT-` seguido de seis dígitos), el número del documento, su fecha, su asunto, sus folios y la ruta de su archivo en el almacenamiento privado

Un expediente con documentos SHALL NOT poder eliminarse.

#### Scenario: Documento sin nivel de acceso
- **WHEN** se intenta guardar un documento sin `nivelAcceso`
- **THEN** la base rechaza la inserción

#### Scenario: Documento de un expediente inexistente
- **WHEN** se intenta guardar un documento con un expediente que no existe
- **THEN** la base rechaza la inserción

#### Scenario: Código de documento con formato inválido
- **WHEN** se intenta guardar un documento con `codigoDocumento = 'DOC-12'`
- **THEN** la base rechaza la inserción

#### Scenario: Eliminar un expediente con documentos
- **WHEN** se intenta eliminar un expediente que tiene documentos
- **THEN** la base rechaza la eliminación

### Requirement: Requisitos por procedimiento con base normativa
La base de datos SHALL mantener un catálogo de requisitos. Cada requisito SHALL tener:
- un `codigoRequisito` único con el formato `<prefijo>-R` seguido de dos dígitos (por ejemplo, `UFI-R01`)
- el tipo de procedimiento al que aplica y su número de orden, únicos en conjunto
- una descripción no vacía
- su base normativa, con el artículo y el numeral del Reglamento General de Tarifas
- opcionalmente, el tipo de documento que lo sustenta, cuando el requisito exige un documento vinculado
- si es candidato, es decir, si su texto todavía no se verificó en la norma vigente

#### Scenario: Requisitos del uso excepcional del fondo
- **WHEN** se reinicia la base local con las migraciones y los datos de prueba
- **THEN** existen los requisitos `UFI-R01`, `UFI-R02` y `UFI-R03` de `uso_excepcional_fondo`, con base normativa en el art. 89.2 del RGT, y `UFI-R01` exige un documento de tipo `informe`

#### Scenario: Número de orden repetido
- **WHEN** se intenta guardar un segundo requisito de `uso_excepcional_fondo` con el número 1
- **THEN** la base rechaza la inserción

### Requirement: Expedientes de demostración
Después de aplicar las migraciones y los datos de prueba, la base SHALL contener dos expedientes ficticios del dataset, con sus documentos de `ds11` y de la actualización al 20/11/2026:
- `UFI-2026-0001`, de `EPS07`, `uso_excepcional_fondo`, `concluido` (estado al 20/11/2026), con 7 documentos
- `RP-2026-0002`, de `EPS04`, `revision_periodica`, `en_tramite`, con 15 documentos

Los datos de prueba SHALL NOT incluir datos de expedientes reales ni datos personales.

#### Scenario: Expediente de uso excepcional disponible
- **WHEN** se reinicia la base local con las migraciones y los datos de prueba
- **THEN** existe `UFI-2026-0001` ligado a `EPS07`, con un monto solicitado de `436594.67` y 7 documentos

#### Scenario: Documentos con distintos niveles de acceso
- **WHEN** se consultan los documentos de los dos expedientes de demostración
- **THEN** hay documentos `publico`, `restringido_partes` e `interno`

### Requirement: Sin acceso directo desde clientes de Supabase
Las tablas de expedientes, documentos y requisitos SHALL tener RLS activado. Los roles `anon` y `authenticated` SHALL NOT poder leerlas ni modificarlas. Solo el backend SHALL acceder a ellas desde el servidor.

#### Scenario: Lectura anónima de documentos
- **WHEN** el rol `anon` intenta leer los documentos
- **THEN** la base deniega el acceso o no devuelve ninguna fila

#### Scenario: Usuario autenticado intenta cambiar un nivel de acceso
- **WHEN** un usuario con el rol `authenticated` intenta cambiar un documento `interno` a `publico`
- **THEN** la base deniega la operación y el documento no cambia
