import { canConfigure } from "@/lib/auth/roles";
import { apiError, withAuth } from "@/lib/api";
import { restaurarVersion } from "@/server/agent/versions";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const POST = withAuth(async (session, _req: Request, ctx: Params) => {
  if (!canConfigure(session.role)) {
    return apiError(403, "forbidden", "Solo quien administra puede hacerlo");
  }
  const { id } = await ctx.params;
  const r = await restaurarVersion({
    organizationId: session.organizationId,
    versionId: id,
    authorUserId: session.userId,
  });
  if (!r.ok) return apiError(404, "not_found", "Versión no encontrada");
  return Response.json({ ok: true, numero: r.numero });
});
