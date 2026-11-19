import { z } from "zod";
import { parseBody, withAuth } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { pushConfigurado } from "@/server/push/enviar";
import { borrarSuscripcion, guardarSuscripcion } from "@/server/push/suscripciones";

export const dynamic = "force-dynamic";

/** Fork SinCódigo — Suscripción del dispositivo a los avisos push. */

export const GET = withAuth(async () => {
  if (!pushConfigurado()) return Response.json({ publicKey: null });
  return Response.json({ publicKey: getEnv().VAPID_PUBLIC_KEY });
});

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, subSchema);
  if (!body.ok) return body.response;
  await guardarSuscripcion({
    organizationId: session.organizationId,
    userId: session.userId,
    endpoint: body.data.endpoint,
    p256dh: body.data.keys.p256dh,
    auth: body.data.keys.auth,
  });
  return Response.json({ ok: true });
});

export const DELETE = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, z.object({ endpoint: z.string().url() }));
  if (!body.ok) return body.response;
  await borrarSuscripcion(session.organizationId, body.data.endpoint);
  return Response.json({ ok: true });
});
