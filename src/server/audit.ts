import { db } from "@/server/db"
import { auditLogs } from "@/server/db/schema"

type AuditSession = {
  user?: {
    id?: string | null
    sekolahId?: string | null
  } | null
} | null

type AuditContext = {
  session: AuditSession
}

type AuditEvent = {
  action: string
  entity: string
  entityId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function logAudit(ctx: AuditContext, event: AuditEvent) {
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    userId: ctx.session?.user?.id ?? null,
    sekolahId: ctx.session?.user?.sekolahId ?? null,
    action: event.action,
    entity: event.entity,
    entityId: event.entityId ?? null,
    metadata: event.metadata ?? null,
  })
}
