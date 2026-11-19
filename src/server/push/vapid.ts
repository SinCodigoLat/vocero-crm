import { createPrivateKey, sign } from "node:crypto";

/**
 * Fork SinCódigo — Firma VAPID (RFC 8292) para Web Push, sin dependencias.
 *
 * Los avisos van SIN cuerpo: así no hace falta cifrar el contenido (RFC 8291).
 * El service worker, al recibir el push, le pregunta al CRM qué pasó
 * (`/api/push/pendiente`) con la sesión del dispositivo. Lo único que
 * necesita el servicio de push es saber que el aviso lo manda este servidor:
 * eso es este JWT firmado con ES256.
 */

export function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function deB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** El origen del endpoint: es la audiencia (`aud`) del JWT. */
export function audienciaDe(endpoint: string): string {
  return new URL(endpoint).origin;
}

/**
 * La cabecera `Authorization` para un endpoint de push.
 * `publica`: punto P-256 sin comprimir (65 bytes, base64url).
 * `privada`: escalar d (32 bytes, base64url).
 */
export function cabeceraVapid(input: {
  endpoint: string;
  publica: string;
  privada: string;
  sujeto: string;
  ahoraSeg?: number;
}): string {
  const pub = deB64url(input.publica);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("VAPID_PUBLIC_KEY inválida");
  const key = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: b64url(pub.subarray(1, 33)),
      y: b64url(pub.subarray(33, 65)),
      d: input.privada,
    },
    format: "jwk",
  });
  const ahora = input.ahoraSeg ?? Math.floor(Date.now() / 1000);
  const header = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(
    Buffer.from(
      JSON.stringify({
        aud: audienciaDe(input.endpoint),
        exp: ahora + 12 * 3600,
        sub: input.sujeto,
      })
    )
  );
  const datos = `${header}.${claims}`;
  const firma = sign("sha256", Buffer.from(datos), { key, dsaEncoding: "ieee-p1363" });
  return `vapid t=${datos}.${b64url(firma)}, k=${input.publica}`;
}
