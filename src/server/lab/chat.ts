import { and, asc, desc, eq, lte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { encolarDespacho } from "@/server/dispatch/outbox";
import { iniciarWorker, programarTanda } from "@/server/dispatch/worker";
import { olvidar, upsertTestContact } from "@/server/lab/runner";

/**
 * Chat libre de pruebas (modo 1: sin WhatsApp). Tú escribes como si fueras el
 * cliente; el agente REAL contesta por el mismo despacho que el Laboratorio y
 * su respuesta se guarda en el hilo sin enviarse a ningún lado (`is_test`).
 *
 * Histórico: «Empezar de cero» NO borra. La conversación queda archivada y se
 * abre una nueva; la actual es siempre la más reciente del contacto de prueba.
 */
const CONTACTO = { phone: "5210000000099", contactName: "[Prueba] Tú (chat libre)" };

type Fila = typeof schema.conversation.$inferSelect;

async function crearConversacion(organizationId: string, contactId: string): Promise<Fila> {
  const db = getDb();
  const id = newId("conversation");
  await db.insert(schema.conversation).values({
    id,
    organizationId,
    contactId,
    isTest: true,
    aiEnabled: true,
  });
  const [c] = await db
    .select()
    .from(schema.conversation)
    .where(eq(schema.conversation.id, id))
    .limit(1);
  return c!;
}

async function conversaciones(organizationId: string) {
  const contactId = await upsertTestContact(organizationId, CONTACTO);
  const filas = await getDb()
    .select()
    .from(schema.conversation)
    .where(
      scoped(
        schema.conversation.organizationId,
        organizationId,
        eq(schema.conversation.contactId, contactId),
        eq(schema.conversation.isTest, true)
      )
    )
    .orderBy(desc(schema.conversation.createdAt));
  return { contactId, filas };
}

async function mensajesDe(organizationId: string, conversationId: string) {
  const msgs = await getDb()
    .select()
    .from(schema.message)
    .where(
      scoped(
        schema.message.organizationId,
        organizationId,
        eq(schema.message.conversationId, conversationId)
      )
    )
    .orderBy(asc(schema.message.createdAt));
  return msgs
    .filter((m) => m.text)
    .map((m) => ({
      id: m.id,
      from: m.direction === "in" ? ("tu" as const) : ("agente" as const),
      text: m.text!,
      at: m.createdAt.toISOString(),
    }));
}

const motivo = (c: Fila) => (c.handoffAt ? (c.handoffReason ?? "sin motivo") : null);

/** Número de la versión del agente que estaba activa cuando empezó la prueba. */
async function versionEn(organizationId: string, fecha: Date): Promise<number | null> {
  const [v] = await getDb()
    .select({ numero: schema.agentProfileVersion.numero })
    .from(schema.agentProfileVersion)
    .where(
      scoped(
        schema.agentProfileVersion.organizationId,
        organizationId,
        lte(schema.agentProfileVersion.createdAt, fecha)
      )
    )
    .orderBy(desc(schema.agentProfileVersion.numero))
    .limit(1);
  return v?.numero ?? null;
}

export async function leerChat(organizationId: string) {
  const { filas } = await conversaciones(organizationId);
  const [actual, ...previas] = filas;
  const historial = [];
  for (const c of previas) {
    const msgs = await mensajesDe(organizationId, c.id);
    if (msgs.length === 0) continue;
    historial.push({
      id: c.id,
      startedAt: c.createdAt.toISOString(),
      count: msgs.length,
      preview: msgs.find((m) => m.from === "tu")?.text.slice(0, 80) ?? "",
      handoff: motivo(c),
      version: await versionEn(organizationId, c.createdAt),
    });
  }
  return {
    messages: actual ? await mensajesDe(organizationId, actual.id) : [],
    handoff: actual ? motivo(actual) : null,
    historial,
  };
}

/** Hilo completo de una prueba pasada (solo del contacto de prueba). */
export async function leerPrueba(organizationId: string, conversationId: string) {
  const { filas } = await conversaciones(organizationId);
  const c = filas.find((f) => f.id === conversationId);
  if (!c) return null;
  return {
    startedAt: c.createdAt.toISOString(),
    handoff: motivo(c),
    version: await versionEn(organizationId, c.createdAt),
    messages: await mensajesDe(organizationId, c.id),
  };
}

export async function enviarAlChat(organizationId: string, text: string) {
  const db = getDb();
  const { contactId, filas } = await conversaciones(organizationId);
  const conversation = filas[0] ?? (await crearConversacion(organizationId, contactId));
  const now = new Date();
  const messageId = newId("message");
  await db.insert(schema.message).values({
    id: messageId,
    organizationId,
    conversationId: conversation.id,
    direction: "in",
    type: "text",
    text,
    status: "delivered",
    waTimestamp: now,
  });
  await db
    .update(schema.conversation)
    .set({ lastInboundAt: now, lastMessageAt: now, updatedAt: now })
    .where(eq(schema.conversation.id, conversation.id));
  const { notBefore } = await encolarDespacho({
    organizationId,
    conversationId: conversation.id,
    messageIds: [messageId],
    inmediato: true,
  });
  iniciarWorker();
  programarTanda(notBefore);
}

/** Empieza de cero: el cerebro olvida, la prueba queda archivada y se abre otra. */
export async function reiniciarChat(organizationId: string) {
  const { contactId, filas } = await conversaciones(organizationId);
  const actual = filas[0];
  if (actual) await olvidar(organizationId, actual.id, contactId);
  // Si la actual está vacía no hay nada que archivar: se reutiliza.
  if (actual && (await mensajesDe(organizationId, actual.id)).length === 0) return;
  await crearConversacion(organizationId, contactId);
}

/** Borra una prueba del histórico (solo las del contacto de prueba). */
export async function borrarPrueba(organizationId: string, conversationId: string) {
  const { filas } = await conversaciones(organizationId);
  if (!filas.some((f) => f.id === conversationId)) return false;
  await getDb()
    .delete(schema.conversation)
    .where(
      and(
        eq(schema.conversation.id, conversationId),
        eq(schema.conversation.organizationId, organizationId)
      )
    );
  return true;
}
