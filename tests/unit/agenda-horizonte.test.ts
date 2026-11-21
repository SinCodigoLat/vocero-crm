import { describe, expect, it } from "vitest";
import { ultimoDiaAgendable } from "@/lib/agenda-horizonte";

const LV = { mon: [{}], tue: [{}], wed: [{}], thu: [{}], fri: [{}] };

describe("hasta qué día se agenda (fork SinCódigo)", () => {
  it("por defecto, días corridos", () => {
    expect(ultimoDiaAgendable("2026-11-20", { maxDaysAhead: 2, weeklyHours: LV })).toBe("2026-11-22");
  });
  it("con días hábiles, un viernes llega hasta el martes", () => {
    expect(ultimoDiaAgendable("2026-11-20", { maxDaysAhead: 2, soloDiasHabiles: true, weeklyHours: LV })).toBe("2026-11-24");
  });
  it("un lunes llega hasta el miércoles", () => {
    expect(ultimoDiaAgendable("2026-11-23", { maxDaysAhead: 2, soloDiasHabiles: true, weeklyHours: LV })).toBe("2026-11-25");
  });
  it("un sábado cuenta lunes y martes", () => {
    expect(ultimoDiaAgendable("2026-11-21", { maxDaysAhead: 2, soloDiasHabiles: true, weeklyHours: LV })).toBe("2026-11-24");
  });
  it("sin ningún día con horario, días corridos", () => {
    expect(ultimoDiaAgendable("2026-11-20", { maxDaysAhead: 2, soloDiasHabiles: true, weeklyHours: {} })).toBe("2026-11-22");
  });
});
