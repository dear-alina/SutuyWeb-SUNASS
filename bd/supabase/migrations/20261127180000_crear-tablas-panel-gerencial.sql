-- Cambio implementar-panel-gerencial: datos que necesita el panel gerencial de la DRE.
-- - expedientes: resultado y fecha de conclusión.
-- - hitos: recorrido de cada expediente por las áreas (ds02_hitos_procedimientos).
--   Los días de suspensión no se guardan: se derivan de los hitos con "cuentaPlazo" = false.
-- - diasNoHabiles: días no laborables por decreto y otros días no hábiles que la norma no fija de antemano.
--   Los feriados nacionales fijos y los de Semana Santa los calcula el backend.

-- ---------------------------------------------------------------------------
-- expedientes: conclusión
-- ---------------------------------------------------------------------------
alter table public.expedientes
  add column resultado         text,
  add column "fechaConclusion" date,
  add constraint "ckExpedientesFechaConclusion"
    check ("fechaConclusion" is null or "fechaConclusion" >= "fechaInicio"),
  add constraint "ckExpedientesResultado"
    check (resultado is null or btrim(resultado) <> '');

comment on column public.expedientes.resultado is 'Resultado con el catálogo del dataset (aprobado, aprobado_parcial, denegado, presentado_a_tiempo…).';

-- ---------------------------------------------------------------------------
-- hitos: cada paso del expediente, con su área responsable y sus fechas
-- ---------------------------------------------------------------------------
create table public.hitos (
  "hitoId"                       uuid        not null default gen_random_uuid(),
  "expedienteId"                 uuid        not null,
  numero                         integer     not null,
  etapa                          text,
  "codigoHito"                   text        not null,
  descripcion                    text,
  responsable                    text        not null,
  "iniciadoEn"                   date        not null,
  "finalizadoEn"                 date,
  "plazoReferencialDiasHabiles"  integer,
  "cuentaPlazo"                  boolean     not null default true,
  "numeroDocumento"              text,
  "creadoEn"                     timestamptz not null default now(),
  constraint "pkHitos" primary key ("hitoId"),
  constraint "fkHitosExpedienteId" foreign key ("expedienteId")
    references public.expedientes ("expedienteId") on delete cascade,
  constraint "uqHitosExpedienteIdNumero" unique ("expedienteId", numero),
  constraint "ckHitosNumero" check (numero > 0),
  constraint "ckHitosCodigoHito" check ("codigoHito" ~ '^[a-z][a-z0-9_]*$'),
  constraint "ckHitosResponsable" check (responsable in (
    'ep', 'ep_e_interesados', 'dre', 'srt', 'equipo_srt', 'oaj', 'du', 'gg', 'cd', 'inei'
  )),
  constraint "ckHitosPlazoReferencialDiasHabiles"
    check ("plazoReferencialDiasHabiles" is null or "plazoReferencialDiasHabiles" > 0)
);

create index "ixHitosExpedienteId" on public.hitos ("expedienteId");

comment on table public.hitos is
  'Recorrido de cada expediente. "cuentaPlazo" = false marca los días de la EP que suspenden el plazo de Sunass. '
  'No se exige "finalizadoEn" >= "iniciadoEn": el panel gerencial reporta esa inconsistencia como problema de calidad de datos.';

-- ---------------------------------------------------------------------------
-- diasNoHabiles: días que no cuentan además de sábados, domingos y feriados nacionales
-- ---------------------------------------------------------------------------
create table public."diasNoHabiles" (
  fecha            date        not null,
  tipo             text        not null,
  descripcion      text        not null,
  "baseNormativa"  text,
  "creadoEn"       timestamptz not null default now(),
  constraint "pkDiasNoHabiles" primary key (fecha),
  constraint "ckDiasNoHabilesTipo" check (tipo in ('dia_no_laborable', 'feriado_adicional')),
  constraint "ckDiasNoHabilesDescripcion" check (btrim(descripcion) <> '')
);

comment on table public."diasNoHabiles" is
  'Días no laborables declarados por decreto supremo y feriados adicionales. Los registra la persona designada con su base normativa.';

-- ---------------------------------------------------------------------------
-- Acceso: solo el backend, desde el servidor. RLS sin políticas = denegar todo.
-- ---------------------------------------------------------------------------
alter table public.hitos enable row level security;
alter table public."diasNoHabiles" enable row level security;

revoke all on table public.hitos from anon, authenticated;
revoke all on table public."diasNoHabiles" from anon, authenticated;
