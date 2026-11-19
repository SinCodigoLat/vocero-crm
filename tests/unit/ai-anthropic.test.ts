import { describe, expect, it } from "vitest";
import { adaptarCuerpoParaProveedor } from "@/lib/ai/anthropic";
import { clasificarFallo } from "@/lib/ai/probe";
import { presetDeBaseUrl } from "@/lib/ai/presets";

describe("Anthropic como proveedor", () => {
  it("reconoce su base URL con o sin /v1", () => {
    expect(presetDeBaseUrl("https://api.anthropic.com")).toBe("anthropic");
    expect(presetDeBaseUrl("https://api.anthropic.com/v1/")).toBe("anthropic");
  });

  it("adapta el cuerpo a lo que su capa compatible acepta", () => {
    const out = JSON.parse(
      adaptarCuerpoParaProveedor(
        "https://api.anthropic.com",
        JSON.stringify({
          model: "claude-haiku-5-5",
          messages: [],
          response_format: { type: "json_object" },
          tool_choice: "required",
          temperature: 0.2,
          top_p: 0.9,
        })
      )
    );
    expect(out.max_tokens).toBe(4096);
    expect(out.response_format).toBeUndefined();
    expect(out.tool_choice).toBe("auto");
    expect(out.top_p).toBeUndefined();
  });

  it("no toca el cuerpo de otros proveedores", () => {
    const cuerpo = JSON.stringify({ model: "x", response_format: { type: "json_object" } });
    expect(adaptarCuerpoParaProveedor("https://openrouter.ai/api", cuerpo)).toBe(cuerpo);
  });

  it("un 400 por saldo bajo se clasifica como sin saldo", () => {
    const r = clasificarFallo(400, '{"error":{"message":"Your credit balance is too low"}}');
    expect(r.code).toBe("no_credit");
  });
});
