import { describe, expect, it } from "vitest";
import { avisarMensaje, avisoPendiente, PAUSA_POR_CONVERSACION_MS } from "@/server/push/enviar";

describe("avisos push de mensajes entrantes", () => {
  it("una ráfaga del mismo cliente avisa una vez y deja el texto listo para el aviso", () => {
    const t0 = 1_800_000_000_000;
    const base = { organizationId: "org_a", conversationId: "conv_1", nombre: "Ana" };
    expect(avisarMensaje({ ...base, texto: "Hola,   quiero   info", ahora: t0 })).toBe(true);
    expect(avisarMensaje({ ...base, texto: "¿siguen?", ahora: t0 + 5_000 })).toBe(false);
    expect(avisoPendiente("org_a", t0 + 6_000)).toMatchObject({
      titulo: "Ana",
      cuerpo: "Hola, quiero info",
      url: "/inbox?conversation=conv_1",
    });
    expect(avisarMensaje({ ...base, texto: "otra vez", ahora: t0 + PAUSA_POR_CONVERSACION_MS + 1 })).toBe(true);
  });

  it("el aviso pendiente caduca a los 10 minutos", () => {
    const t0 = 1_800_000_100_000;
    avisarMensaje({ organizationId: "org_b", conversationId: "conv_2", nombre: "", texto: "", ahora: t0 });
    expect(avisoPendiente("org_b", t0)).toMatchObject({ titulo: "Mensaje nuevo", cuerpo: "Mensaje nuevo" });
    expect(avisoPendiente("org_b", t0 + 10 * 60_000 + 1)).toBeNull();
  });
});
