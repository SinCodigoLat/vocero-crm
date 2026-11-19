"use client";

import { useEffect } from "react";

/**
 * Fork SinCódigo — Suscribe este dispositivo a los avisos push (citas nuevas)
 * en cuanto el permiso de avisos está concedido. Idempotente: si ya hay
 * suscripción, solo se la vuelve a mandar al servidor (por si cambió).
 *
 * En iPhone solo funciona con Vocero instalado en la pantalla de inicio
 * (Compartir → «Agregar a inicio») y el permiso pedido desde ahí.
 */

function aBytes(b64url: string): Uint8Array {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function suscribirPush(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    if (Notification.permission !== "granted") return false;
    const { publicKey } = (await (await fetch("/api/push")).json()) as { publicKey: string | null };
    if (!publicKey) return false;
    const registro = await navigator.serviceWorker.ready;
    let sub = await registro.pushManager.getSubscription();
    if (!sub) {
      sub = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: aBytes(publicKey) as BufferSource,
      });
    }
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sub.toJSON()),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function AsegurarPush() {
  useEffect(() => {
    void suscribirPush();
  }, []);
  return null;
}
