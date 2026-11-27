-- Pruebas de la capacidad acceso-usuarios (cambio crear-tablas-acceso).
-- Se ejecutan solo contra la base local: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- Usuarios de Auth de prueba (se descartan con el rollback final)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'eps.uno@prueba.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'sunass.dre@prueba.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@prueba.test'),
  ('00000000-0000-0000-0000-0000000000a4', 'borrar@prueba.test'),
  ('00000000-0000-0000-0000-0000000000a5', 'solicitante@prueba.test');

-- ---------------------------------------------------------------------------
-- Requirement: Catálogo de EPS
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.eps where "codigoEps" ~ '^EPS(0[1-9]|1[0-9]|20)$'),
  20,
  'existen las 20 EPS sintéticas EPS01..EPS20'
);

select is(
  (select nombre from public.eps where "codigoEps" = 'EPS01'),
  'EPS Agua Viva S.A.',
  'la EPS01 conserva su nombre del dataset'
);

select throws_ok(
  $$ insert into public.eps ("codigoEps", nombre) values ('EPS01', 'Otra EPS S.A.') $$,
  '23505', null,
  'rechaza un codigoEps duplicado'
);

select throws_ok(
  $$ insert into public.eps ("codigoEps", nombre) values ('eps1', 'EPS Formato S.A.') $$,
  '23514', null,
  'rechaza un codigoEps con formato inválido'
);

select throws_ok(
  $$ insert into public.eps ("codigoEps", nombre, ruc) values ('EPS99', 'EPS Ruc S.A.', '123') $$,
  '23514', null,
  'rechaza un RUC que no tiene 11 dígitos'
);

-- ---------------------------------------------------------------------------
-- Requirement: Catálogos cerrados / coherencia rol-área-EPS
-- ---------------------------------------------------------------------------
select lives_ok(
  $$
    insert into public.perfiles ("usuarioId", nombre, rol, area, "epsId") values
      ('00000000-0000-0000-0000-0000000000a1', 'Usuaria EPS', 'eps', 'ep',
        (select "epsId" from public.eps where "codigoEps" = 'EPS01')),
      ('00000000-0000-0000-0000-0000000000a2', 'Usuario DRE', 'sunass', 'dre', null),
      ('00000000-0000-0000-0000-0000000000a3', 'Admin', 'admin', null, null)
  $$,
  'acepta perfiles eps, sunass y admin coherentes'
);

select throws_ok(
  $$ insert into public.perfiles ("usuarioId", nombre, rol) values
       ('00000000-0000-0000-0000-0000000000a4', 'X', 'supervisor') $$,
  '23514', null,
  'rechaza un rol desconocido'
);

select throws_ok(
  $$ insert into public.perfiles ("usuarioId", nombre, rol, area) values
       ('00000000-0000-0000-0000-0000000000a4', 'X', 'sunass', 'Equipo SRT') $$,
  '23514', null,
  'rechaza el área con formato del prototipo (Equipo SRT)'
);

select throws_ok(
  $$ insert into public.perfiles ("usuarioId", nombre, rol, area, proveedor) values
       ('00000000-0000-0000-0000-0000000000a4', 'X', 'sunass', 'srt', 'google') $$,
  '23514', null,
  'rechaza un proveedor desconocido'
);

select throws_ok(
  $$ insert into public.perfiles ("usuarioId", nombre, rol, area) values
       ('00000000-0000-0000-0000-0000000000a4', 'X', 'eps', 'ep') $$,
  '23514', null,
  'rechaza un perfil eps sin EPS'
);

select throws_ok(
  $$ insert into public.perfiles ("usuarioId", nombre, rol, area, "epsId") values
       ('00000000-0000-0000-0000-0000000000a4', 'X', 'sunass', 'srt',
        (select "epsId" from public.eps where "codigoEps" = 'EPS02')) $$,
  '23514', null,
  'rechaza un perfil sunass con EPS'
);

select throws_ok(
  $$ insert into public.perfiles ("usuarioId", nombre, rol, area) values
       ('00000000-0000-0000-0000-0000000000a4', 'X', 'admin', 'dre') $$,
  '23514', null,
  'rechaza un perfil admin con área'
);

-- ---------------------------------------------------------------------------
-- Requirement: Perfil ligado al usuario de Supabase Auth
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.perfiles ("usuarioId", nombre, rol, area) values
       ('00000000-0000-0000-0000-0000000000ff', 'Huérfano', 'sunass', 'srt') $$,
  '23503', null,
  'rechaza un perfil sin usuario de Auth'
);

