-- Pruebas de la capacidad expedientes-documentos (cambio crear-tablas-acceso).
-- Usan los datos de prueba de seed.sql. Se ejecutan solo contra la base local: npx supabase test db
begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- ---------------------------------------------------------------------------
-- Requirement: Expediente con identificador y código únicos
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.expedientes ("codigoExpediente", "epsId", "tipoProcedimiento", "fechaInicio")
     select 'UFI-2026-0001', "epsId", 'uso_excepcional_fondo', '2026-11-27' from public.eps where "codigoEps" = 'EPS01' $$,
  '23505', null,
  'rechaza un codigoExpediente duplicado'
);

select throws_ok(
  $$ insert into public.expedientes ("codigoExpediente", "epsId", "tipoProcedimiento", "fechaInicio")
     select 'RP-2026-0099', "epsId", 'uso_excepcional_fondo', '2026-11-27' from public.eps where "codigoEps" = 'EPS01' $$,
  '23514', null,
  'rechaza un prefijo que no corresponde al procedimiento'
);

select throws_ok(
  $$ insert into public.expedientes ("codigoExpediente", "epsId", "tipoProcedimiento", "fechaInicio")
     values ('UFI-2026-0099', gen_random_uuid(), 'uso_excepcional_fondo', '2026-11-27') $$,
  '23503', null,
  'rechaza un expediente de una EPS inexistente'
);

select throws_ok(
  $$ delete from public.eps where "codigoEps" = 'EPS07' $$,
  '23503', null,
  'no se puede eliminar una EPS con expedientes'
);

select throws_ok(
  $$ insert into public.expedientes ("codigoExpediente", "epsId", "tipoProcedimiento", "fechaInicio")
     select 'ufi-2026-0099', "epsId", 'uso_excepcional_fondo', '2026-11-27' from public.eps where "codigoEps" = 'EPS01' $$,
  '23514', null,
  'rechaza un codigoExpediente con formato inválido'
);

select lives_ok(
  $$ insert into public.expedientes ("codigoExpediente", "epsId", "tipoProcedimiento", "fechaInicio", "montoSolicitado")
     select 'UFI-2026-0099', "epsId", 'uso_excepcional_fondo', '2026-11-27', 1250000.00 from public.eps where "codigoEps" = 'EPS01' $$,
  'acepta un expediente válido'
);

-- ---------------------------------------------------------------------------
-- Requirement: Catálogos del dataset sin traducir
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ update public.expedientes set estado = 'enTramite' where "codigoExpediente" = 'UFI-2026-0099' $$,
  '23514', null,
  'rechaza estado = enTramite'
);

select throws_ok(
  $$ update public.documentos set "nivelAcceso" = 'privado' where "codigoDocumento" = 'DOC-000410' $$,
  '23514', null,
  'rechaza nivelAcceso = privado'
);

select throws_ok(
  $$ update public.documentos set "tipoDocumento" = 'resolucion_cd' where "codigoDocumento" = 'DOC-000410' $$,
  '23514', null,
  'rechaza un tipoDocumento fuera del catálogo'
);

-- ---------------------------------------------------------------------------
-- Requirement: Documentos vinculados a un expediente
-- ---------------------------------------------------------------------------
select throws_ok(
  $$ insert into public.documentos ("codigoDocumento", "expedienteId", "tipoDocumento")
     select 'DOC-999901', "expedienteId", 'informe' from public.expedientes where "codigoExpediente" = 'UFI-2026-0099' $$,
  '23502', null,
  'rechaza un documento sin nivelAcceso'
);

select throws_ok(
  $$ insert into public.documentos ("codigoDocumento", "expedienteId", "tipoDocumento", "nivelAcceso")
     values ('DOC-999902', gen_random_uuid(), 'informe', 'interno') $$,
  '23503', null,
  'rechaza un documento de un expediente inexistente'
);

select throws_ok(
  $$ insert into public.documentos ("codigoDocumento", "expedienteId", "tipoDocumento", "nivelAcceso")
     select 'DOC-12', "expedienteId", 'informe', 'interno' from public.expedientes where "codigoExpediente" = 'UFI-2026-0099' $$,
  '23514', null,
  'rechaza un codigoDocumento con formato inválido'
);

