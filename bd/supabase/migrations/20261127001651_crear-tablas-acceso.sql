-- Tablas de identidad y acceso: catálogo de EPS, perfiles y solicitudes de acceso.
-- Cambio OpenSpec: crear-tablas-acceso. Convenciones: acordar-convenciones-y-contratos.
-- Las claves viven solo en Supabase Auth; estas tablas no guardan ninguna.

-- ---------------------------------------------------------------------------
-- Función genérica para mantener "actualizadoEn"
-- ---------------------------------------------------------------------------
create function public."fijarActualizadoEn"()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new."actualizadoEn" := now();
  return new;
end;
$$;

revoke execute on function public."fijarActualizadoEn"() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- eps: catálogo de empresas prestadoras
-- ---------------------------------------------------------------------------
create table public.eps (
  "epsId"     uuid        not null default gen_random_uuid(),
  "codigoEps" text        not null,
  nombre      text        not null,
  ruc         text,
  "creadoEn"  timestamptz not null default now(),
  constraint "pkEps" primary key ("epsId"),
  constraint "uqEpsCodigoEps" unique ("codigoEps"),
  constraint "uqEpsNombre" unique (nombre),
  constraint "uqEpsRuc" unique (ruc),
  constraint "ckEpsCodigoEps" check ("codigoEps" ~ '^EPS[0-9]{2}$'),
  constraint "ckEpsNombre" check (btrim(nombre) <> ''),
  constraint "ckEpsRuc" check (ruc is null or ruc ~ '^[0-9]{11}$')
);

comment on table public.eps is 'Catálogo de empresas prestadoras de servicios de saneamiento.';

-- ---------------------------------------------------------------------------
-- perfiles: datos de negocio de cada usuario de Supabase Auth (relación 1:1)
-- ---------------------------------------------------------------------------
create table public.perfiles (
  "usuarioId"     uuid        not null,
  nombre          text        not null,
  cargo           text,
  rol             text        not null,
  area            text,
  "epsId"         uuid,
  proveedor       text        not null default 'correo',
  activo          boolean     not null default true,
  "creadoEn"      timestamptz not null default now(),
  "actualizadoEn" timestamptz not null default now(),
  constraint "pkPerfiles" primary key ("usuarioId"),
  constraint "fkPerfilesUsuarioId" foreign key ("usuarioId")
    references auth.users (id) on delete cascade,
  constraint "fkPerfilesEpsId" foreign key ("epsId")
    references public.eps ("epsId") on delete restrict,
  constraint "ckPerfilesNombre" check (btrim(nombre) <> ''),
  constraint "ckPerfilesRol" check (rol in ('admin', 'sunass', 'eps')),
  constraint "ckPerfilesArea" check (
    area is null or area in ('ep', 'dre', 'srt', 'equipo_srt', 'oaj', 'du', 'gg', 'cd')
  ),
  constraint "ckPerfilesProveedor" check (proveedor in ('correo', 'microsoft')),
  constraint "ckPerfilesRolAreaEps" check (
    (rol = 'eps'    and area = 'ep' and "epsId" is not null)
    or (rol = 'sunass' and area is not null and area <> 'ep' and "epsId" is null)
    or (rol = 'admin'  and area is null and "epsId" is null)
  )
);

create index "ixPerfilesEpsId" on public.perfiles ("epsId");

create trigger "tgPerfilesActualizadoEn"
  before update on public.perfiles
  for each row execute function public."fijarActualizadoEn"();

comment on table public.perfiles is 'Rol, área y EPS de cada usuario de Supabase Auth. Sin perfil activo no hay inicio de sesión.';

