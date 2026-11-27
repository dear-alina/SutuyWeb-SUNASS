# Backend de SutuyWeb

API con Node.js, Express y Zod. Centraliza la lógica de negocio y es la única parte que habla con Supabase. Sigue [`docs/convenciones.md`](../docs/convenciones.md) y los contratos de `openspec/`.

Por ahora cubre el inicio de sesión, el perfil y las solicitudes de acceso de las EPS (cambio `implementar-sesion-y-registro`).

## Requisitos

- Node.js 22 o superior.
- Supabase local levantado desde `bd/` (`npx supabase start`), con las migraciones y el seed de `crear-tablas-acceso`.

## Configuración

1. Copie `.env.example` como `.env`.
2. Complete los valores con la salida de `npx supabase status -o env` (desde `bd/`):

   | Variable | Valor de `supabase status` |
   |---|---|
   | `SUPABASE_URL` | `API_URL` |
   | `SUPABASE_CLAVE_PUBLICA` | `PUBLISHABLE_KEY` (o `ANON_KEY`) |
   | `SUPABASE_CLAVE_SECRETA` | `SECRET_KEY` (o `SERVICE_ROLE_KEY`) |
   | `DATABASE_URL` | `DB_URL` |

`.env` no se versiona. La clave secreta solo se usa en el servidor y nunca debe llegar al frontend.

## Comandos

```bash
npm install
npm run dev        # API en http://localhost:4000/api/v1, se reinicia al guardar
npm test           # Vitest + Supertest contra el Supabase local
npm run openapi    # Regenera openapi.json desde los esquemas Zod
```

Las pruebas abortan si `SUPABASE_URL` o `DATABASE_URL` no apuntan a `localhost`. Crean sus propios usuarios con correos `@prueba.test` y los borran al terminar.

## Estructura

```text
src/
├── servidor.js           Arranca el servidor (listen)
├── app.js                crearApp(): middlewares, rutas y manejo de errores
├── config.js             Variables de entorno validadas con Zod
├── openapi.js            Documento OpenAPI 3.1 generado desde los esquemas
├── compartido/           Errores (problem+json), validación, CSRF, sesión, BD y Supabase
└── modulos/
    ├── sesiones/         POST /sesiones, DELETE /sesiones/actual, GET /perfil
    └── solicitudes-acceso/
```

## Rutas

| Método y ruta | Acceso |
|---|---|
| `POST /api/v1/sesiones` | Público. Cuerpo `{institucion, usuario, clave, ruc?}`; fija las cookies `sw_acceso` y `sw_renovacion` (HttpOnly) |
| `GET /api/v1/perfil` | Con sesión |
| `DELETE /api/v1/sesiones/actual` | Con sesión |
| `POST /api/v1/solicitudes-acceso` | Público. Cuerpo `{ruc, nombre, cargo?, correo, clave}` |
| `GET /api/v1/solicitudes-acceso` | Admin |
| `POST /api/v1/solicitudes-acceso/{solicitudAccesoId}/aprobacion` | Admin |
| `POST /api/v1/solicitudes-acceso/{solicitudAccesoId}/rechazo` | Admin. Cuerpo `{motivoRechazo}` |
| `GET /api/v1/sesiones/microsoft[/retorno]` | Reservado: responde 503 |

El detalle está en `openapi.json`. Los métodos que modifican datos exigen un `Origin` permitido (`ORIGENES_PERMITIDOS`) y cuerpo JSON.
