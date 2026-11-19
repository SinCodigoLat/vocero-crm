import { and, asc, desc, eq } from "drizzle-orm";
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
 */
const CONTACTO = { phone: "5210000000099", contactName: "[Prueba] Tú (chat libre)" };

async function conversacionDeChat(organizationId: string) {
  const db = getDb();
  const contactId = await upsertTestContact(organizationId, CONTACTO);
  const [existente] = await db
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
    .orderBy(desc(schema.conversation.createdAt))
    .limit(1);
  return { contactId, conversation: existente ?? null };
}

export async function leerChat(organizationId: string) {
  const { conversation } = await conversacionDeChat(organizationId);
  if (!conversation) return { messages: [], handoff: null as string | null };
  const msgs = await getDb()
    .select()
    .from(schema.message)
    .where(
      scoped(
        schema.message.organizationId,
        organizationId,
        eq(schema.message.conversationId, conversation.id)
      )
    )
    .orderBy(asc(schema.message.createdAt));
  return {
    messages: msgs
      .filter((m) => m.text)
      .map((m) => ({
        id: m.id,
        from: m.direction === "in" ? ("tu" as const) : ("agente" as const),
        text: m.text!,
        at: m.createdAt.toISOString(),
      })),
    handoff: conversation.handoffAt
      ? (conversation.handoffReason ?? "sin motivo")
      : null,
  };
}

export async function enviarAlChat(organizationId: string, text: string) {
  const db = getDb();
  const { contactId, conversation: previa } = await conversacionDeChat(organizationId);
  let conversation = previa;
  if (!conversation) {
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
    conversation = c!;
  }
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

/** Empieza de cero: el cerebro olvida y el hilo se borra. */
export async function reiniciarChat(organizationId: string) {
  const { contactId, conversation } = await conversacionDeChat(organizationId);
  if (!conversation) return;
  await olvidar(organizationId, conversation.id, contactId);
  await getDb()
    .delete(schema.conversation)
    .where(
      and(
        eq(schema.conversation.id, conversation.id),
        eq(schema.conversation.organizationId, organizationId)
      )
    );
}