-- ---------------------------------------------------------------------------
-- solicitudesAcceso: registro de una EPS pendiente de aprobación del Admin
-- ---------------------------------------------------------------------------
create table public."solicitudesAcceso" (
  "solicitudAccesoId" uuid        not null default gen_random_uuid(),
  "usuarioId"         uuid,
  "epsId"             uuid        not null,
  nombre              text        not null,
  cargo               text,
  correo              text        not null,
  estado              text        not null default 'pendiente',
  "motivoRechazo"     text,
  "solicitadoEn"      timestamptz not null default now(),
  "resueltoEn"        timestamptz,
  "resueltoPorId"     uuid,
  constraint "pkSolicitudesAcceso" primary key ("solicitudAccesoId"),
  -- Al rechazar, el backend borra el usuario de Auth; la solicitud queda como historial.
  constraint "fkSolicitudesAccesoUsuarioId" foreign key ("usuarioId")
    references auth.users (id) on delete set null,
  constraint "fkSolicitudesAccesoEpsId" foreign key ("epsId")
    references public.eps ("epsId") on delete restrict,
  -- Quien resolvió una solicitud no se borra: se desactiva (activo = false).
  constraint "fkSolicitudesAccesoResueltoPorId" foreign key ("resueltoPorId")
    references public.perfiles ("usuarioId") on delete restrict,
  constraint "ckSolicitudesAccesoNombre" check (btrim(nombre) <> ''),
  constraint "ckSolicitudesAccesoCorreo" check (correo ~ '^[^@\s]+@[^@\s]+$'),
  constraint "ckSolicitudesAccesoEstado" check (estado in ('pendiente', 'aprobada', 'rechazada')),
  constraint "ckSolicitudesAccesoResolucion" check (
    (estado = 'pendiente'
      and "resueltoEn" is null and "resueltoPorId" is null and "motivoRechazo" is null)
    or (estado = 'aprobada'
      and "resueltoEn" is not null and "resueltoPorId" is not null and "motivoRechazo" is null)
    or (estado = 'rechazada'
      and "resueltoEn" is not null and "resueltoPorId" is not null
      and coalesce(btrim("motivoRechazo"), '') <> '')
  )
);

create unique index "uqSolicitudesAccesoCorreoPendiente"
  on public."solicitudesAcceso" (lower(correo))
  where estado = 'pendiente';

create index "ixSolicitudesAccesoEstadoSolicitadoEn"
  on public."solicitudesAcceso" (estado, "solicitadoEn");

create index "ixSolicitudesAccesoEpsId" on public."solicitudesAcceso" ("epsId");

comment on table public."solicitudesAcceso" is 'Solicitudes de acceso de usuarios EPS. Una sola pendiente por correo.';

-- ---------------------------------------------------------------------------
-- expedientes: un trámite de una EPS ante Sunass
-- ---------------------------------------------------------------------------
create table public.expedientes (
  "expedienteId"           uuid          not null default gen_random_uuid(),
  "codigoExpediente"       text          not null,
  "epsId"                  uuid          not null,
  "tipoProcedimiento"      text          not null,
  estado                   text          not null default 'en_tramite',
  "fechaInicio"            date          not null,
  "plazoMaximoDiasHabiles" integer,
  "montoSolicitado"        numeric(14,2),
  "creadoEn"               timestamptz   not null default now(),
  constraint "pkExpedientes" primary key ("expedienteId"),
  constraint "uqExpedientesCodigoExpediente" unique ("codigoExpediente"),
  constraint "fkExpedientesEpsId" foreign key ("epsId")
    references public.eps ("epsId") on delete restrict,
  constraint "ckExpedientesCodigoExpediente"
    check ("codigoExpediente" ~ '^(CPI|RP|RPI|RTI|UFI|VCI)-[0-9]{4}-[0-9]{4}$'),
  constraint "ckExpedientesTipoProcedimiento" check ("tipoProcedimiento" in (
    'cambio_programa_inversiones', 'reajuste_ipm', 'reporte_periodico',
    'revision_periodica', 'uso_excepcional_fondo', 'verificacion_incremento'
  )),
  constraint "ckExpedientesEstado" check (estado in ('en_tramite', 'concluido', 'archivado')),
  -- El prefijo del código corresponde al procedimiento.
  constraint "ckExpedientesCodigoTipo" check (
    split_part("codigoExpediente", '-', 1) = case "tipoProcedimiento"
      when 'cambio_programa_inversiones' then 'CPI'
      when 'revision_periodica'          then 'RP'
      when 'reporte_periodico'           then 'RPI'
      when 'reajuste_ipm'                then 'RTI'
      when 'uso_excepcional_fondo'       then 'UFI'
      when 'verificacion_incremento'     then 'VCI'
    end
  ),
  constraint "ckExpedientesPlazoMaximoDiasHabiles"
    check ("plazoMaximoDiasHabiles" is null or "plazoMaximoDiasHabiles" > 0),
  constraint "ckExpedientesMontoSolicitado"
    check ("montoSolicitado" is null or "montoSolicitado" >= 0)
);

create index "ixExpedientesEpsId" on public.expedientes ("epsId");

comment on table public.expedientes is 'Expedientes de las EPS. codigoExpediente es el código legible; expedienteId, la clave técnica.';

