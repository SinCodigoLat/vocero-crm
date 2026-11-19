import { getSql } from "@/lib/db";
import { randomUUID } from "node:crypto";

/**
 * Fork SinCódigo — Suscripciones de push por dispositivo.
 *
 * La tabla se crea sola (CREATE TABLE IF NOT EXISTS) en vez de ir en una
 * migración de drizzle: así el fork no choca con la numeración de las
 * migraciones de upstream al hacer merge.
 */

let lista: Promise<void> | null = null;

function asegurarTabla(): Promise<void> {
  lista ??= (async () => {
    const sql = getSql();
    await sql`
      create table if not exists push_subscription (
        id text primary key,
        organization_id text not null references organization(id) on delete cascade,
        user_id text not null,
        endpoint text not null unique,
        p256dh text not null,
        auth text not null,
        created_at timestamp not null default now()
      )`;
    await sql`create index if not exists push_subscription_org_idx on push_subscription (organization_id)`;
  })().catch((err) => {
    lista = null;
    throw err;
  });
  return lista;
}

export type Suscripcion = { id: string; endpoint: string };

export async function guardarSuscripcion(input: {
  organizationId: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  await asegurarTabla();
  const sql = getSql();
  await sql`
    insert into push_subscription (id, organization_id, user_id, endpoint, p256dh, auth)
    values (${"push_" + randomUUID()}, ${input.organizationId}, ${input.userId},
            ${input.endpoint}, ${input.p256dh}, ${input.auth})
    on conflict (endpoint) do update set
      organization_id = excluded.organization_id,
      user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth`;
}

export async function borrarSuscripcion(organizationId: string, endpoint: string): Promise<void> {
  await asegurarTabla();
  const sql = getSql();
  await sql`delete from push_subscription where organization_id = ${organizationId} and endpoint = ${endpoint}`;
}

export async function borrarPorId(id: string): Promise<void> {
  await asegurarTabla();
  await getSql()`delete from push_subscription where id = ${id}`;
}

export async function suscripcionesDe(organizationId: string): Promise<Suscripcion[]> {
  await asegurarTabla();
  const rows = await getSql()<Suscripcion[]>`
    select id, endpoint from push_subscription where organization_id = ${organizationId}`;
  return [...rows];
}
