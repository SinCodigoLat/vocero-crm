/**
 * Fork SinCódigo — Hasta qué día se puede agendar.
 *
 * Por defecto, hoy + `maxDaysAhead` días corridos (lo de siempre). Con
 * `soloDiasHabiles`, se cuentan solo los días que el negocio atiende (los que
 * tienen horario): «2 días» un viernes en la tarde son lunes y martes, no
 * sábado y domingo, que dejaban al lead sin un solo horario. Es una elección de
 * cada negocio, apagada por defecto. Pura, para probarla sin reloj ni base.
 */
import { addDaysISO, WEEKDAYS, type WeekdayKey } from "@/lib/time/slots";

const diaDeLaSemana = (iso: string): WeekdayKey => WEEKDAYS[(new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7]!;

export function ultimoDiaAgendable(
  hoy: string,
  s: { maxDaysAhead: number; soloDiasHabiles?: boolean; weeklyHours: Partial<Record<WeekdayKey, unknown[]>> }
): string {
  if (!s.soloDiasHabiles) return addDaysISO(hoy, s.maxDaysAhead);
  const atiende = (d: string) => (s.weeklyHours[diaDeLaSemana(d)]?.length ?? 0) > 0;
  // Sin ningún día con horario no hay nada que contar: lo de siempre.
  if (!WEEKDAYS.some((k) => (s.weeklyHours[k]?.length ?? 0) > 0)) return addDaysISO(hoy, s.maxDaysAhead);
  let d = hoy, contados = 0;
  while (contados < s.maxDaysAhead) {
    d = addDaysISO(d, 1);
    if (atiende(d)) contados++;
  }
  return d;
}
