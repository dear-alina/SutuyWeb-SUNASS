## 1. Convenciones

- [x] 1.1 Crear `docs/convenciones.md` con las reglas de nombres. Debe cubrir:
  - funciones, booleanos, ids y códigos, siglas, singular y plural;
  - archivos, constantes y variables de entorno;
  - tablas, columnas, restricciones e índices con comillas en PostgreSQL;
  - rutas, catálogos, fechas y excepciones con su fuente (design.md D1–D4).

  Verificar que cada regla tiene al menos un ejemplo del proyecto y que ningún identificador de ejemplo lleva tilde ni ñ.
- [x] 1.2 Agregar a `openspec/config.yaml`:
  - en `context`: un resumen breve que apunte a `docs/convenciones.md`, la precisión «backend monolito modular + servicio copiloto» y la regla de valores de catálogo del dataset;
  - en `rules`: para `design`, «usar los nombres de docs/convenciones.md»; para `tasks`, «incluir pruebas de contrato si cambia una interfaz».

  Verificar con `openspec validate acordar-convenciones-y-contratos` y revisando `openspec instructions design --change acordar-convenciones-y-contratos --json`, donde deben aparecer las reglas nuevas.

## 2. Reglas de trabajo

- [x] 2.1 Crear `CONTRIBUTING.md`. Debe incluir:
  - la tabla de responsabilidades (design.md D7);
  - las ramas por cambio con PR a `main`;
  - el formato de commits `tipo: descripción en infinitivo`;
  - la regla de que los cambios compartidos los aprueban ambos responsables;
  - preparar migraciones frente a aplicarlas (lo hace la persona designada, después del PR);
  - el uso de datos sintéticos y la prohibición de secretos.

  Verificar que el texto es breve y no contradice el README ni `config.yaml`.
- [x] 2.2 Crear `.github/CODEOWNERS`. Los contratos, `openspec/config.yaml`, `README.md`, `.gitignore`, `CONTRIBUTING.md` y `.github/` deben requerir a ambos responsables. Los usuarios de GitHub van como marcadores comentados hasta confirmarlos, para no notificar a nadie por error. Verificar que la sintaxis sea válida.

## 3. Repositorio

- [x] 3.1 Cambiar `supabase/.temp/` y `supabase/.branches/` del `.gitignore` por `**/supabase/.temp/` y `**/supabase/.branches/`. Verificar que `git check-ignore -v bd/supabase/.temp/x` muestra la regla y que `git check-ignore bd/supabase/migrations/x.sql` no devuelve nada.

## 4. Revisión

- [x] 4.1 Verificar con `openspec validate acordar-convenciones-y-contratos --strict` que las specs `contrato-api` y `contrato-copiloto` son válidas.
- [x] 4.2 Revisar los ejemplos JSON de las specs y de `docs/convenciones.md`: todas las claves deben cumplir `^[a-z][a-zA-Z0-9]*$` (salvo los campos de RFC 9457), todos los valores de catálogo deben venir del dataset y no debe haber contraseñas, datos personales ni datos del prototipo simulado.
- [x] 4.3 Sugerir los mensajes de commit (`docs: …`, `chore: …`) y la rama, sin ejecutarlos. Dejar anotado en el PR que deben aprobarlo los responsables del frontend y del copiloto antes de archivar.
