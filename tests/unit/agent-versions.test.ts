import { describe, expect, it } from "vitest";
import { diferencias, huellaDeSnapshot } from "@/server/agent/versions";
import type { AgentVersionSnapshot } from "@/lib/db/schema";

const base: AgentVersionSnapshot = {
  profile: {
    name: "Nea",
    tone: "cercano",
    instructions: "a",
    escalationRules: null,
    greeting: null,
    role: "calificador",
    tools: null,
  },
  kb: [{ kind: "qa", question: "¿Precio?", answer: "Lo ve Jorge", content: null }],
};

describe("versiones del agente", () => {
  it("la huella es estable y cambia con el comportamiento", () => {
    expect(huellaDeSnapshot(base)).toBe(huellaDeSnapshot(structuredClone(base)));
    const otra = structuredClone(base);
    otra.profile.instructions = "b";
    expect(huellaDeSnapshot(otra)).not.toBe(huellaDeSnapshot(base));
  });

  it("describe qué cambió respecto a la versión anterior", () => {
    const nueva = structuredClone(base);
    nueva.profile.tone = "formal";
    nueva.kb.push({ kind: "block", question: null, answer: null, content: "x" });
    expect(diferencias(base, nueva)).toEqual(["Cambió tono", "Conocimiento: +1"]);
    expect(diferencias(null, base)).toEqual(["Versión inicial"]);
  });
});
