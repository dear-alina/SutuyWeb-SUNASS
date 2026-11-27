// Cálculos del panel gerencial (funciones puras, sin base de datos).
// Los casos reproducen expedientes del dataset ds02 y sus fechas límite declaradas.
import { describe, expect, it } from "vitest";
import { crearCalendario, feriadosNacionales } from "../src/modulos/panel-gerencial/calendario.js";
import { calcularPlazo, construirPanel } from "../src/modulos/panel-gerencial/calculos.js";

const calendario = crearCalendario();
const hito = (codigoExpediente, numero, codigoHito, responsable, iniciadoEn, finalizadoEn, extra = {}) => ({
  codigoExpediente, numero, codigoHito, responsable, iniciadoEn, finalizadoEn, cuentaPlazo: true, plazoReferencialDiasHabiles: null, ...extra,
});

// UFI-2024-0001: subsanación de 2 d.h. que suspende el plazo; fecha límite declarada 2024-07-25.
const ufi2024 = { codigoExpediente: "UFI-2024-0001", codigoEps: "EPS07", tipoProcedimiento: "uso_excepcional_fondo", estado: "concluido", fechaInicio: "2024-06-10", plazoMaximoDiasHabiles: 30, fechaConclusion: "2024-07-25" };
const hitos2024 = [
  hito("UFI-2024-0001", 2, "derivacion", "dre", "2024-06-10", "2024-06-11", { plazoReferencialDiasHabiles: 1 }),
  hito("UFI-2024-0001", 6, "subsanacion_ep", "ep", "2024-06-20", "2024-06-24", { plazoReferencialDiasHabiles: 2, cuentaPlazo: false }),
];

// UFI-2025-0001: resuelto después del plazo; fecha límite declarada 2025-06-25.
const ufi2025 = { codigoExpediente: "UFI-2025-0001", codigoEps: "EPS16", tipoProcedimiento: "uso_excepcional_fondo", estado: "concluido", fechaInicio: "2025-05-12", plazoMaximoDiasHabiles: 30, fechaConclusion: "2025-07-03" };
const hitos2025 = [hito("UFI-2025-0001", 6, "subsanacion_ep", "ep", "2025-05-19", "2025-05-21", { plazoReferencialDiasHabiles: 2, cuentaPlazo: false })];

// UFI-2026-0001: en trámite al 30/09/2026, en el memorándum de la DRE; fecha límite declarada 2026-10-14.
const ufi2026 = { codigoExpediente: "UFI-2026-0001", codigoEps: "EPS07", tipoProcedimiento: "uso_excepcional_fondo", estado: "en_tramite", fechaInicio: "2026-09-01", plazoMaximoDiasHabiles: 30, fechaConclusion: null };
const hitos2026 = [
  hito("UFI-2026-0001", 2, "derivacion", "dre", "2026-09-01", "2026-09-02", { plazoReferencialDiasHabiles: 1 }),
  hito("UFI-2026-0001", 4, "verificacion_tupa", "equipo_srt", "2026-09-03", "2026-09-07"),
  hito("UFI-2026-0001", 10, "memo_gg", "dre", "2026-09-30", null),
];

describe("calendario de días hábiles", () => {
  it("incluye los feriados fijos y la Semana Santa", () => {
    const feriados = feriadosNacionales(2026);
    expect(feriados).toContain("2026-10-08");
    expect(feriados).toContain("2026-04-03"); // Viernes Santo 2026
  });

  it("cuenta desde el día hábil siguiente y salta fines de semana y feriados", () => {
    expect(calendario.sumarDiasHabiles("2026-10-07", 1)).toBe("2026-10-09"); // el 8/10 es feriado
    expect(calendario.contarDiasHabiles("2026-09-30", "2026-10-14")).toBe(9);
    expect(calendario.contarDiasHabiles("2026-10-14", "2026-09-30")).toBe(-9);
  });

  it("respeta los días no hábiles adicionales registrados", () => {
    const conDecreto = crearCalendario(["2026-10-09"]);
    expect(conDecreto.sumarDiasHabiles("2026-10-07", 1)).toBe("2026-10-12");
  });
});

