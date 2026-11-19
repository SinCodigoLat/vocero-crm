import { createHash } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import type { AgentVersionSnapshot } from "@/lib/db/schema";

export type OrigenVersion = (typeof schema.agentProfileVersion.$inferSelect)["origen"];

/** Huella estable del snapshot: mismo comportamiento → misma huella. */
export function huellaDeSnapshot(s: AgentVersionSnapshot): string {
  const norm = {
    p: s.profile,
    k: s.kb.map((e) => [e.kind, e.question ?? "", e.answer ?? "", e.content ?? ""]),
  };
  return createHash("sha256").update(JSON.stringify(norm)).digest("hex").slice(0, 32);
}

/** Lo que cambió entre dos snapshots, en lenguaje de la pantalla. */
export function diferencias(
  antes: AgentVersionSnapshot | null,
  despues: AgentVersionSnapshot
): string[] {
  if (!antes) return ["Versión inicial"];
  const etiquetas: Record<keyof AgentVersionSnapshot["profile"], string> = {
    name: "nombre",
    tone: "tono",
    instructions: "instrucciones",
    escalationRules: "reglas de escalado",
    greeting: "saludo",
    role: "rol",
    tools: "herramientas",
  };
  const out: string[] = [];
  for (const k of Object.keys(etiquetas) as (keyof typeof etiquetas)[]) {
    if (JSON.stringify(antes.profile[k]) !== JSON.stringify(despues.profile[k])) {
      out.push(`Cambió ${etiquetas[k]}`);
    }
  }
  const clave = (e: AgentVersionSnapshot["kb"][number]) =>
    `${e.kind}|${e.question ?? ""}|${e.answer ?? ""}|${e.content ?? ""}`;
  const a = new Set(antes.kb.map(clave));
  const d = new Set(despues.kb.map(clave));
  const nuevas = [...d].filter((x) => !a.has(x)).length;
  const quitadas = [...a].filter((x) => !d.has(x)).length;
  if (nuevas) out.push(`Conocimiento: +${nuevas}`);
  if (quitadas) out.push(`Conocimiento: −${quitadas}`);
  return out;
}

/** Foto del comportamiento actual del agente (perfil + conocimiento). */
export async function snapshotActual(
  organizationId: string
): Promise<AgentVersionSnapshot | null> {
  const db = getDb();
  const [p] = await db
    .select()
    .from(schema.agentProfile)
    .where(scoped(schema.agentProfile.organizationId, organizationId))
    .limit(1);
  if (!p) return null;
  const kb = await db
    .select()
    .from(schema.kbEntry)
    .where(scoped(schema.kbEntry.organizationId, organizationId))
    .orderBy(asc(schema.kbEntry.createdAt));
  return {
    profile: {
      name: p.name,
      tone: p.tone,
      instructions: p.instructions,
      escalationRules: p.escalationRules,
      greeting: p.greeting,
      role: p.role,
      tools: p.tools ?? null,
    },
    kb: kb.map((e) => ({
      kind: e.kind,
      question: e.question,
      answer: e.answer,
      content: e.content,
    })),
  };
}

/**
 * Guarda una versión del comportamiento actual. Si es idéntica a la última, no
 * crea otra (devuelve `null`), salvo que se fuerce.
 */
export async function guardarVersion(input: {
  organizationId: string;
  origen: OrigenVersion;
  nota?: string | null;
  authorUserId?: string | null;
  forzar?: boolean;
}) {
  const snapshot = await snapshotActual(input.organizationId);
  if (!snapshot) return null;
  const huella = huellaDeSnapshot(snapshot);
  const db = getDb();
  const [ultima] = await db
    .select({ numero: schema.agentProfileVersion.numero, huella: schema.agentProfileVersion.huella })
    .from(schema.agentProfileVersion)
    .where(scoped(schema.agentProfileVersion.organizationId, input.organizationId))
    .orderBy(desc(schema.agentProfileVersion.numero))
    .limit(1);
  if (ultima && ultima.huella === huella && !input.forzar) return null;
  const [fila] = await db
    .insert(schema.agentProfileVersion)
    .values({
      id: newId("agentVersion"),
      organizationId: input.organizationId,
      numero: (ultima?.numero ?? 0) + 1,
      origen: ultima ? input.origen : "inicial",
      nota: input.nota?.trim() || null,
      snapshot,
      huella,
      authorUserId: input.authorUserId ?? null,
    })
    // Dos guardados a la vez no pueden repetir número: el segundo se descarta.
    .onConflictDoNothing()
    .returning();
  return fila ?? null;
}

