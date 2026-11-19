import { esAnthropic } from "@/lib/ai/presets";

/**
 * La capa OpenAI-compatible de Anthropic es más estricta que OpenRouter:
 * `response_format: json_object` y `tool_choice: required` dan 400, `top_p`
 * junto a `temperature` también, `n` debe ser 1 y conviene mandar siempre
 * `max_tokens`. Este adaptador deja el cuerpo en una forma que acepta, sin
 * tocar nada si la base no es de Anthropic.
 */
export const ANTHROPIC_MAX_TOKENS = 4096;

export function adaptarCuerpoParaProveedor(baseUrl: string, cuerpo: string): string {
  const anthropic = esAnthropic(baseUrl);
  let json: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(cuerpo);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return cuerpo;
    json = parsed as Record<string, unknown>;
  } catch {
    return cuerpo;
  }
  // Con cualquier proveedor: sin tope explícito, OpenRouter pide el máximo del
  // modelo (65536) y una llave con límite devuelve 402.
  // Solo en chat (otras rutas, p. ej. embeddings, no llevan messages).
  if (
    Array.isArray(json.messages) &&
    json.max_tokens == null &&
    json.max_completion_tokens == null
  ) {
    json.max_tokens = ANTHROPIC_MAX_TOKENS;
  }
  if (!anthropic) return JSON.stringify(json);
  const rf = json.response_format as { type?: string } | undefined;
  if (rf && rf.type !== "json_schema") delete json.response_format;
  if (json.tool_choice === "required") json.tool_choice = "auto";
  if (json.temperature != null && json.top_p != null) delete json.top_p;
  if (json.n != null && json.n !== 1) json.n = 1;
  return JSON.stringify(json);
}
