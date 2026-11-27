# Frontend de SutuyWeb

Aplicación web con Next.js (App Router) y TypeScript. Sigue [`docs/convenciones.md`](../docs/convenciones.md): carpetas y archivos en kebab-case, componentes en PascalCase y el dominio en español sin tildes ni ñ.

El frontend **muestra** la información y **no calcula** las reglas de negocio. Los plazos, los permisos, las etapas y las alertas los resuelve el backend, que es la única fuente (README del proyecto). Los tipos se generan desde `backend/openapi.json` (design.md, D5).

## Estructura

```text
frontend/
├── public/                         Archivos estáticos (íconos, imágenes)
├── pruebas/                        Pruebas con Vitest (design.md, D9)
└── src/
    ├── app/                        Rutas (App Router)
    │   ├── (publico)/
    │   │   ├── ingresar/           Inicio de sesión
    │   │   └── solicitar-acceso/   Una EPS pide acceso; el admin lo aprueba (D6)
    │   ├── eps/                    Rol eps
    │   │   ├── tramites/           Sus trámites
    │   │   │   └── [codigoExpediente]/   Detalle del trámite
    │   │   └── nueva-solicitud/    Asistente con los requisitos del TUPA
    │   ├── sunass/                 Rol sunass (DRE, SRT, equipo_srt, OAJ, GG, CD son áreas)
    │   │   ├── inicio/             Panel con prioridad para la DRE
    │   │   ├── expedientes/
    │   │   │   └── [codigoExpediente]/   Ficha universal del expediente
    │   │   ├── alertas/            Plazos vencidos y riesgo de silencio positivo
    │   │   ├── fondos/             Fondo de inversiones y reservas por EPS
    │   │   ├── calidad-datos/      Duplicados, saldos que no cuadran, reportes faltantes
    │   │   └── bitacora/           Trazabilidad de cambios
    │   └── admin/                  Rol admin
    │       └── solicitudes-acceso/ Aprobar o rechazar el acceso de las EPS
    ├── componentes/                Componentes React (PascalCase.tsx)
    │   ├── comunes/                Encabezado, BandaPrototipo, ChipEstado, AvisoAlerta
    │   ├── expediente/             TarjetaExpediente, LineaTiempo, PanelPlazo, ListaDocumentos
    │   ├── eps/                    PanelQueDebeHacer, AsistenteNuevaSolicitud
    │   └── sunass/                 BandejaAccion, IndicadoresPanel, CuellosBotella
    ├── servicios/api/              Cliente HTTP hacia /api/v1 (sesión con cookie httpOnly, D6)
    ├── tipos/api/                  Tipos generados desde backend/openapi.json (no se editan a mano)
    ├── utilidades/                 Formato de fechas (dd/mm/aaaa), montos y textos
    └── estilos/                    Tokens de diseño y estilos globales
```

## Reglas de esta carpeta

- **Nombres:** carpetas y archivos `.ts` en kebab-case (`formatear-fecha.ts`), componentes en PascalCase (`TarjetaExpediente.tsx`), funciones con un verbo en infinitivo (`listarExpedientes`) y booleanos que empiezan con `es`, `tiene`, `puede` o `debe`.
- **Datos del contrato:** claves en camelCase (`codigoExpediente`, `areaActual`, `nivelAcceso`). Los valores de catálogo se mantienen como en el dataset (`en_tramite`, `restringido_partes`).
- **Fechas:** se reciben como `AAAA-MM-DD` o ISO 8601 en UTC y se muestran como `dd/mm/aaaa`.
- **Documentos:** la EPS solo ve los que tienen `nivelAcceso` igual a `publico` o `restringido_partes`.
- **Variables de entorno:** solo `NEXT_PUBLIC_*` para valores que no son secretos (por ejemplo, `NEXT_PUBLIC_API_URL`). No se suben archivos `.env`; se usa `.env.example` con valores ficticios.
- **Accesibilidad:** WCAG 2.2 AA. El estado se indica con texto, no solo con color; todo se puede usar con teclado; la página se adapta a 320 px de ancho.