select throws_ok(
  $$ delete from public.expedientes where "codigoExpediente" = 'UFI-2026-0001' $$,
  '23503', null,
  'no se puede eliminar un expediente con documentos'
);

-- ---------------------------------------------------------------------------
-- Requirement: Requisitos por procedimiento con base normativa
-- ---------------------------------------------------------------------------
select is(
  (select array_agg("codigoRequisito" order by numero) from public.requisitos
   where "tipoProcedimiento" = 'uso_excepcional_fondo' and "baseNormativa" like 'RGT art. 89.2%'),
  array['UFI-R01', 'UFI-R02', 'UFI-R03'],
  'existen UFI-R01..R03 con base en el art. 89.2'
);

select is(
  (select "tipoDocumentoEsperado" from public.requisitos where "codigoRequisito" = 'UFI-R01'),
  'informe',
  'UFI-R01 exige un documento de tipo informe'
);

select throws_ok(
  $$ insert into public.requisitos ("codigoRequisito", "tipoProcedimiento", numero, descripcion, "baseNormativa")
     values ('UFI-R09', 'uso_excepcional_fondo', 1, 'Requisito repetido', 'RGT art. 89.2') $$,
  '23505', null,
  'rechaza un número de orden repetido en el mismo procedimiento'
);

select throws_ok(
  $$ insert into public.requisitos ("codigoRequisito", "tipoProcedimiento", numero, descripcion, "baseNormativa")
     values ('UFI-R10', 'uso_excepcional_fondo', 10, '  ', 'RGT art. 89.2') $$,
  '23514', null,
  'rechaza un requisito sin descripción'
);

-- ---------------------------------------------------------------------------
-- Requirement: Expedientes de demostración
-- ---------------------------------------------------------------------------
select results_eq(
  $$ select x."codigoEps", e."tipoProcedimiento", e.estado, e."montoSolicitado"::text
     from public.expedientes e join public.eps x using ("epsId")
     where e."codigoExpediente" = 'UFI-2026-0001' $$,
  $$ values ('EPS07', 'uso_excepcional_fondo', 'concluido', '436594.67') $$,
  'UFI-2026-0001 está ligado a EPS07 con su monto y su estado al 20/11/2026'
);

select is(
  (select count(*)::int from public.documentos d join public.expedientes e using ("expedienteId")
   where e."codigoExpediente" = 'UFI-2026-0001'),
  7,
  'UFI-2026-0001 tiene 7 documentos'
);

select results_eq(
  $$ select x."codigoEps", e."tipoProcedimiento", e.estado,
            (select count(*)::int from public.documentos d where d."expedienteId" = e."expedienteId")
     from public.expedientes e join public.eps x using ("epsId")
     where e."codigoExpediente" = 'RP-2026-0002' $$,
  $$ values ('EPS04', 'revision_periodica', 'en_tramite', 15) $$,
  'RP-2026-0002 está ligado a EPS04, en trámite, con 15 documentos'
);

select set_eq(
  $$ select distinct "nivelAcceso" from public.documentos $$,
  array['publico', 'restringido_partes', 'interno'],
  'los documentos de demostración cubren los tres niveles de acceso'
);

-- ---------------------------------------------------------------------------
-- Requirement: Sin acceso directo desde clientes de Supabase
-- ---------------------------------------------------------------------------
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.expedientes'::regclass, 'public.documentos'::regclass, 'public.requisitos'::regclass)),
  'expedientes, documentos y requisitos tienen RLS activado'
);

select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename in ('expedientes', 'documentos', 'requisitos')),
  0,
  'expedientes, documentos y requisitos no tienen políticas'
);

-- Intento real: lectura anónima de documentos
set local role anon;
select throws_ok(
  $$ select * from public.documentos $$,
  '42501', null,
  'anon no puede leer los documentos'
);
reset role;

-- Intento real: un usuario autenticado intenta publicar un documento interno
set local role authenticated;
select throws_ok(
  $$ update public.documentos set "nivelAcceso" = 'publico' where "nivelAcceso" = 'interno' $$,
  '42501', null,
  'authenticated no puede cambiar el nivel de acceso de un documento'
);
reset role;

select * from finish();
rollback;