-- ---------------------------------------------------------------------------
-- documentos: documentos vinculados a un expediente, con su nivel de acceso
-- ---------------------------------------------------------------------------
create table public.documentos (
  "documentoId"     uuid        not null default gen_random_uuid(),
  "codigoDocumento" text        not null,
  "expedienteId"    uuid        not null,
  "codigoActuacion" text,
  "tipoDocumento"   text        not null,
  "numeroDocumento" text,
  "fechaDocumento"  date,
  asunto            text,
  folios            integer,
  "nivelAcceso"     text        not null,
  "rutaArchivo"     text,
  "creadoEn"        timestamptz not null default now(),
  constraint "pkDocumentos" primary key ("documentoId"),
  constraint "uqDocumentosCodigoDocumento" unique ("codigoDocumento"),
  constraint "fkDocumentosExpedienteId" foreign key ("expedienteId")
    references public.expedientes ("expedienteId") on delete restrict,
  constraint "ckDocumentosCodigoDocumento" check ("codigoDocumento" ~ '^DOC-[0-9]{6}$'),
  constraint "ckDocumentosCodigoActuacion"
    check ("codigoActuacion" is null or "codigoActuacion" ~ '^ACT-[0-9]{6}$'),
  constraint "ckDocumentosTipoDocumento" check ("tipoDocumento" in (
    'acta', 'anexo', 'carta_ep', 'informe', 'memorandum', 'oficio', 'proveido',
    'publicacion_diario_oficial', 'resolucion_consejo_directivo', 'resolucion_directoral'
  )),
  constraint "ckDocumentosNivelAcceso"
    check ("nivelAcceso" in ('publico', 'restringido_partes', 'interno')),
  constraint "ckDocumentosFolios" check (folios is null or folios > 0)
);

create index "ixDocumentosExpedienteId" on public.documentos ("expedienteId");

comment on table public.documentos is 'Documentos de cada expediente. nivelAcceso decide quién los ve y qué puede citar el copiloto.';

-- ---------------------------------------------------------------------------
-- requisitos: catálogo de requisitos por procedimiento, con base normativa
-- ---------------------------------------------------------------------------
create table public.requisitos (
  "requisitoId"           uuid        not null default gen_random_uuid(),
  "codigoRequisito"       text        not null,
  "tipoProcedimiento"     text        not null,
  numero                  integer     not null,
  descripcion             text        not null,
  "baseNormativa"         text        not null,
  "tipoDocumentoEsperado" text,
  "esCandidato"           boolean     not null default false,
  "creadoEn"              timestamptz not null default now(),
  constraint "pkRequisitos" primary key ("requisitoId"),
  constraint "uqRequisitosCodigoRequisito" unique ("codigoRequisito"),
  constraint "uqRequisitosTipoProcedimientoNumero" unique ("tipoProcedimiento", numero),
  constraint "ckRequisitosCodigoRequisito"
    check ("codigoRequisito" ~ '^(CPI|RP|RPI|RTI|UFI|VCI)-R[0-9]{2}$'),
  constraint "ckRequisitosTipoProcedimiento" check ("tipoProcedimiento" in (
    'cambio_programa_inversiones', 'reajuste_ipm', 'reporte_periodico',
    'revision_periodica', 'uso_excepcional_fondo', 'verificacion_incremento'
  )),
  constraint "ckRequisitosTipoDocumentoEsperado" check (
    "tipoDocumentoEsperado" is null or "tipoDocumentoEsperado" in (
      'acta', 'anexo', 'carta_ep', 'informe', 'memorandum', 'oficio', 'proveido',
      'publicacion_diario_oficial', 'resolucion_consejo_directivo', 'resolucion_directoral'
    )
  ),
  constraint "ckRequisitosDescripcion" check (btrim(descripcion) <> ''),
  constraint "ckRequisitosBaseNormativa" check (btrim("baseNormativa") <> ''),
  constraint "ckRequisitosNumero" check (numero > 0)
);

comment on table public.requisitos is 'Requisitos de cada procedimiento según el RGT. esCandidato = true si el texto no se verificó en la norma vigente.';

-- ---------------------------------------------------------------------------
-- Acceso: solo el backend, desde el servidor. RLS sin políticas = denegar todo.
-- ---------------------------------------------------------------------------
alter table public.eps enable row level security;
alter table public.perfiles enable row level security;
alter table public."solicitudesAcceso" enable row level security;
alter table public.expedientes enable row level security;
alter table public.documentos enable row level security;
alter table public.requisitos enable row level security;

revoke all on table public.eps from anon, authenticated;
revoke all on table public.perfiles from anon, authenticated;
revoke all on table public."solicitudesAcceso" from anon, authenticated;
revoke all on table public.expedientes from anon, authenticated;
revoke all on table public.documentos from anon, authenticated;
revoke all on table public.requisitos from anon, authenticated;