insert into public.perfiles ("usuarioId", nombre, rol, area)
values ('00000000-0000-0000-0000-0000000000a4', 'Por borrar', 'sunass', 'oaj');
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a4';

select is(
  (select count(*)::int from public.perfiles where "usuarioId" = '00000000-0000-0000-0000-0000000000a4'),
  0,
  'el perfil se elimina al eliminar el usuario de Auth'
);

update public.perfiles set "actualizadoEn" = now() - interval '1 day'
where "usuarioId" = '00000000-0000-0000-0000-0000000000a2';
update public.perfiles set cargo = 'Director(a)'
where "usuarioId" = '00000000-0000-0000-0000-0000000000a2';

select ok(
  (select "actualizadoEn" > now() - interval '1 hour' from public.perfiles
   where "usuarioId" = '00000000-0000-0000-0000-0000000000a2'),
  'actualizadoEn se renueva al modificar el perfil'
);

-- ---------------------------------------------------------------------------
-- Requirement: Solicitudes de acceso de EPS
-- ---------------------------------------------------------------------------
insert into public."solicitudesAcceso" ("usuarioId", "epsId", nombre, correo)
values ('00000000-0000-0000-0000-0000000000a5',
        (select "epsId" from public.eps where "codigoEps" = 'EPS03'),
        'Ana', 'ana@eps.example');

select throws_ok(
  $$ insert into public."solicitudesAcceso" ("epsId", nombre, correo)
     values ((select "epsId" from public.eps where "codigoEps" = 'EPS03'), 'Ana', 'ANA@eps.example') $$,
  '23505', null,
  'rechaza una segunda solicitud pendiente con el mismo correo (sin distinguir mayúsculas)'
);

select throws_ok(
  $$ update public."solicitudesAcceso"
     set estado = 'rechazada', "resueltoEn" = now(),
         "resueltoPorId" = '00000000-0000-0000-0000-0000000000a3'
     where correo = 'ana@eps.example' $$,
  '23514', null,
  'rechaza un rechazo sin motivo'
);

select throws_ok(
  $$ update public."solicitudesAcceso" set estado = 'aprobada'
     where correo = 'ana@eps.example' $$,
  '23514', null,
  'rechaza una aprobación sin resolutor ni fecha'
);

update public."solicitudesAcceso"
set estado = 'rechazada', "resueltoEn" = now(),
    "resueltoPorId" = '00000000-0000-0000-0000-0000000000a3',
    "motivoRechazo" = 'La EPS no reconoce a la solicitante'
where correo = 'ana@eps.example';

select lives_ok(
  $$ insert into public."solicitudesAcceso" ("epsId", nombre, correo)
     values ((select "epsId" from public.eps where "codigoEps" = 'EPS03'), 'Ana', 'ana@eps.example') $$,
  'acepta una nueva solicitud después de un rechazo'
);

delete from auth.users where id = '00000000-0000-0000-0000-0000000000a5';

select is(
  (select count(*)::int from public."solicitudesAcceso"
   where correo = 'ana@eps.example' and estado = 'rechazada' and "usuarioId" is null),
  1,
  'la solicitud rechazada se conserva al borrar el usuario de Auth'
);

-- ---------------------------------------------------------------------------
-- Requirement: Sin acceso directo desde clientes de Supabase
-- ---------------------------------------------------------------------------
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.eps'::regclass, 'public.perfiles'::regclass, 'public."solicitudesAcceso"'::regclass)),
  'las tres tablas tienen RLS activado'
);

select ok(
  not has_table_privilege('anon', 'public.perfiles', 'select')
  and not has_table_privilege('anon', 'public.eps', 'select')
  and not has_table_privilege('anon', 'public."solicitudesAcceso"', 'select'),
  'anon no puede leer ninguna de las tablas'
);

select ok(
  not has_table_privilege('authenticated', 'public.perfiles', 'update')
  and not has_table_privilege('authenticated', 'public.perfiles', 'select')
  and not has_table_privilege('authenticated', 'public."solicitudesAcceso"', 'insert')
  and not has_table_privilege('authenticated', 'public.eps', 'insert'),
  'authenticated no puede leer ni modificar las tablas'
);

-- Intento real: un usuario autenticado intenta hacerse admin
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select throws_ok(
  $$ update public.perfiles set rol = 'admin', area = null, "epsId" = null
     where "usuarioId" = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null,
  'un usuario autenticado no puede cambiar su propio rol'
);
reset role;

select * from finish();
rollback;
