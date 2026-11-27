-- Datos sintéticos de prueba: las 20 EPS ficticias de ds01_catalogo_eps (solo código y nombre).
-- No son empresas reales. Se puede ejecutar varias veces.
insert into public.eps ("codigoEps", nombre) values
  ('EPS01', 'EPS Agua Viva S.A.'),
  ('EPS02', 'EPS Manantial S.A.'),
  ('EPS03', 'EPS Cuenca Verde S.A.'),
  ('EPS04', 'EPS Vertiente Andina S.A.'),
  ('EPS05', 'EPS Río Sereno S.A.'),
  ('EPS06', 'EPS Fuente Clara S.A.'),
  ('EPS07', 'EPS Aguas del Valle Alto S.A.'),
  ('EPS08', 'EPS Puquial S.A.'),
  ('EPS09', 'EPS Ojo de Agua S.A.'),
  ('EPS10', 'EPS Nevado Claro S.A.'),
  ('EPS11', 'EPS Caudal S.A.'),
  ('EPS12', 'EPS Aguas de la Quebrada S.A.'),
  ('EPS13', 'EPS Laguna Serena S.A.'),
  ('EPS14', 'EPS Cauce Norte S.A.'),
  ('EPS15', 'EPS Aguas del Llano S.A.'),
  ('EPS16', 'EPS Cascada S.A.'),
  ('EPS17', 'EPS Altovalle S.A.'),
  ('EPS18', 'EPS Aguas del Bosque S.A.'),
  ('EPS19', 'EPS Riachuelo S.A.'),
  ('EPS20', 'EPS Vertiente del Sur S.A.')
on conflict ("codigoEps") do nothing;

-- RUC sintéticos para el inicio de sesión de las EPS: 990000000 + número de la EPS (EPS02 -> 99000000002).
-- El prefijo 99 no es válido en Perú, así que nunca coinciden con un RUC real.
update public.eps
set ruc = '990000000' || substr("codigoEps", 4, 2)
where ruc is null;

-- Requisitos por procedimiento según el Reglamento General de Tarifas (RGT, RCD 028-2021-SUNASS-CD y modificatorias).
-- Las descripciones parafrasean la norma. esCandidato = true marcaría un texto aún no verificado en la norma vigente.
insert into public.requisitos
  ("codigoRequisito", "tipoProcedimiento", numero, descripcion, "baseNormativa", "tipoDocumentoEsperado", "esCandidato")
values
  -- Uso excepcional del fondo de inversiones y reservas (art. 89.2; la RCD 124-2025 no lo modifica)
  ('UFI-R01', 'uso_excepcional_fondo', 1,
   'Informe sobre la propuesta de uso excepcional que explique el caso fortuito o de fuerza mayor.',
   'RGT art. 89.2 num. 1', 'informe', false),
  ('UFI-R02', 'uso_excepcional_fondo', 2,
   'Documentos que sustentan la propuesta de uso excepcional.',
   'RGT art. 89.2 num. 2', 'anexo', false),
  ('UFI-R03', 'uso_excepcional_fondo', 3,
   'Propuesta de devolución de los recursos o de exoneración, parcial o total, de la devolución.',
   'RGT art. 89.2 num. 3', null, false),
  -- Revisión periódica: documentos de la solicitud de inicio (art. 39.2, texto modificado por la RCD 124-2025-SUNASS-CD).
  -- Según el art. 39.3, los num. 1, 4 y 7 y el num. 9 solo se presentan en los supuestos que allí se indican.
  ('RP-R01', 'revision_periodica', 1,
   'Plan Maestro Optimizado (PMO). Se presenta solo en los supuestos del párrafo 39.3.',
   'RGT art. 39.2 num. 1', 'anexo', false),
  ('RP-R02', 'revision_periodica', 2,
   'Información económico-financiera, comercial y operacional señalada en el anexo X.',
   'RGT art. 39.2 num. 2', 'anexo', false),
  ('RP-R03', 'revision_periodica', 3,
   'Propuesta para determinar los costos máximos de las unidades de medida de las actividades de los servicios colaterales.',
   'RGT art. 39.2 num. 3', 'anexo', false),
  ('RP-R04', 'revision_periodica', 4,
   'Copia del acta con el acuerdo de aprobación del PMO. Se presenta solo en los supuestos del párrafo 39.3.',
   'RGT art. 39.2 num. 4', 'acta', false),
  ('RP-R05', 'revision_periodica', 5,
   'Copia del acta con el acuerdo de aprobación de la propuesta de servicios colaterales.',
   'RGT art. 39.2 num. 5', 'acta', false),
  ('RP-R06', 'revision_periodica', 6,
   'Copia del acta con el acuerdo para establecer reservas de uso exclusivo.',
   'RGT art. 39.2 num. 6', 'acta', false),
  ('RP-R07', 'revision_periodica', 7,
   'Archivos de cálculo editables de la tarifa media de mediano y largo plazo, la fórmula tarifaria y la estructura tarifaria. Se presentan solo en los supuestos del párrafo 39.3.',
   'RGT art. 39.2 num. 7', 'anexo', false),
  ('RP-R08', 'revision_periodica', 8,
   'Archivos de cálculo editables de la propuesta de costos máximos de los servicios colaterales.',
   'RGT art. 39.2 num. 8', 'anexo', false),
  ('RP-R09', 'revision_periodica', 9,
   'Plan de Consulta Pública. Se presenta solo en los casos del párrafo 39.3.',
   'RGT art. 39.2 num. 9', 'anexo', false)
