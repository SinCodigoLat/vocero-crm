import { describe, expect, it } from "vitest";
import { etiquetaNegocio, negocioDeFicha, normalizarNegocio } from "@/lib/negocios";

describe("negocios (fork SinCódigo)", () => {
  it("lee el negocio de la ficha", () => {
    expect(negocioDeFicha({ negocio: "finca-cacao", rubro: "plantas" })).toBe("finca-cacao");
  });

  it("tolera el drift del LLM en la escritura", () => {
    expect(negocioDeFicha({ negocio: " Finca Cacao " })).toBe("finca-cacao");
    expect(negocioDeFicha({ negocio: "TÉCNICOS" })).toBe("tecnicos");
    expect(normalizarNegocio("finca__cacao")).toBe("finca-cacao");
  });

  it("sin ficha o sin negocio no inventa nada", () => {
    expect(negocioDeFicha(null)).toBeNull();
    expect(negocioDeFicha({})).toBeNull();
    expect(negocioDeFicha({ negocio: "" })).toBeNull();
    expect(negocioDeFicha({ negocio: 3 })).toBeNull();
    expect(negocioDeFicha(["negocio"])).toBeNull();
  });

  it("etiqueta los conocidos y deja el resto tal cual", () => {
    expect(etiquetaNegocio("sincodigo")).toBe("SinCódigo");
    expect(etiquetaNegocio("tecnicos")).toBe("Técnicos Esmeraldas");
    expect(etiquetaNegocio("otro-negocio")).toBe("otro-negocio");
  });
});
