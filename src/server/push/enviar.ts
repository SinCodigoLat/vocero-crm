import { getEnv } from "@/lib/env";
import { cabeceraVapid } from "@/server/push/vapid";
import { borrarPorId, suscripcionesDe } from "@/server/push/suscripciones";

/**
 * Fork SinCódigo — Manda un push (sin cuerpo) a todos los dispositivos del
 * negocio. El service worker pide el detalle a `/api/push/pendiente`.
 * Nunca lanza: un aviso que no sale no puede romper una cita.
 */

export function pushConfigurado(): boolean {
  const env = getEnv();
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
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
