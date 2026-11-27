## Why

Vamos a empezar el backend en un repositorio que comparte con un frontend, el copiloto y la base de datos, y cada parte la desarrolla una persona distinta. Antes de escribir código hay que acordar tres cosas: quién puede modificar qué, cómo se nombran las cosas y qué forma tienen las interfaces entre servicios. Si no lo hacemos, la integración dependerá de copias manuales que terminan contradiciéndose. El prototipo usa nombres mezclados (`cod_eps`, `codEps`, `nro`, `pasoActual` frente a `hito_actual`), datos simulados y claves de prueba que no deben pasar al MVP.

## What Changes

- Se adopta un estándar de nomenclatura:
  - Dominio en español, sin tildes ni ñ.
  - camelCase en código JS/TS, en JSON y en PostgreSQL, con identificadores entre comillas.
  - snake_case solo dentro de Python.
  - PascalCase para tipos y componentes.
  - Las excepciones se documentan con su fuente.
- Los valores de catálogo conservan el estilo del dataset (`en_tramite`, `uso_excepcional_fondo`). Solo se mapean los nombres de columna.
- Se define el contrato mínimo de la API del backend:
  - Forma de las respuestas, `null` frente a campos opcionales.
  - Fechas e instantes en ISO 8601 y montos como cadena decimal.
  - Errores en formato RFC 9457 y paginación.
  - Sesión por cookie httpOnly, con correo y clave, y con Microsoft Entra ID reservado.
- Se define el contrato backend → copiloto: consulta, respuesta con citas, caso sin evidencia, fallos y conversión explícita entre camelCase y snake_case.
- Se establece que el código es la fuente de cada esquema: Zod en el backend y Pydantic en el copiloto. Cada lado genera su `openapi.json`, y las specs describen el comportamiento sin copiar esquemas.
- Se documentan:
  - Responsabilidades y aprobación de cambios compartidos: `CONTRIBUTING.md` y `.github/CODEOWNERS`.
  - Convenciones: `docs/convenciones.md`.
  - Reglas que toda propuesta debe respetar: `openspec/config.yaml`.
- Se corrige el `.gitignore` para que ignore los temporales de Supabase CLI fuera de la raíz (`bd/supabase/.temp/`).

## Capabilities

### New Capabilities
- `contrato-api`: comportamiento observable de la API HTTP del backend para el frontend. Cubre forma de datos, validación, errores, listados, sesión y permisos.
- `contrato-copiloto`: comportamiento observable de la interfaz interna del copiloto para el backend. Cubre consulta, citas, caso sin evidencia, fallos, acceso y formato de los campos.

### Modified Capabilities
<!-- Ninguna: openspec/specs/ está vacío. -->

## Impact

- **Partes:** backend (aplica los contratos desde el primer cambio funcional), frontend (consume `contrato-api`; su responsable lo revisa), copiloto (implementa `contrato-copiloto`; su responsable lo revisa) y bd (convenciones de tablas, columnas, restricciones y migraciones).
- **Archivos nuevos:** `docs/convenciones.md`, `CONTRIBUTING.md`, `.github/CODEOWNERS`. **Archivos modificados:** `openspec/config.yaml`, `.gitignore`.
- **Sin código, dependencias ni cambios en Supabase.** Los esquemas exactos (`openapi.json`) se generarán en los cambios que implementen cada servicio.
- **Pendientes externos que no bloquean:**
  - Tenant de Microsoft 365 de SUNASS.
  - Usuarios de GitHub de cada responsable para CODEOWNERS.
  - Persona designada para aplicar las migraciones en el proyecto compartido de Supabase.
