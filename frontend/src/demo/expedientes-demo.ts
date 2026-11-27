/**
 * Expedientes de uso excepcional del fondo (FI) para la DEMO.
 * Fuente: datos_sprint/ds02_procedimientos.csv y ds02_hitos_procedimientos.csv (datos sintéticos del concurso).
 * Nombres en camelCase según design.md, D8. En el MVP vienen de GET /api/v1/expedientes.
 */
export const FECHA_CORTE = "2026-09-30";

export type Hito = {
  numero: number;
  codigoHito: string;
  area: string; // EP, DRE, SRT, equipo_srt, OAJ, GG, CD
  iniciadoEn: string;
  finalizadoEn: string | null;
  plazoReferencialDiasHabiles: number | null;
  cuentaPlazo: boolean;
  numeroDocumento: string | null;
};

export type Documento = {
  codigoDocumento: string;
  tipoDocumento: "carta_ep" | "anexo" | "oficio" | "resolucion_consejo_directivo";
  numeroDocumento: string;
  fechaDocumento: string;
  asunto: string;
  nivelAcceso: "publico" | "restringido_partes" | "interno";
  codigoRequisito?: string; // requisito del TUPA que cubre (requisitos-tupa.ts)
};

export type ExpedienteFi = {
  codigoExpediente: string;
  codigoEps: string;
  tipoProcedimiento: "uso_excepcional_fondo";
  fechaInicio: string;
  plazoMaximoDiasHabiles: number;
  estado: "en_tramite" | "concluido" | "archivado";
  resultado: "aprobado" | "aprobado_parcial" | "denegado" | "archivado_no_subsana" | null;
  fechaConclusion: string | null;
  motivo: string | null;
  montoSolicitado: number | null;
  hitos: Hito[];
  documentos: Documento[];
  fechaNotificacion?: string | null; // notificación de la resolución a la EP (LPAG 24.1)
  equipoAsignado?: { codigo: string; nombre: string; rol: "verifica_tupa" | "evalua_informa" }[]; // lo forma la SRT al asignar
};

const h = (
  numero: number, codigoHito: string, area: string, iniciadoEn: string, finalizadoEn: string | null,
  extra: Partial<Hito> = {},
): Hito => ({ numero, codigoHito, area, iniciadoEn, finalizadoEn, plazoReferencialDiasHabiles: null, cuentaPlazo: true, numeroDocumento: null, ...extra });

