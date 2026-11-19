/**
 * Botones de respuesta en WhatsApp a partir del texto del cerebro (fork SinCódigo).
 *
 * El cerebro (Nea) solo manda texto por `/api/bot/messages`. Para que pueda
 * ofrecer botones sin cambiar su contrato, escribe las opciones en la ÚLTIMA
 * línea con esta marca:
 *
 *   ¿Con qué presupuesto cuentas?
 *   [opciones: Menos de USD 2.000 | USD 2.000 o más]
 *
 * Aquí se separa el cuerpo de las opciones y se decide la forma:
 * - hasta 3 opciones de hasta 20 caracteres → botones de respuesta;
 * - hasta 10 opciones de hasta 24 caracteres → lista;
 * - si no cabe, el texto sale normal con las opciones como viñetas.
 *
 * Cuando el cliente toca un botón, Meta devuelve el rótulo y la ingesta lo
 * guarda como texto (`contenidoEntrante`): el cerebro lo lee como si lo
 * hubiera escrito.
 *
 * Módulo puro: no toca red ni base de datos.
 */

const MARCA = /\n?[ \t]*\[\s*(?:opciones|botones)\s*:\s*([^\]\n]*)\][ \t]*$/i;

export const MAX_BOTONES = 3;
export const MAX_TITULO_BOTON = 20;
export const MAX_FILAS_LISTA = 10;
export const MAX_TITULO_FILA = 24;
/** Tope del cuerpo de un mensaje interactivo en WhatsApp. */
export const MAX_CUERPO_INTERACTIVO = 1024;
export const ROTULO_LISTA = "Ver opciones";

export type TextoConOpciones = { cuerpo: string; opciones: string[] };

/** Separa el cuerpo de las opciones. Sin marca (o sin opciones válidas): null. */
export function extraerOpciones(texto: string): TextoConOpciones | null {
  const m = MARCA.exec(texto);
  if (!m) return null;
  const vistas = new Set<string>();
  const opciones: string[] = [];
  for (const crudo of (m[1] ?? "").split("|")) {
    const op = crudo.replace(/\s+/g, " ").trim();
    const clave = op.toLowerCase();
    if (!op || vistas.has(clave)) continue;
    vistas.add(clave);
    opciones.push(op);
  }
  const cuerpo = texto.slice(0, m.index).trim();
  if (opciones.length === 0) return { cuerpo, opciones: [] };
  return { cuerpo, opciones };
}

/**
 * El objeto `interactive` de Graph para estas opciones, o null si no caben
 * (entonces se manda como texto con `textoConViñetas`).
 */
export function interactivoPara({ cuerpo, opciones }: TextoConOpciones):
  | Record<string, unknown>
  | null {
  if (!cuerpo || opciones.length < 2) return null;
  if (cuerpo.length > MAX_CUERPO_INTERACTIVO) return null;

  if (
    opciones.length <= MAX_BOTONES &&
    opciones.every((o) => o.length <= MAX_TITULO_BOTON)
  ) {
    return {
      type: "button",
      body: { text: cuerpo },
      action: {
        buttons: opciones.map((titulo, i) => ({
          type: "reply",
          reply: { id: `op_${i + 1}`, title: titulo },
        })),
      },
    };
  }

  if (
    opciones.length <= MAX_FILAS_LISTA &&
    opciones.every((o) => o.length <= MAX_TITULO_FILA)
  ) {
    return {
      type: "list",
      body: { text: cuerpo },
      action: {
        button: ROTULO_LISTA,
        sections: [
          {
            title: "Opciones",
            rows: opciones.map((titulo, i) => ({ id: `op_${i + 1}`, title: titulo })),
          },
        ],
      },
    };
  }

  return null;
}

/** El mismo mensaje en texto: el cuerpo y las opciones como viñetas. */
export function textoConViñetas({ cuerpo, opciones }: TextoConOpciones): string {
  if (opciones.length === 0) return cuerpo;
  const lista = opciones.map((o) => `- ${o}`).join("\n");
  return cuerpo ? `${cuerpo}\n\n${lista}` : lista;
}
