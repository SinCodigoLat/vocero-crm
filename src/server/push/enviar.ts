import { getEnv } from "@/lib/env";
import { cabeceraVapid } from "@/server/push/vapid";
import { borrarPorId, suscripcionesDe } from "@/server/push/suscripciones";

/**
 * Fork SinCódigo — Manda un push (sin cuerpo) a todos los dispositivos del
 * negocio. El service worker pide el detalle a `/api/push/pendiente`.
 * Nunca lanza: un aviso que no sale no puede romper una cita.
 */

/** Lo que dirá el próximo aviso de cada negocio (un proceso = un mapa basta). */
export type Aviso = { titulo: string; cuerpo: string; url: string; en: number };
const ultimoAviso = new Map<string, Aviso>();
const ultimoPorConversacion = new Map<string, number>();
/** Una ráfaga de mensajes del mismo cliente avisa una vez. */
export const PAUSA_POR_CONVERSACION_MS = 45_000;

export function avisoPendiente(organizationId: string, ahora = Date.now()): Aviso | null {
  const a = ultimoAviso.get(organizationId);
  return a && ahora - a.en < 10 * 60_000 ? a : null;
}

/** Aviso de mensaje entrante. Devuelve false si se omitió por la pausa. */
export function avisarMensaje(input: {
  organizationId: string;
  conversationId: string;
  nombre: string;
  texto: string;
  ahora?: number;
}): boolean {
  const ahora = input.ahora ?? Date.now();
  const previo = ultimoPorConversacion.get(input.conversationId) ?? 0;
  if (ahora - previo < PAUSA_POR_CONVERSACION_MS) return false;
  ultimoPorConversacion.set(input.conversationId, ahora);
  const cuerpo = input.texto.replace(/\s+/g, " ").trim().slice(0, 140) || "Mensaje nuevo";
  ultimoAviso.set(input.organizationId, {
    titulo: input.nombre || "Mensaje nuevo",
    cuerpo,
    url: `/inbox?conversation=${encodeURIComponent(input.conversationId)}`,
    en: ahora,
  });
  if (pushConfigurado()) {
    void avisarATodos(input.organizationId).catch((err) => console.warn(`[push] ${err}`));
  }
  return true;
}

/** Aviso de cita nueva: el texto lo arma quien la crea. */
export function avisarCita(organizationId: string, aviso: Omit<Aviso, "en">): void {
  ultimoAviso.set(organizationId, { ...aviso, en: Date.now() });
  void avisarATodos(organizationId).catch((err) => console.warn(`[push] ${err}`));
}

export function pushConfigurado(): boolean {
  try {
    const env = getEnv();
    return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  } catch {
    return false;
  }
}

export async function avisarATodos(organizationId: string): Promise<number> {
  if (!pushConfigurado()) return 0;
  const env = getEnv();
  const subs = await suscripcionesDe(organizationId);
  let enviados = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        const res = await fetch(s.endpoint, {
          method: "POST",
          headers: {
            TTL: "86400",
            Urgency: "high",
            "Content-Length": "0",
            Authorization: cabeceraVapid({
              endpoint: s.endpoint,
              publica: env.VAPID_PUBLIC_KEY!,
              privada: env.VAPID_PRIVATE_KEY!,
              sujeto: env.VAPID_SUBJECT || env.APP_BASE_URL,
            }),
          },
        });
        if (res.status === 404 || res.status === 410) {
          await borrarPorId(s.id);
        } else if (res.ok) {
          enviados += 1;
        } else {
          console.warn(`[push] ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
        }
      } catch (err) {
        console.warn(`[push] no se pudo avisar: ${err}`);
      }
    })
  );
  return enviados;
}