export const EXPEDIENTES_DEMO: ExpedienteFi[] = [
  {
    // Flujo normal en curso: al 30/09/2026 está en el memorándum de la DRE a la GG
    codigoExpediente: "UFI-2026-0001", codigoEps: "EPS07", tipoProcedimiento: "uso_excepcional_fondo",
    fechaInicio: "2026-09-01", plazoMaximoDiasHabiles: 30, estado: "en_tramite", resultado: null, fechaConclusion: null,
    motivo: "Rotura de línea de conducción", montoSolicitado: 436594.67,
    hitos: [
      h(1, "solicitud", "EP", "2026-09-01", "2026-09-01"),
      h(2, "derivacion", "DRE", "2026-09-01", "2026-09-02", { plazoReferencialDiasHabiles: 1 }),
      h(3, "asignacion", "SRT", "2026-09-02", "2026-09-03"),
      h(4, "verificacion_tupa", "equipo_srt", "2026-09-03", "2026-09-07"),
      h(5, "evaluacion", "equipo_srt", "2026-09-07", "2026-09-15"),
      h(6, "informe", "equipo_srt", "2026-09-15", "2026-09-23", { numeroDocumento: "INF-2026-0019" }),
      h(7, "visado_informe", "SRT", "2026-09-23", "2026-09-25"),
      h(8, "firma_informe_dre", "DRE", "2026-09-25", "2026-09-28"),
      h(9, "firma_informe_oaj", "OAJ", "2026-09-28", "2026-09-30"),
      h(10, "memo_gg", "DRE", "2026-09-30", null),
    ],
    documentos: [
      { codigoDocumento: "DEMO-0001", tipoDocumento: "carta_ep", numeroDocumento: "Carta de solicitud", fechaDocumento: "2026-09-01", asunto: "Solicitud de uso excepcional del fondo de inversiones", nivelAcceso: "restringido_partes" },
      // Anexos ficticios de la demo: el expediente ya pasó la verificación de requisitos del TUPA
      { codigoDocumento: "DEMO-0001-1", tipoDocumento: "anexo", numeroDocumento: "Anexo 1", fechaDocumento: "2026-09-01", asunto: "Informe sobre la propuesta de uso excepcional (caso fortuito o de fuerza mayor)", nivelAcceso: "restringido_partes", codigoRequisito: "informe" },
      { codigoDocumento: "DEMO-0001-2", tipoDocumento: "anexo", numeroDocumento: "Anexo 2", fechaDocumento: "2026-09-01", asunto: "Documentos que sustentan la propuesta", nivelAcceso: "restringido_partes", codigoRequisito: "sustento" },
      { codigoDocumento: "DEMO-0001-3", tipoDocumento: "anexo", numeroDocumento: "Anexo 3", fechaDocumento: "2026-09-01", asunto: "Propuesta de devolución o de exoneración de la devolución", nivelAcceso: "restringido_partes", codigoRequisito: "propuesta" },
    ],
  },
  {
    // Excepción de subsanación de requisitos TUPA (2 DH) → aprobado en parte
    codigoExpediente: "UFI-2024-0001", codigoEps: "EPS07", tipoProcedimiento: "uso_excepcional_fondo",
    fechaInicio: "2024-06-10", plazoMaximoDiasHabiles: 30, estado: "concluido", resultado: "aprobado_parcial", fechaConclusion: "2024-07-25",
    motivo: null, montoSolicitado: null,
    hitos: [
      h(1, "solicitud", "EP", "2024-06-10", "2024-06-10"),
      h(2, "derivacion", "DRE", "2024-06-10", "2024-06-11", { plazoReferencialDiasHabiles: 1 }),
      h(3, "asignacion", "SRT", "2024-06-11", "2024-06-12"),
      h(4, "verificacion_tupa", "equipo_srt", "2024-06-12", "2024-06-17"),
      h(5, "oficio_subsanacion", "SRT", "2024-06-17", "2024-06-20", { numeroDocumento: "OF-2024-0013" }),
      h(6, "subsanacion_ep", "EP", "2024-06-20", "2024-06-24", { plazoReferencialDiasHabiles: 2, cuentaPlazo: false }),
      h(7, "evaluacion", "equipo_srt", "2024-06-24", "2024-06-28"),
      h(8, "informe", "equipo_srt", "2024-06-28", "2024-07-08", { numeroDocumento: "INF-2024-0023" }),
      h(9, "visado_informe", "SRT", "2024-07-08", "2024-07-09"),
      h(10, "firma_informe_dre", "DRE", "2024-07-09", "2024-07-11"),
      h(11, "firma_informe_oaj", "OAJ", "2024-07-11", "2024-07-15"),
      h(12, "memo_gg", "DRE", "2024-07-15", "2024-07-16", { numeroDocumento: "MEM-2024-0011" }),
      h(13, "elevacion_cd", "GG", "2024-07-16", "2024-07-19"),
      h(14, "resolucion_cd", "CD", "2024-07-19", "2024-07-25", { numeroDocumento: "RCD-2024-0011" }),
    ],
    documentos: [
      { codigoDocumento: "DEMO-0002", tipoDocumento: "oficio", numeroDocumento: "OF-2024-0013", fechaDocumento: "2024-06-20", asunto: "Observaciones a los requisitos del TUPA", nivelAcceso: "restringido_partes" },
      { codigoDocumento: "DEMO-0003", tipoDocumento: "resolucion_consejo_directivo", numeroDocumento: "RCD-2024-0011", fechaDocumento: "2024-07-25", asunto: "Resolución sobre el uso excepcional del fondo", nivelAcceso: "publico" },
    ],
  },
  {
    // Resolución denegatoria emitida después de configurado el silencio positivo
    codigoExpediente: "UFI-2025-0001", codigoEps: "EPS16", tipoProcedimiento: "uso_excepcional_fondo",
    fechaInicio: "2025-05-12", plazoMaximoDiasHabiles: 30, estado: "concluido", resultado: "denegado", fechaConclusion: "2025-07-03",
    motivo: null, montoSolicitado: null,
    hitos: [
      h(1, "solicitud", "EP", "2025-05-12", "2025-05-12"),
      h(2, "derivacion", "DRE", "2025-05-12", "2025-05-13", { plazoReferencialDiasHabiles: 1 }),
      h(3, "asignacion", "SRT", "2025-05-13", "2025-05-13"),
      h(4, "verificacion_tupa", "equipo_srt", "2025-05-13", "2025-05-14"),
      h(5, "oficio_subsanacion", "SRT", "2025-05-14", "2025-05-19", { numeroDocumento: "OF-2025-0015" }),
      h(6, "subsanacion_ep", "EP", "2025-05-19", "2025-05-21", { plazoReferencialDiasHabiles: 2, cuentaPlazo: false }),
      h(7, "evaluacion", "equipo_srt", "2025-05-21", "2025-06-03"),
      h(8, "informe", "equipo_srt", "2025-06-03", "2025-06-13", { numeroDocumento: "INF-2025-0025" }),
      h(9, "visado_informe", "SRT", "2025-06-13", "2025-06-16"),
      h(10, "firma_informe_dre", "DRE", "2025-06-16", "2025-06-18"),
      h(11, "firma_informe_oaj", "OAJ", "2025-06-18", "2025-06-20"),
      h(12, "memo_gg", "DRE", "2025-06-20", "2025-06-24", { numeroDocumento: "MEM-2025-0011" }),
      h(13, "elevacion_cd", "GG", "2025-06-24", "2025-06-26"),
      h(14, "resolucion_cd", "CD", "2025-06-26", "2025-07-03", { numeroDocumento: "RCD-2025-0010" }),
    ],
    documentos: [
      { codigoDocumento: "DEMO-0004", tipoDocumento: "oficio", numeroDocumento: "OF-2025-0015", fechaDocumento: "2025-05-19", asunto: "Observaciones a los requisitos del TUPA", nivelAcceso: "restringido_partes" },
      { codigoDocumento: "DEMO-0005", tipoDocumento: "resolucion_consejo_directivo", numeroDocumento: "RCD-2025-0010", fechaDocumento: "2025-07-03", asunto: "Resolución sobre el uso excepcional del fondo", nivelAcceso: "publico" },
    ],
  },
];
