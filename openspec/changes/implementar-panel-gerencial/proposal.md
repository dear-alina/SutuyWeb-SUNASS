## Why

La rama `frontend` ya tiene la pantalla `/sunass/panel` (panel gerencial de plazos de la DRE), pero calcula todo en el navegador con datos de demostración o con CSV que carga la persona. Para el MVP, los plazos deben salir de la base de datos y calcularse en el servidor con un solo calendario de días hábiles, para que la DRE vea qué expedientes vencen, dónde se demoran y qué datos están mal, sin depender de archivos locales.

## What Changes

- **Base de datos** (`bd/`):
  - `expedientes` recibe `resultado` y `fechaConclusion`.
  - Nueva tabla `hitos` con el recorrido de cada expediente (área responsable, fechas, plazo propio del paso y si cuenta para el plazo de Sunass). Los días de suspensión se derivan de ella.
  - Nueva tabla `diasNoHabiles` para los días no laborables por decreto y otros días no hábiles, con su base normativa.
  - RLS activo sin políticas y sin permisos para `anon` y `authenticated`, como el resto de tablas.
- **Backend**: `GET /api/v1/panel-gerencial` para los roles `sunass` y `admin`, con `fechaCorte`, `diasAlerta` y `tipoProcedimiento`. Devuelve indicadores, calendario de vencimientos, tiempo promedio por área, pasos que superaron su plazo propio y observaciones de calidad de datos.
- Script `npm run cargar-datos-sprint` para cargar los CSV del sprint en la base **local** (aborta con otra base).
- `openapi.json` regenerado.
- **Frontend** (rama `frontend`): la pantalla usa la API cuando hay backend y conserva el cálculo en el navegador solo en el modo demo sin backend.

## Capabilities

### New Capabilities
- `panel-gerencial`: cálculo de plazos en días hábiles, indicadores y alertas de la DRE a una fecha de corte.

### Modified Capabilities
- `expedientes-documentos` (cambio `crear-tablas-acceso`, sin archivar): `expedientes` agrega `resultado` y `fechaConclusion`. Es un cambio compatible: columnas opcionales.

## Impact

- **Partes:** `bd/` (migración nueva), `backend/` (módulo `panel-gerencial`, script y pruebas), `frontend/` (conexión de la pantalla).
- **Contrato:** ruta nueva; no cambia ninguna existente.
- **Datos:** solo sintéticos. Los CSV del sprint no se versionan; el script los lee por ruta.
- **Pendiente de confirmar:** el catálogo oficial de días no laborables lo registra la persona designada; la cantidad de días del margen «por vencer» es un criterio de gestión de la DRE, no una norma.
