import { generateKeyPairSync, createPublicKey, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { audienciaDe, b64url, cabeceraVapid, deB64url } from "@/server/push/vapid";

function llaves() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pub = publicKey.export({ format: "jwk" });
  const priv = privateKey.export({ format: "jwk" });
  const raw = Buffer.concat([Buffer.from([4]), deB64url(pub.x!), deB64url(pub.y!)]);
  return { publica: b64url(raw), privada: priv.d!, jwk: pub };
}

describe("firma VAPID de los avisos push", () => {
  it("la audiencia es el origen del endpoint", () => {
    expect(audienciaDe("https://fcm.googleapis.com/fcm/send/abc")).toBe("https://fcm.googleapis.com");
  });

  it("produce un JWT ES256 que verifica con la llave pública", () => {
    const k = llaves();
    const h = cabeceraVapid({
      endpoint: "https://web.push.apple.com/QGx",
      publica: k.publica,
      privada: k.privada,
      sujeto: "mailto:test@example.com",
      ahoraSeg: 1_700_000_000,
    });
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h);
    expect(m).not.toBeNull();
    const [, head, claims, firma, k2] = m!;
    expect(k2).toBe(k.publica);
    const c = JSON.parse(deB64url(claims!).toString());
    expect(c).toEqual({ aud: "https://web.push.apple.com", exp: 1_700_000_000 + 43200, sub: "mailto:test@example.com" });
    const ok = verify(
      "sha256",
      Buffer.from(`${head}.${claims}`),
      { key: createPublicKey({ key: k.jwk, format: "jwk" }), dsaEncoding: "ieee-p1363" },
      deB64url(firma!)
    );
    expect(ok).toBe(true);
  });

  it("rechaza una llave pública que no es un punto sin comprimir", () => {
    const k = llaves();
    expect(() =>
      cabeceraVapid({ endpoint: "https://x.y/z", publica: b64url(Buffer.alloc(10)), privada: k.privada, sujeto: "mailto:a@b.c" })
    ).toThrow();
  });
});
