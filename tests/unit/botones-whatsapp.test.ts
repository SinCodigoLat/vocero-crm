import { describe, expect, it } from "vitest";
import {
  extraerOpciones,
  interactivoPara,
  textoConViñetas,
} from "@/lib/botones-whatsapp";

describe("botones de WhatsApp desde el texto del cerebro", () => {
  it("sin marca no hay opciones", () => {
    expect(extraerOpciones("Hola, ¿qué te gustaría montar?")).toBeNull();
  });

  it("separa cuerpo y opciones de la última línea", () => {
    const r = extraerOpciones(
      "¿Con qué presupuesto cuentas?\n[opciones: Menos de USD 2.000 | USD 2.000 o más]"
    );
    expect(r).toEqual({
      cuerpo: "¿Con qué presupuesto cuentas?",
      opciones: ["Menos de USD 2.000", "USD 2.000 o más"],
    });
  });

  it("acepta «botones», mayúsculas, espacios y quita duplicados y vacíos", () => {
    const r = extraerOpciones("¿Decides tú?\n  [Botones:  Yo decido |  | Con un socio | yo decido ]  ");
    expect(r?.opciones).toEqual(["Yo decido", "Con un socio"]);
  });

  it("una marca en medio del texto no cuenta", () => {
    expect(extraerOpciones("[opciones: A | B]\nY sigue el texto")).toBeNull();
  });

  it("hasta 3 opciones cortas salen como botones", () => {
    const i = interactivoPara({ cuerpo: "¿Cuál?", opciones: ["Vie 20, 10:00", "Vie 20, 10:30"] });
    expect(i?.type).toBe("button");
    expect(i).toMatchObject({
      action: {
        buttons: [
          { type: "reply", reply: { id: "op_1", title: "Vie 20, 10:00" } },
          { type: "reply", reply: { id: "op_2", title: "Vie 20, 10:30" } },
        ],
      },
    });
  });

  it("más de 3 opciones, o una de más de 20 caracteres, salen como lista", () => {
    const cuatro = interactivoPara({ cuerpo: "Elige", opciones: ["A", "B", "C", "D"] });
    expect(cuatro?.type).toBe("list");
    const larga = interactivoPara({
      cuerpo: "Elige",
      opciones: ["Una opción de 22 letras", "Otra"],
    });
    expect(larga?.type).toBe("list");
  });

  it("si no cabe en lista, o falta cuerpo, o hay una sola opción: null", () => {
    expect(
      interactivoPara({ cuerpo: "x", opciones: ["Una opción que pasa de veinticuatro", "B"] })
    ).toBeNull();
    expect(interactivoPara({ cuerpo: "", opciones: ["A", "B"] })).toBeNull();
    expect(interactivoPara({ cuerpo: "x", opciones: ["A"] })).toBeNull();
    expect(
      interactivoPara({ cuerpo: "x", opciones: Array.from({ length: 11 }, (_, i) => `O${i}`) })
    ).toBeNull();
    expect(interactivoPara({ cuerpo: "x".repeat(1025), opciones: ["A", "B"] })).toBeNull();
  });

  it("el texto de respaldo lleva las opciones como viñetas", () => {
    expect(textoConViñetas({ cuerpo: "¿Cuál?", opciones: ["A", "B"] })).toBe("¿Cuál?\n\n- A\n- B");
    expect(textoConViñetas({ cuerpo: "Solo cuerpo", opciones: [] })).toBe("Solo cuerpo");
  });
});
