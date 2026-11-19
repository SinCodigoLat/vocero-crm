import { apiError, withAuth } from "@/lib/api";
import { borrarPrueba, leerPrueba } from "@/server/lab/chat";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export const GET = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const prueba = await leerPrueba(session.organizationId, id);
  if (!prueba) return apiError(404, "not_found", "Prueba no encontrada");
  return Response.json(prueba);
});

export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  if (!(await borrarPrueba(session.organizationId, id))) {
    return apiError(404, "not_found", "Prueba no encontrada");
  }
  return Response.json({ ok: true });
});
