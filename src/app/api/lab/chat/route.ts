import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { leerConfigDespacho } from "@/server/brains/config";
import { enviarAlChat, leerChat, reiniciarChat } from "@/server/lab/chat";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  return Response.json({
    ...(await leerChat(session.organizationId)),
    brainConnected: leerConfigDespacho().active,
  });
});

const Body = z.object({ text: z.string().trim().min(1).max(2000) });

export const POST = withAuth(async (session, req: Request) => {
  if (!leerConfigDespacho().active) {
    return apiError(409, "sin_cerebro", "Conecta tu agente para conversar con él");
  }
  const body = await parseBody(req, Body);
  if (!body.ok) return body.response;
  await enviarAlChat(session.organizationId, body.data.text);
  return Response.json({ ok: true }, { status: 202 });
});

export const DELETE = withAuth(async (session) => {
  await reiniciarChat(session.organizationId);
  return Response.json({ ok: true });
});