/** Línea de tiempo con lo que cambió en cada versión respecto a la anterior. */
export async function listarVersiones(organizationId: string) {
  const db = getDb();
  const filas = await db
    .select()
    .from(schema.agentProfileVersion)
    .where(scoped(schema.agentProfileVersion.organizationId, organizationId))
    .orderBy(asc(schema.agentProfileVersion.numero));
  const huellaActual = await snapshotActual(organizationId).then((s) =>
    s ? huellaDeSnapshot(s) : null
  );
  return filas
    .map((f, i) => ({
      id: f.id,
      numero: f.numero,
      origen: f.origen,
      nota: f.nota,
      labScore: f.labScore,
      createdAt: f.createdAt,
      cambios: diferencias(filas[i - 1]?.snapshot ?? null, f.snapshot),
      esActual: huellaActual !== null && f.huella === huellaActual,
    }))
    .reverse();
}

/** Anota el score del Laboratorio en la versión que coincide con lo probado. */
export async function anotarScoreLab(organizationId: string, score: number | null) {
  if (score == null) return;
  const snapshot = await snapshotActual(organizationId);
  if (!snapshot) return;
  const huella = huellaDeSnapshot(snapshot);
  const db = getDb();
  const [v] = await db
    .select({ id: schema.agentProfileVersion.id })
    .from(schema.agentProfileVersion)
    .where(
      scoped(
        schema.agentProfileVersion.organizationId,
        organizationId,
        eq(schema.agentProfileVersion.huella, huella)
      )
    )
    .orderBy(desc(schema.agentProfileVersion.numero))
    .limit(1);
  if (!v) return;
  await db
    .update(schema.agentProfileVersion)
    .set({ labScore: Math.round(score) })
    .where(eq(schema.agentProfileVersion.id, v.id));
}

/**
 * Vuelve a poner una versión: guarda antes la actual (por si te arrepientes),
 * reemplaza el perfil y el conocimiento y registra la restauración. El
 * interruptor del agente (`enabled`) no se toca.
 */
export async function restaurarVersion(input: {
  organizationId: string;
  versionId: string;
  authorUserId?: string | null;
}): Promise<{ ok: true; numero: number } | { ok: false }> {
  const db = getDb();
  const [v] = await db
    .select()
    .from(schema.agentProfileVersion)
    .where(
      scoped(
        schema.agentProfileVersion.organizationId,
        input.organizationId,
        eq(schema.agentProfileVersion.id, input.versionId)
      )
    )
    .limit(1);
  if (!v) return { ok: false };

  await guardarVersion({
    organizationId: input.organizationId,
    origen: "antes_de_restaurar",
    nota: `Estado antes de volver a la v${v.numero}`,
    authorUserId: input.authorUserId,
  });

  const { profile, kb } = v.snapshot;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.agentProfile)
      .set({
        name: profile.name,
        tone: profile.tone,
        instructions: profile.instructions,
        escalationRules: profile.escalationRules,
        greeting: profile.greeting,
        role: profile.role,
        tools: profile.tools,
        updatedAt: new Date(),
      })
      .where(scoped(schema.agentProfile.organizationId, input.organizationId));
    await tx
      .delete(schema.kbEntry)
      .where(scoped(schema.kbEntry.organizationId, input.organizationId));
    if (kb.length) {
      const base = Date.now();
      await tx.insert(schema.kbEntry).values(
        kb.map((e, i) => ({
          id: newId("kbEntry"),
          organizationId: input.organizationId,
          kind: e.kind,
          question: e.question,
          answer: e.answer,
          content: e.content,
          // Conserva el orden original.
          createdAt: new Date(base + i),
        }))
      );
    }
  });

  await guardarVersion({
    organizationId: input.organizationId,
    origen: "restaurada",
    nota: `Restaurada la v${v.numero}`,
    authorUserId: input.authorUserId,
    forzar: true,
  });
  return { ok: true, numero: v.numero };
}

/**
 * Envuelve un cambio al comportamiento: guarda antes el estado actual (si no
 * está ya guardado) y después el nuevo. Encadenadas, la foto de «después» de un
 * cambio es la de «antes» del siguiente, así que no se duplican.
 */
export async function conVersion<T>(
  organizationId: string,
  authorUserId: string | null,
  cambio: () => Promise<T>
): Promise<T> {
  await guardarVersion({ organizationId, origen: "auto", authorUserId, nota: "Antes del cambio" }).catch(
    () => null
  );
  const r = await cambio();
  await guardarVersion({ organizationId, origen: "auto", authorUserId }).catch(() => null);
  return r;
}
