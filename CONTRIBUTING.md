# Cómo contribuir

Cada parte del proyecto tiene una persona responsable. Esta guía dice quién puede modificar qué y cómo se integra el trabajo. Las convenciones de nombres están en [`docs/convenciones.md`](docs/convenciones.md).

## Responsabilidades

| Elemento | Lo modifica su responsable | Requiere coordinación | Las demás personas solo ejecutan o consultan |
|---|---|---|---|
| `backend/**` | Responsable del backend | Cambios incompatibles en la API | ✔ |
| `bd/` | Responsable del backend: prepara y prueba en local | Aplicar en el proyecto compartido de Supabase | |
| `frontend/**` | Responsable del frontend | Issue o PR a su responsable | ✔ |
| `copiloto/**` | Responsable del copiloto | Cambios en el contrato | ✔ |
| Specs `contrato-*`, `openspec/config.yaml`, `README.md`, `.gitignore`, `CONTRIBUTING.md`, `.github/` | | Los aprueban los responsables de las partes afectadas | |
| `.claude/`, `.agents/` | | Se regeneran con `openspec update` | ✔ |

## Flujo de trabajo

1. Cada cambio empieza como propuesta de OpenSpec en `openspec/changes/<nombre-del-cambio>/`.
2. Se trabaja en una rama con el nombre del cambio (`acordar-convenciones-y-contratos`) y se abre un PR a `main`. No se hace push directo a `main`.
3. Los commits siguen el formato `tipo: descripción en infinitivo`, con `tipo` = `feat`, `fix`, `chore`, `docs`, `test` o `refactor`. Ejemplo: `docs: agregar las convenciones de nombres`.
4. Un cambio que toca un contrato o un archivo compartido (ver tabla) no se fusiona hasta que lo aprueben todos los responsables afectados. Un cambio incompatible en un contrato necesita su propio cambio de OpenSpec.
5. Después de fusionar e implementar, se archiva el cambio con `openspec archive`.

## Cómo se construye una pantalla

1. Se parte de la pantalla tal como está en la rama `frontend`.
2. Se listan sus funcionalidades mínimas, según las specs y los contratos de OpenSpec, aunque la pantalla ya exista, y se confirman antes de implementar.
3. Si falta algo, se agrega en la rama `frontend`, en commits propios que revisa la responsable del frontend.
4. El backend se construye en su propia rama, conectado a la base de datos, con pruebas contra Supabase local.
5. La pantalla se conecta a la API real.

Los datos simulados del frontend (`frontend/src/demo/`) son solo para demostraciones; el backend nunca los usa.

## Base de datos

- **Preparar** una migración (escribirla con `npx supabase migration new`, probarla con `npx supabase db reset` y pgTAP en local) lo hace quien desarrolla el cambio.
- **Aplicarla** en el proyecto compartido de Supabase (`npx supabase db push`) lo hace solo la persona designada, después de que el PR esté aprobado y fusionado.
- Las pruebas corren contra Supabase local y abortan si `SUPABASE_URL` o `DATABASE_URL` no apuntan a localhost.

## Datos y secretos

El repositorio es público.

- Solo datos sintéticos. Nunca datos personales, expedientes reales, documentos confidenciales ni una copia de la base.
- Nunca secretos: ni archivos `.env`, ni claves `service_role`, ni contraseñas, ni tokens. Los `.env.example` llevan valores ficticios.
- Los datos simulados del prototipo (usuarios y claves de prueba, EPS de demostración) no pasan al MVP.
