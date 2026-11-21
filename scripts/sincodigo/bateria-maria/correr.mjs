// Batería de María contra el agente REAL (Nea + Vocero), por el chat de pruebas del Laboratorio: sin WhatsApp y con la agenda en
// modo de prueba (una cita de prueba nunca ocupa un horario real). Comprobaciones duras, sin juez.
//
// Uso:
//   VOCERO_COOKIE='__Secure-better-auth.session_token=…' node scripts/sincodigo/bateria-maria/correr.mjs [--veces 2] [--solo id1,id2]
// La cookie es la de una sesión abierta en vocero.agenciasincodigo.com (no se guarda en el repo).
// Resultado: tabla en consola y JSON en scripts/sincodigo/bateria-maria/resultados/<fecha>.json (para comparar versiones).
import { writeFileSync, mkdirSync } from "node:fs";
import { ESCENARIOS, SIEMPRE, HORARIOS } from "./escenarios.mjs";

const BASE = process.env.VOCERO_URL ?? "https://vocero.agenciasincodigo.com";
const COOKIE = process.env.VOCERO_COOKIE;
if (!COOKIE) { console.error("Falta VOCERO_COOKIE"); process.exit(2); }
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const VECES = Number(arg("veces", "1"));
const SOLO = arg("solo", "") ? arg("solo", "").split(",") : null;
const H = { cookie: COOKIE, "content-type": "application/json" };
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function leer() {
  const r = await fetch(`${BASE}/api/lab/chat`, { headers: H });
  if (r.status === 401) throw new Error("La sesión venció: abre Vocero y vuelve a sacar la cookie");
  return r.json();
}
/** Manda un mensaje y espera a que el agente termine (sin mensajes nuevos durante 8 s, hasta 120 s). */
async function decir(texto) {
  const antes = (await leer()).messages.length;
  const r = await fetch(`${BASE}/api/lab/chat`, { method: "POST", headers: H, body: JSON.stringify({ text: texto }) });
  if (!r.ok) throw new Error(`POST ${r.status}: ${await r.text()}`);
  const t0 = Date.now();
  let ultimo = antes + 1, quieto = Date.now();
  while (Date.now() - t0 < 120_000) {
    await dormir(2000);
    const d = await leer();
    if (d.messages.length !== ultimo) { ultimo = d.messages.length; quieto = Date.now(); }
    const contesto = d.messages.slice(antes + 1).some((m) => m.from !== "tu");
    if ((contesto && Date.now() - quieto > 8000) || d.handoff) return d;
  }
  return leer();
}

async function correr(e) {
  await fetch(`${BASE}/api/lab/chat`, { method: "DELETE", headers: H });
  await dormir(1500);
  let d;
  for (const m of e.cliente) d = await decir(m);
  const respuestas = d.messages.filter((m) => m.from !== "tu").map((m) => m.text);
  const todo = respuestas.join("\n");
  const fallas = [];
  for (const r of e.debe ?? []) if (!r.test(todo)) fallas.push(`no dijo ${r}`);
  for (const r of e.noDebe ?? []) if (r.test(todo)) fallas.push(`dijo ${r}: «${todo.match(r)[0]}»`);
  if (e.llamada === true && !HORARIOS.test(todo)) fallas.push("no ofreció horarios para la llamada");
  if (e.llamada === false && HORARIOS.test(todo)) fallas.push(`ofreció horarios sin calificar: «${todo.match(HORARIOS)[0]}»`);
  if (e.persona === true && !d.handoff) fallas.push("no pasó a una persona");
  for (const s of SIEMPRE) if (!s.si(respuestas)) fallas.push(s.texto);
  return { id: e.id, ok: fallas.length === 0, fallas, handoff: d.handoff ?? null, conversacion: d.messages.map((m) => `${m.from === "tu" ? "Cliente" : "María"}: ${m.text}`) };
}

const lista = ESCENARIOS.filter((e) => !SOLO || SOLO.includes(e.id));
const resultados = [];
for (let v = 1; v <= VECES; v++) {
  for (const e of lista) {
    const t0 = Date.now();
    let r;
    try { r = await correr(e); } catch (err) { r = { id: e.id, ok: false, fallas: [`error: ${err.message}`], conversacion: [] }; }
    resultados.push({ ...r, vuelta: v });
    console.log(`${r.ok ? "✔" : "✖"} ${e.id}${VECES > 1 ? ` (vuelta ${v})` : ""} · ${Math.round((Date.now() - t0) / 1000)} s${r.ok ? "" : `\n    ${r.fallas.join("\n    ")}`}`);
  }
}
const porEscenario = lista.map((e) => { const rs = resultados.filter((r) => r.id === e.id); return { id: e.id, verdes: rs.filter((r) => r.ok).length, de: rs.length }; });
const verdes = resultados.filter((r) => r.ok).length;
console.log(`\n${verdes} de ${resultados.length} en verde`);
if (VECES > 1) for (const p of porEscenario) if (p.verdes !== p.de) console.log(`  inestable: ${p.id} ${p.verdes}/${p.de}`);
mkdirSync(new URL("./resultados/", import.meta.url), { recursive: true });
const archivo = new URL(`./resultados/${new Date().toISOString().slice(0, 16).replace(":", "")}.json`, import.meta.url);
writeFileSync(archivo, JSON.stringify({ fecha: new Date().toISOString(), veces: VECES, verdes, total: resultados.length, porEscenario, resultados }, null, 2));
console.log(`Detalle: ${archivo.pathname}`);
