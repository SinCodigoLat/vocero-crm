// Fork SinCódigo — Genera el par de llaves VAPID para los avisos push.
// Uso: node scripts/sincodigo/vapid-keys.mjs  → imprime las dos líneas para el .env
import { generateKeyPairSync } from "node:crypto";
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });
const b = (s) => Buffer.from(s, "base64url");
const raw = Buffer.concat([Buffer.from([4]), b(pub.x), b(pub.y)]).toString("base64url");
console.log(`VAPID_PUBLIC_KEY=${raw}`);
console.log(`VAPID_PRIVATE_KEY=${priv.d}`);