on conflict ("codigoRequisito") do nothing;

-- Expedientes de demostración (ficticios, dataset del desafío; incluye la actualización al 20/11/2026).
insert into public.expedientes ("codigoExpediente", "epsId", "tipoProcedimiento", estado, "fechaInicio", "plazoMaximoDiasHabiles", "montoSolicitado")
  select 'UFI-2026-0001', "epsId", 'uso_excepcional_fondo', 'concluido', '2026-09-01'::date, 30, 436594.67 from public.eps where "codigoEps" = 'EPS07'
union all
  select 'RP-2026-0002', "epsId", 'revision_periodica', 'en_tramite', '2026-01-21'::date, 195, null from public.eps where "codigoEps" = 'EPS04'
on conflict ("codigoExpediente") do nothing;

-- Documentos vinculados a los expedientes de demostración (ds11).
insert into public.documentos ("codigoDocumento", "expedienteId", "codigoActuacion", "tipoDocumento", "numeroDocumento", "fechaDocumento", asunto, folios, "nivelAcceso")
select d."codigoDocumento", e."expedienteId", d."codigoActuacion", d."tipoDocumento", d."numeroDocumento", d."fechaDocumento"::date, d.asunto, d.folios::integer, d."nivelAcceso"
from (values
  ('DOC-000410', 'RP-2026-0002', 'ACT-000513', 'proveido', null, '2026-01-22', 'DRE deriva el expediente a la SRT', '1', 'interno'),
  ('DOC-000411', 'RP-2026-0002', 'ACT-000514', 'proveido', null, '2026-01-26', 'SRT asigna el expediente al equipo', '1', 'interno'),
  ('DOC-000412', 'RP-2026-0002', 'ACT-000516', 'informe', 'INF-2026-0003', '2025-03-02', 'Equipo SRT elabora el informe y el proyecto de resolución – revisión tarifaria periódica (estudio tarifario)', '7', 'interno'),
  ('DOC-000413', 'RP-2026-0002', 'ACT-000518', 'resolucion_directoral', 'RD-2026-0002', '2026-03-09', 'Resolución de inicio del procedimiento – revisión tarifaria periódica (estudio tarifario)', '31', 'publico'),
  ('DOC-000414', 'RP-2026-0002', 'ACT-000520', 'oficio', 'OF-2026-0002', '2026-05-29', 'Elabora, revisa y firma el oficio de requerimiento de información – revisión tarifaria periódica (estudio tarifario)', '30', 'restringido_partes'),
  ('DOC-000415', 'RP-2026-0002', 'ACT-000521', 'carta_ep', 'CARTA N.° 001-2026-EPS04/GG', '2026-06-24', 'EP remite la información requerida (máx. 10 DH) – revisión tarifaria periódica (estudio tarifario)', '2', 'restringido_partes'),
  ('DOC-000416', 'RP-2026-0002', 'ACT-000521', 'anexo', 'Anexo 1', '2026-06-24', 'Anexo 1 de la carta – revisión tarifaria periódica (estudio tarifario)', '113', 'restringido_partes'),
  ('DOC-000417', 'RP-2026-0002', 'ACT-000521', 'anexo', 'Anexo 2', '2026-06-24', 'Anexo 2 de la carta – revisión tarifaria periódica (estudio tarifario)', '117', 'restringido_partes'),
  ('DOC-000418', 'RP-2026-0002', 'ACT-000521', 'anexo', 'Anexo 3', '2026-06-24', 'Anexo 3 de la carta – revisión tarifaria periódica (estudio tarifario)', '82', 'restringido_partes'),
  ('DOC-000419', 'RP-2026-0002', 'ACT-000522', 'informe', 'INF-2026-0004', '2026-07-07', 'Equipo SRT culmina el proyecto y elabora informe y memorándum – revisión tarifaria periódica (estudio tarifario)', '14', 'interno'),
  ('DOC-000420', 'RP-2026-0002', 'ACT-000524', 'memorandum', 'MEM-2026-0002', '2026-07-09', 'DRE revisa y firma el memorándum a la GG – revisión tarifaria periódica (estudio tarifario)', '28', 'interno'),
  ('DOC-000421', 'RP-2026-0002', 'ACT-000526', 'resolucion_consejo_directivo', 'RCD-2026-0001', '2026-07-20', 'Consejo Directivo dispone la difusión del proyecto – revisión tarifaria periódica (estudio tarifario)', '13', 'publico'),
  ('DOC-000422', 'RP-2026-0002', 'ACT-000527', 'publicacion_diario_oficial', null, '2026-07-24', 'Publicación del proyecto – revisión tarifaria periódica (estudio tarifario)', '2', 'publico'),
  ('DOC-000423', 'RP-2026-0002', 'ACT-000528', 'acta', 'ACTA-AP-RP-2026-0002', '2026-09-02', 'Acta de la audiencia pública – revisión tarifaria periódica (estudio tarifario)', '13', 'publico'),
  ('DOC-000424', 'RP-2026-0002', 'ACT-000529', 'carta_ep', 'CARTA N.° 002-2026-EPS04/GG', '2026-09-23', 'EP e interesados formulan comentarios (hasta 15 DH tras la audiencia) – revisión tarifaria periódica (estudio tarifario)', '4', 'restringido_partes'),
  ('DOC-001570', 'UFI-2026-0001', 'ACT-001624', 'carta_ep', 'CARTA N.° 005-2026-EPS07/GG', '2026-09-01', 'Solicitud de la EP por Mesa de Partes – uso excepcional del fondo de inversiones', '2', 'restringido_partes'),
  ('DOC-001571', 'UFI-2026-0001', 'ACT-001624', 'anexo', 'Anexo 1', '2026-09-01', 'Anexo 1 de la carta – uso excepcional del fondo de inversiones', '39', 'restringido_partes'),
  ('DOC-001572', 'UFI-2026-0001', 'ACT-001625', 'proveido', null, '2026-09-02', 'DRE deriva el expediente a la SRT', '1', 'interno'),
  ('DOC-001573', 'UFI-2026-0001', 'ACT-001626', 'proveido', null, '2026-09-03', 'SRT asigna el expediente al equipo', '1', 'interno'),
  ('DOC-001574', 'UFI-2026-0001', 'ACT-001629', 'informe', 'INF-2026-0019', '2026-09-23', 'Equipo SRT elabora el informe y el proyecto de resolución – uso excepcional del fondo de inversiones', '22', 'interno'),
  ('DOC-001804', 'UFI-2026-0001', 'ACT-001633', 'memorandum', 'MEM-2026-0009', '2026-10-01', 'DRE firma el memorándum a la GG – uso excepcional del fondo de inversiones', '32', 'interno'),
  ('DOC-001805', 'UFI-2026-0001', 'ACT-001879', 'resolucion_consejo_directivo', 'RCD-2026-0009', '2026-10-12', 'Consejo Directivo emite la resolución – uso excepcional del fondo de inversiones', '24', 'publico')
) as d ("codigoDocumento", "codigoExpediente", "codigoActuacion", "tipoDocumento", "numeroDocumento", "fechaDocumento", asunto, folios, "nivelAcceso")
join public.expedientes e on e."codigoExpediente" = d."codigoExpediente"
on conflict ("codigoDocumento") do nothing;
