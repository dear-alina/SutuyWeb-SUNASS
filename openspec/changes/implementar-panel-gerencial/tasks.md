## 1. Base de datos

- [x] 1.1 Crear la migración `crear-tablas-panel-gerencial`: `resultado` y `fechaConclusion` en `expedientes`, tablas `hitos` y `diasNoHabiles`, RLS sin políticas y sin permisos para `anon` y `authenticated`.
- [x] 1.2 Escribir `bd/supabase/tests/panel-gerencial.test.sql` (pgTAP): catálogo de responsables, hito duplicado, conclusión anterior al inicio, tipo de día no hábil, RLS y permisos.
- [ ] 1.3 Probar con `npx supabase db reset` y `npx supabase test db` en local.

## 2. Backend

- [x] 2.1 `calendario.js`: feriados nacionales, días no hábiles adicionales, suma y conteo de días hábiles.
- [x] 2.2 `calculos.js`: suspensión, fecha límite, semáforo, tiempo por área, pasos fuera de plazo, calidad de datos.
- [x] 2.3 `GET /api/v1/panel-gerencial` con validación Zod y lectura de fechas como texto (sin efecto de la zona horaria).
- [x] 2.4 Pruebas de cálculo sin base (casos del dataset ds02) y pruebas de la ruta contra Supabase local.
- [ ] 2.5 Ejecutar `npm test` completo contra Supabase local.
- [x] 2.6 Script `cargar-datos-sprint` (solo base local) y `openapi.json` regenerado.

## 3. Frontend (rama `frontend`)

- [ ] 3.1 La pantalla `/sunass/panel` consulta la API cuando hay backend y mantiene el cálculo local solo en el modo demo sin backend.
