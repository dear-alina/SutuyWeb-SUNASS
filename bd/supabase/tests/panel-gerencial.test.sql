-- Pruebas de las tablas del panel gerencial (cambio implementar-panel-gerencial).
-- Se ejecutan solo contra la base local: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select has_table('public', 'hitos', 'existe la tabla hitos');
select has_table('public', 'diasNoHabiles', 'existe la tabla diasNoHabiles');

select throws_ok(
  $$ insert into public.hitos ("expedienteId", numero, "codigoHito", responsable, "iniciadoEn")
     select "expedienteId", 1, 'solicitud', 'mesa_de_partes', '2026-09-01' from public.expedientes where "codigoExpediente" = 'UFI-2026-0001' $$,
  '23514', null,
  'rechaza un responsable fuera del catálogo de áreas'
);

select lives_ok(
  $$ insert into public.hitos ("expedienteId", numero, "codigoHito", responsable, "iniciadoEn", "finalizadoEn", "plazoReferencialDiasHabiles")
     select "expedienteId", 1, 'derivacion', 'dre', '2026-09-01', '2026-09-02', 1 from public.expedientes where "codigoExpediente" = 'UFI-2026-0001' $$,
  'acepta un hito válido'
);

select throws_ok(
  $$ insert into public.hitos ("expedienteId", numero, "codigoHito", responsable, "iniciadoEn")
     select "expedienteId", 1, 'asignacion', 'srt', '2026-09-02' from public.expedientes where "codigoExpediente" = 'UFI-2026-0001' $$,
  '23505', null,
  'rechaza dos hitos con el mismo número en un expediente'
);

select throws_ok(
  $$ update public.expedientes set "fechaConclusion" = '2026-08-01' where "codigoExpediente" = 'UFI-2026-0001' $$,
  '23514', null,
  'rechaza una conclusión anterior al inicio'
);

select throws_ok(
  $$ insert into public."diasNoHabiles" (fecha, tipo, descripcion) values ('2026-12-24', 'feriado_regional', 'Prueba') $$,
  '23514', null,
  'rechaza un tipo de día no hábil desconocido'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.hitos'::regclass),
  'hitos tiene RLS activo'
);

select ok(
  not has_table_privilege('authenticated', 'public."diasNoHabiles"', 'select'),
  'authenticated no puede leer diasNoHabiles'
);

select * from finish();
rollback;
