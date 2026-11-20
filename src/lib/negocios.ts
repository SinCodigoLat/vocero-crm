/**
 * Fork SinCódigo — Varios negocios en un mismo número.
 *
 * Una organización puede atender varias líneas de negocio por el mismo
 * WhatsApp (SinCódigo, la finca de cacao, los técnicos de aire). El cerebro
 * anota cuál es en la ficha del contacto (`ficha.negocio`) y la bandeja lo
 * usa para marcar y filtrar. Puro, para probarlo sin navegador.
 */

/** Nombres legibles de los negocios conocidos; cualquier otro valor se muestra tal cual. */
export const NEGOCIO_LABEL: Record<string, string> = {
  sincodigo: "SinCódigo",
  "finca-cacao": "Finca de Cacao",
  tecnicos: "Técnicos Esmeraldas",
};

/** «Finca Cacao», «finca_cacao» y «finca-cacao» son lo mismo. */
export function normalizarNegocio(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/** El negocio que el cerebro anotó en la ficha, o null si no hay. */
export function negocioDeFicha(ficha: unknown): string | null {
  if (!ficha || typeof ficha !== "object" || Array.isArray(ficha)) return null;
  const valor = (ficha as Record<string, unknown>).negocio;
  if (typeof valor !== "string") return null;
  const n = normalizarNegocio(valor);
  return n.length > 0 ? n : null;
}

export function etiquetaNegocio(negocio: string): string {
  return NEGOCIO_LABEL[negocio] ?? negocio;
}
