// POST /api/pipeline-inspections/[id]/override
// Records an authorized nominal-thickness override with reason.
// Only ADMIN can apply overrides. The reason is recorded in the audit log
// and persisted on the report itself for traceability.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden — administrator role required to apply nominal thickness override" },
      { status: 403 },
    );
  }
  const { id } = await ctx.params;
  const existing = await db.pipelineInspection.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.reason || typeof body.reason !== "string" || body.reason.trim().length < 10) {
    return NextResponse.json(
      { error: "Override reason must be at least 10 characters and recorded for audit trail" },
      { status: 400 },
    );
  }

  const updated = await db.pipelineInspection.update({
    where: { id },
    data: {
      overrideReason: body.reason.trim(),
      overrideAppliedById: session.id,
      overrideAppliedAt: new Date(),
    },
  });

  await recordAudit({
    userId: session.id, userName: session.name,
    action: "OVERRIDE", entity: "PipelineInspection", entityId: updated.id,
    details: `Applied nominal thickness override on report ${updated.reportNumber}: ${body.reason.trim().slice(0, 200)}`,
  });

  return NextResponse.json(updated);
}
