// Audit log helper - thin wrapper around db.auditLog.create
import { db } from "@/lib/db";

export interface AuditEntry {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
}

export async function recordAudit(entry: AuditEntry) {
  try {
    await db.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        userName: entry.userName ?? "system",
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        details: entry.details ?? null,
      },
    });
  } catch (e) {
    // Audit failures must not break the user request.
    console.error("AUDIT LOG FAILED:", e);
  }
}
