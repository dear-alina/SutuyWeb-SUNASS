## Purpose

Define cómo el backend calcula los plazos de los expedientes en días hábiles y entrega a las áreas de Sunass el panel gerencial: indicadores, vencimientos, tiempos por área, pasos fuera de plazo y calidad de datos, a una fecha de corte.

## ADDED Requirements

### Requirement: Acceso al panel
`GET /api/v1/panel-gerencial` SHALL exigir sesión y un perfil con rol `sunass` o `admin`. Sin sesión SHALL responder 401; con rol `eps`, 403 con `codigo: "acceso_denegado"`.

#### Scenario: Una EPS intenta ver el panel
- **WHEN** una persona con perfil `eps` consulta el panel
- **THEN** la API responde 403 con `codigo: "acceso_denegado"`

### Requirement: Parámetros de consulta
La ruta SHALL aceptar `fechaCorte` (AAAA-MM-DD; por defecto, hoy en Lima), `diasAlerta` (entero de 1 a 30; por defecto 5) y `tipoProcedimiento` (catálogo de `expedientes`). Un valor inválido SHALL dar 422 con `codigo: "validacion_fallida"` y el campo nombrado.

#### Scenario: Fecha con formato incorrecto
- **WHEN** se envía `fechaCorte=30/09/2026`
- **THEN** la API responde 422 con un error en `query.fechaCorte`

### Requirement: Días hábiles
Los plazos SHALL contarse en días hábiles: lunes a viernes, sin feriados nacionales ni los días registrados en `diasNoHabiles`. El día 1 SHALL ser el hábil siguiente a la fecha de inicio (TUO LPAG art. 134.1).

#### Scenario: Día no laborable registrado
- **WHEN** se registra en `diasNoHabiles` un día dentro del plazo de un expediente
- **THEN** su fecha límite se corre un día hábil

### Requirement: Fecha límite y suspensión
La fecha límite SHALL ser la fecha de inicio más el plazo máximo más los días de suspensión. Los días de suspensión SHALL ser los días hábiles de los hitos con `cuentaPlazo = false`, hasta su fin o hasta la fecha de corte si siguen en curso.

#### Scenario: Subsanación de la EP
- **WHEN** un expediente de 30 d.h. tuvo una subsanación de 2 d.h.
- **THEN** su fecha límite es la del día hábil 32 contado desde el inicio

### Requirement: Situación de cada expediente
La API SHALL clasificar cada expediente con uno de estos valores de `semaforo`:
- `silencio_positivo`: solo para `uso_excepcional_fondo` en trámite, cuando la fecha de corte supera la fecha límite más 5 días (TUO LPAG art. 24.1);
- `vencido`: en trámite, cuando la fecha de corte supera la fecha límite;
- `por_vencer`: en trámite, cuando faltan `diasAlerta` días hábiles o menos;
- `en_plazo`: el resto de los que están en trámite;
- `resuelto_en_plazo` o `resuelto_fuera_de_plazo`: concluidos, según su fecha de conclusión;
- `resuelto_sin_fecha`: concluidos sin fecha de conclusión; no cuentan en el porcentaje de resueltos en plazo;
- `sin_plazo`: el procedimiento no tiene plazo máximo.

Ningún otro procedimiento SHALL marcarse como `silencio_positivo`.

#### Scenario: Plazo vencido en un cambio del programa de inversiones
- **WHEN** un expediente `cambio_programa_inversiones` en trámite supera su fecha límite más 5 días
- **THEN** su `semaforo` es `vencido` y `fechaLimiteNotificacion` es `null`

### Requirement: Datos a la fecha de corte
La API SHALL excluir los expedientes y hitos iniciados después de la fecha de corte y SHALL tratar como en trámite (o en curso) lo que concluyó después de ella.

#### Scenario: Concluido después del corte
- **WHEN** un expediente concluyó el 30/10 y se consulta con fecha de corte 30/09
- **THEN** figura en los vencimientos como expediente en trámite

### Requirement: Tiempos y pasos fuera de plazo
La API SHALL devolver el promedio, el máximo y la cantidad de días hábiles por área de Sunass, sin la EP ni actores externos ni pasos con `cuentaPlazo = false`, y la lista de pasos con `plazoReferencialDiasHabiles` que lo superaron.

#### Scenario: Derivación demorada
- **WHEN** una derivación con plazo propio de 1 d.h. tardó 3 d.h.
- **THEN** aparece en `pasosFueraDePlazo` con `diasHabiles: 3` y `plazoDiasHabiles: 1`

### Requirement: Calidad de datos
La API SHALL reportar los expedientes concluidos sin fecha de conclusión y los hitos cuya fecha de fin es anterior a la de inicio.

#### Scenario: Hito con fechas invertidas
- **WHEN** un hito termina antes de iniciar
- **THEN** `calidadDatos` incluye una observación `hito_termina_antes_de_iniciar` con su expediente