describe("plazo del procedimiento", () => {
  const opciones = { fechaCorte: "2026-09-30", diasAlerta: 5, calendario };

  it("suma los días de suspensión de la EP a la fecha límite", () => {
    const plazo = calcularPlazo(ufi2024, hitos2024, opciones);
    expect(plazo.diasSuspension).toBe(2);
    expect(plazo.fechaLimite).toBe("2024-07-25");
    expect(plazo.semaforo).toBe("resuelto_en_plazo");
  });

  it("marca como resuelto fuera de plazo al que concluyó después de la fecha límite", () => {
    const plazo = calcularPlazo(ufi2025, hitos2025, opciones);
    expect(plazo.fechaLimite).toBe("2025-06-25");
    expect(plazo.semaforo).toBe("resuelto_fuera_de_plazo");
  });

  it("calcula el día del plazo y los días restantes de un expediente en trámite", () => {
    const plazo = calcularPlazo(ufi2026, hitos2026, opciones);
    expect(plazo).toMatchObject({ fechaLimite: "2026-10-14", fechaLimiteNotificacion: "2026-10-21", diaDelPlazo: 21, diasRestantes: 9, semaforo: "en_plazo" });
  });

  it("usa el margen de alerta, el vencimiento y el silencio positivo", () => {
    expect(calcularPlazo(ufi2026, hitos2026, { ...opciones, diasAlerta: 10 }).semaforo).toBe("por_vencer");
    expect(calcularPlazo(ufi2026, hitos2026, { ...opciones, fechaCorte: "2026-10-15" }).semaforo).toBe("vencido");
    expect(calcularPlazo(ufi2026, hitos2026, { ...opciones, fechaCorte: "2026-10-22" }).semaforo).toBe("silencio_positivo");
  });

  it("no supone silencio positivo fuera del uso excepcional del fondo", () => {
    const cpi = { ...ufi2026, codigoExpediente: "CPI-2026-0003", tipoProcedimiento: "cambio_programa_inversiones" };
    const plazo = calcularPlazo(cpi, [], { ...opciones, fechaCorte: "2026-10-22" });
    expect(plazo.semaforo).toBe("vencido");
    expect(plazo.fechaLimiteNotificacion).toBeNull();
  });

  it("no cuenta como resuelto en plazo al concluido sin fecha de conclusión", () => {
    expect(calcularPlazo({ ...ufi2024, fechaConclusion: null }, hitos2024, opciones).semaforo).toBe("resuelto_sin_fecha");
  });

  it("no calcula plazo cuando el procedimiento no lo tiene", () => {
    const rpi = { ...ufi2026, codigoExpediente: "RPI-2026-0001", tipoProcedimiento: "reporte_periodico", plazoMaximoDiasHabiles: null };
    expect(calcularPlazo(rpi, [], opciones).semaforo).toBe("sin_plazo");
  });
});

describe("panel completo", () => {
  const panel = construirPanel({
    expedientes: [ufi2024, ufi2025, ufi2026, { ...ufi2024, codigoExpediente: "CPI-2025-0001", tipoProcedimiento: "cambio_programa_inversiones", fechaConclusion: null }],
    hitos: [
      ...hitos2024, ...hitos2025, ...hitos2026,
      hito("UFI-2025-0001", 2, "derivacion", "dre", "2025-05-12", "2025-05-14", { plazoReferencialDiasHabiles: 1 }),
      hito("UFI-2026-0001", 11, "visado_informe", "srt", "2026-09-25", "2026-09-20"),
    ],
    fechaCorte: "2026-09-30",
    diasAlerta: 5,
    calendario,
  });

  it("resume los indicadores", () => {
    expect(panel.indicadores).toMatchObject({ enTramite: 1, porVencer: 0, plazoVencido: 0, silencioPositivo: 0, resueltosEnPlazo: 1, resueltosConPlazo: 2 });
  });

  it("lista los vencimientos con el área y el hito en curso", () => {
    expect(panel.vencimientos).toHaveLength(1);
    expect(panel.vencimientos[0]).toMatchObject({ codigoExpediente: "UFI-2026-0001", areaActual: "dre", hitoActual: "memo_gg" });
  });

  it("calcula el tiempo por área sin la EP", () => {
    expect(panel.tiempoPorArea.map((t) => t.area)).not.toContain("ep");
    expect(panel.tiempoPorArea.find((t) => t.area === "equipo_srt")).toMatchObject({ promedioDiasHabiles: 2, cantidadPasos: 1 });
  });

  it("detecta los pasos que superaron su plazo propio", () => {
    // La derivación de 2025 tardó 2 d.h. con meta de 1; la subsanación de 2024 usó justo sus 2 d.h.: no se reporta.
    expect(panel.pasosFueraDePlazo).toEqual([
      { codigoExpediente: "UFI-2025-0001", codigoHito: "derivacion", responsable: "dre", diasHabiles: 2, plazoDiasHabiles: 1, estaEnCurso: false },
    ]);
  });

  it("reporta los problemas de calidad de datos", () => {
    expect(panel.calidadDatos.map((c) => c.regla).sort()).toEqual(["concluido_sin_fecha", "hito_termina_antes_de_iniciar"]);
  });
});
