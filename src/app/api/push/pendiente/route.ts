import { withAuth } from "@/lib/api";
import { getSql } from "@/lib/db";
import { labelInTz } from "@/lib/time/slots";
import { getSettings } from "@/server/agenda/settings";

export const dynamic = "force-dynamic";

/**
 * Fork SinCódigo — Lo que dice el aviso push. El push llega sin cuerpo y el
 * service worker pregunta aquí, con la sesión del dispositivo: la última cita
 * real (no del Laboratorio) creada en los últimos 15 minutos.
 */
export const GET = withAuth(async (session) => {
  const rows = await getSql()<{ scheduled_at: Date; name: string | null; source: string }[]>`
    select b.scheduled_at, c.name, b.source
    from booking b left join contact c on c.id = b.contact_id
    where b.organization_id = ${session.organizationId}
      and b.kind = 'session' and b.is_test = false and b.status = 'agendada'
      and b.created_at > now() - interval '15 minutes'
    order by b.created_at desc limit 1`;
  const cita = rows[0];
  if (!cita) {
    return Response.json({ titulo: "Vocero", cuerpo: "Hay novedades en tu agenda", url: "/bookings" });
  }
  const settings = await getSettings(session.organizationId);
  const cuando = labelInTz(new Date(cita.scheduled_at).toISOString(), settings.timezone);
  const quien = cita.name?.trim() || "Un cliente";
  return Response.json({
    titulo: "Nueva cita",
    cuerpo: `${quien} · ${cuando}${cita.source === "ai" ? " (la agendó el agente)" : ""}`,
    url: "/bookings",
  });
});
