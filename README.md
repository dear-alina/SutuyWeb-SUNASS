# SutuyWeb

Plataforma colaborativa para la gestión y el seguimiento de los trámites financieros de las empresas prestadoras (EPS) ante Sunass: solicitudes, plazos en días hábiles, documentos, alertas y un copiloto que ayuda a revisar expedientes. La persona siempre decide y firma.

> Estado: estructura inicial. Todavía no hay código ni aplicaciones instaladas.

## Estructura

```
SutuyWeb-SUNASS/
├── frontend/   Interfaz web (Next.js con TypeScript)
├── backend/    API y lógica de negocio (Node.js con JavaScript y Express), organizada por módulos
├── copiloto/   Servicio RAG para consultar expedientes (Python con FastAPI)
└── bd/         Migraciones, políticas de acceso y scripts de la base de datos (no contiene datos)
```

## Arquitectura

Monolito modular en un solo repositorio:

- **frontend**: solo interfaz, navegación y validación de formularios. Se comunica únicamente con la API del backend; no se conecta a Supabase ni guarda claves.
- **backend**: única fuente de la lógica de negocio (flujos, plazos, permisos, avisos, documentos, indicadores). Valida las entradas con Zod. Usa Supabase Auth para las sesiones y Supabase Storage (privado) para los archivos. Es el único que llama al copiloto.
- **copiloto**: servicio interno de recuperación y respuesta (RAG) sin marco adicional, con un modelo de lenguaje abierto que corre localmente y vectores en PostgreSQL con pgvector. Sugiere y cita; no decide ni firma.
- **bd**: PostgreSQL alojado en Supabase. Aquí se versionan el esquema, las migraciones, las políticas RLS y los datos sintéticos de prueba, nunca una copia de la base.

```
Navegador ──> frontend ──> backend (API) ──> Supabase (PostgreSQL, Auth, Storage)
                                │
                                └──> copiloto ──> pgvector y modelo local
```

## Plazos

Los plazos se cuentan en días hábiles según el TUO de la Ley 27444 (DS 004-2019-JUS), art. 145.1: días hábiles consecutivos, sin sábados, domingos ni feriados. Un día hábil no equivale a 24 horas.

## Seguridad y datos

Este repositorio es **público**. Nunca se suben:

- Archivos `.env` con secretos, credenciales, tokens, contraseñas o cadenas de conexión. Los ejemplos de configuración (`.env.example`) llevan solo valores ficticios.
- Claves privilegiadas de Supabase (`service_role`): solo en el backend y el copiloto, por variables de entorno, nunca en el frontend.
- Datos personales, expedientes reales o confidenciales, volcados de producción ni documentos sin autorización para publicarse.
- Dependencias instaladas, compilaciones, cachés, registros, pesos de modelos ni archivos temporales.

## Pendiente de definir

- Modelo abierto local, modelo de embeddings y forma de ejecutarlos (por ejemplo, Ollama).
- Versiones de Node.js y Python, y gestores de paquetes.
- Feriados y calendario oficial que usará el cálculo de plazos.
