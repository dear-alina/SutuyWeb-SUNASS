## Purpose

Define cómo la base de datos guarda la identidad de negocio de cada usuario: rol, área y EPS. También define cómo guarda el catálogo de EPS y las solicitudes de acceso de las EPS. El objetivo es que el inicio de sesión y el registro dependan de datos coherentes y protegidos.

## ADDED Requirements

### Requirement: Catálogo de EPS
La base de datos SHALL mantener un catálogo de EPS. Cada EPS SHALL tener:
- un identificador UUID generado por la base
- un `codigoEps` único con el formato `EPS` seguido de dos dígitos
- un `nombre` único
- un `ruc` opcional que, si existe, SHALL ser único y tener 11 dígitos

Después de aplicar las migraciones y los datos de prueba, el catálogo SHALL contener las 20 EPS sintéticas del dataset `ds01_catalogo_eps`, de `EPS01` a `EPS20`.

#### Scenario: EPS sintéticas disponibles
- **WHEN** se reinicia la base local con las migraciones y los datos de prueba
- **THEN** existen 20 EPS con códigos de `EPS01` a `EPS20` y sus nombres del dataset

#### Scenario: Código de EPS duplicado
- **WHEN** se intenta insertar una EPS con un `codigoEps` que ya existe
- **THEN** la base rechaza la inserción

#### Scenario: Código de EPS con formato inválido
- **WHEN** se intenta insertar una EPS con `codigoEps = 'eps1'`
- **THEN** la base rechaza la inserción

### Requirement: Perfil ligado al usuario de Supabase Auth
Cada perfil SHALL corresponder a un solo usuario de Supabase Auth y SHALL usar el mismo identificador. El perfil SHALL guardar `nombre`, `cargo`, `rol`, `area`, la EPS (si corresponde), el `proveedor` de acceso y si está `activo`, además de las fechas de creación y de última actualización. Al eliminar el usuario de Supabase Auth, su perfil SHALL eliminarse con él. La fecha de última actualización SHALL renovarse en cada modificación.

#### Scenario: Usuario eliminado de Auth
- **WHEN** se elimina de Supabase Auth un usuario que tiene perfil
- **THEN** su perfil deja de existir

#### Scenario: Perfil sin usuario de Auth
- **WHEN** se intenta crear un perfil con un identificador que no existe en Supabase Auth
- **THEN** la base rechaza la inserción

#### Scenario: Actualización de un perfil
- **WHEN** se modifica el cargo de un perfil
- **THEN** su fecha de última actualización es posterior a la anterior

### Requirement: Catálogos cerrados de rol, área y proveedor
La base de datos SHALL aceptar solo estos valores:
- `rol`: `admin`, `sunass`, `eps`
- `area`: `ep`, `dre`, `srt`, `equipo_srt`, `oaj`, `du`, `gg`, `cd`
- `proveedor`: `correo`, `microsoft`

Cualquier otro valor SHALL rechazarse.

#### Scenario: Rol desconocido
- **WHEN** se intenta guardar un perfil con `rol = 'supervisor'`
- **THEN** la base rechaza la operación

#### Scenario: Área con formato del prototipo
- **WHEN** se intenta guardar un perfil con `area = 'Equipo SRT'`
- **THEN** la base rechaza la operación, porque el valor válido es `equipo_srt`

### Requirement: Coherencia entre rol, área y EPS
La base de datos SHALL rechazar perfiles incoherentes:
- Un perfil `eps` SHALL tener una EPS asociada y el área `ep`.
- Un perfil `sunass` SHALL tener un área distinta de `ep` y ninguna EPS asociada.
- Un perfil `admin` SHALL NOT tener área ni EPS asociada.

#### Scenario: Usuario EPS sin EPS
- **WHEN** se intenta guardar un perfil `eps` sin EPS asociada
- **THEN** la base rechaza la operación

#### Scenario: Usuario Sunass con EPS
- **WHEN** se intenta guardar un perfil `sunass` con área `srt` y una EPS asociada
- **THEN** la base rechaza la operación

#### Scenario: Perfiles válidos
- **WHEN** se guardan tres perfiles válidos: uno `eps` con área `ep` y una EPS, uno `sunass` con área `dre` y sin EPS, y uno `admin` sin área ni EPS
- **THEN** la base acepta los tres

### Requirement: Solicitudes de acceso de EPS
La base de datos SHALL guardar cada solicitud de acceso con estos datos:
- el usuario de Supabase Auth creado al registrarse
- la EPS solicitada
- `nombre`, `cargo` y `correo`
- un `estado`: `pendiente`, `aprobada` o `rechazada`
- la fecha de la solicitud

Una solicitud resuelta SHALL registrar su fecha de resolución y el perfil que la resolvió, y una rechazada SHALL registrar además su motivo. Una solicitud pendiente SHALL NOT tener datos de resolución. No SHALL existir dos solicitudes pendientes con el mismo correo, sin distinguir mayúsculas de minúsculas. La base SHALL NOT guardar claves en ninguna de sus tablas.

#### Scenario: Segunda solicitud pendiente con el mismo correo
- **WHEN** existe una solicitud pendiente de `ana@eps.example` y se registra otra para `ANA@eps.example`
- **THEN** la base rechaza la segunda

#### Scenario: Nueva solicitud después de un rechazo
- **WHEN** la única solicitud de un correo está `rechazada` y se registra otra para ese correo
- **THEN** la base acepta la nueva solicitud como `pendiente`

#### Scenario: Rechazo sin motivo
- **WHEN** se intenta marcar una solicitud como `rechazada` sin motivo
- **THEN** la base rechaza la operación

#### Scenario: Aprobación sin resolutor
- **WHEN** se intenta marcar una solicitud como `aprobada` sin indicar quién la resolvió ni cuándo
- **THEN** la base rechaza la operación

### Requirement: Sin acceso directo desde clientes de Supabase
Las tablas de EPS, perfiles y solicitudes de acceso SHALL tener RLS activado. Los roles `anon` y `authenticated` SHALL NOT poder leerlas ni modificarlas. Solo el backend SHALL acceder a ellas desde el servidor.

#### Scenario: Lectura anónima
- **WHEN** el rol `anon` intenta leer los perfiles
- **THEN** la base deniega el acceso o no devuelve ninguna fila

#### Scenario: Usuario autenticado intenta cambiar su rol
- **WHEN** un usuario con el rol `authenticated` intenta actualizar su propio perfil a `rol = 'admin'`
- **THEN** la base deniega la operación y el perfil no cambia

### Requirement: Alta del primer administrador
El repositorio SHALL incluir un procedimiento que, a partir del correo de un usuario ya creado en Supabase Auth, le asigne un perfil `admin` activo. El procedimiento SHALL NOT incluir claves y SHALL fallar con un mensaje claro si el correo no existe en Supabase Auth.

#### Scenario: Promoción de un usuario existente
- **WHEN** se ejecuta el procedimiento con el correo de un usuario de Supabase Auth sin perfil
- **THEN** ese usuario queda con un perfil `admin` activo, sin área ni EPS

#### Scenario: Correo inexistente
- **WHEN** se ejecuta el procedimiento con un correo que no está en Supabase Auth
- **THEN** el procedimiento falla indicando que el usuario no existe y no crea ningún perfil
