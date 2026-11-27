-- Asigna el perfil admin a un usuario que ya existe en Supabase Auth.
--
-- Uso:
--   1. Crear el usuario en el dashboard: Authentication → Users → Add user (correo y clave).
--   2. Reemplazar el correo y el nombre de abajo. No escribas claves en este archivo.
--   3. Ejecutar el script en el SQL Editor del proyecto (o con psql contra la base local).
-- Si el perfil ya existe, lo convierte en admin activo, sin área ni EPS.
-- No guardes en el repositorio este archivo con datos reales.

do $$
declare
  correo_admin constant text := 'admin@ejemplo.test';   -- ← correo del usuario creado en Auth
  nombre_admin constant text := 'Administración SutuyWeb'; -- ← nombre visible del perfil
  usuario_id uuid;
begin
  select id into usuario_id
  from auth.users
  where lower(email) = lower(correo_admin);

  if usuario_id is null then
    raise exception 'No existe en Supabase Auth un usuario con el correo %. Créalo primero en Authentication → Users.', correo_admin;
  end if;

  insert into public.perfiles ("usuarioId", nombre, rol, area, "epsId", proveedor, activo)
  values (usuario_id, nombre_admin, 'admin', null, null, 'correo', true)
  on conflict ("usuarioId") do update
    set rol = 'admin',
        area = null,
        "epsId" = null,
        activo = true;

  raise notice 'El usuario % ahora es admin.', correo_admin;
end;
$$;
