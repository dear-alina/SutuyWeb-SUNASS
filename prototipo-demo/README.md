# Prototipo navegable para la demo

`index.html` es un solo archivo que reproduce las pantallas del frontend, desde el ingreso hasta el panel de la Dirección de Regulación Económica. Usa los datos sintéticos de `bd/supabase/seed.sql` y no necesita backend.

- **Modo interactivo:** se elige una cuenta de demostración en el ingreso y cada botón hace avanzar el expediente.
- **Modo guion:** el botón «Guion de la demo» recorre los 12 pasos de la presentación.

El estado se guarda en el navegador. «Restablecer datos» vuelve a la semilla.

## Regenerar

`fuente/` contiene el motor del flujo, las pantallas y los estilos propios del prototipo. Los estilos de `frontend/src/estilos` se copian al armar el archivo. Esta versión se armó con los de la rama `conectar-expedientes-api`:

```bash
python fuente/armar.py ../frontend index.html
```

Se publica en Vercel como sitio estático, con este directorio como raíz.
