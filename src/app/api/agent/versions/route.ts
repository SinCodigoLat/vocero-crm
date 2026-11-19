import { canConfigure } from "@/lib/auth/roles";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { guardarVersion, listarVersiones } from "@/server/agent/versions";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  return Response.json({ versions: await listarVersiones(session.organizationId) });
});

const postSchema = z.object({ nota: z.string().trim().max(300).optional() });

/** Guarda a mano una versión con nota («antes de abrir el agente a leads»). */
export const POST = withAuth(async (session, req: Request) => {
  if (!canConfigure(session.role)) {
    return apiError(403, "forbidden", "Solo quien administra puede hacerlo");
  }
  const body = await parseBody(req, postSchema);
  if (!body.ok) return body.response;
  const v = await guardarVersion({
    organizationId: session.organizationId,
    origen: "manual",
    nota: body.data.nota,
    authorUserId: session.userId,
    forzar: true,
  });
  return Response.json({ ok: true, numero: v?.numero ?? null }, { status: 201 });
});
