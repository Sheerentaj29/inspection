// POST /api/pipeline-inspections/[id]/approve - approve (APPROVER + ADMIN only)
// Records approval, snapshots revision, generates final PDF.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "APPROVER" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden — report approver or administrator role required" },
      { status: 403 },
    );
  }
  const { id } = await ctx.params;
  const existing = await db.pipelineInspection.findUnique({
    where: { id },
    include: { measurements: true, revisions: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "Approved") {
    return NextResponse.json(
      { error: "Report is already approved. Use the revision flow to make changes." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));

  // Snapshot the current state into a revision
  const nextRevisionNumber = existing.revisionNumber + 1;
  await db.reportRevision.create({
    data: {
      pipelineInspectionId: id,
      revisionNumber: nextRevisionNumber,
      revisedById: session.id,
      revisedByName: session.name,
      changeDescription: body.approvalNotes ?? "Report approved and PDF generated",
      snapshotData: JSON.stringify({
        header: {
          reportNumber: existing.reportNumber,
          inspectionArea: existing.inspectionArea,
          pipelineDescription: existing.pipelineDescription,
          pipelineIdentificationNumber: existing.pipelineIdentificationNumber,
          isometricDrawingNumber: existing.isometricDrawingNumber,
          materialOfConstruction: existing.materialOfConstruction,
          applicableStandard: existing.applicableStandard,
          standardEdition: existing.standardEdition,
          findingsSummary: existing.findingsSummary,
          comments: existing.comments,
        },
        measurements: existing.measurements,
      }),
    },
  });

  const updated = await db.pipelineInspection.update({
    where: { id },
    data: {
      status: "Approved",
      revisionNumber: nextRevisionNumber,
      approvedById: session.id,
      approvedAt: new Date(),
      approvalNotes: body.approvalNotes ?? null,
      inspectorName: existing.inspectorName,
    },
  });

  await recordAudit({
    userId: session.id, userName: session.name,
    action: "APPROVE", entity: "PipelineInspection", entityId: updated.id,
    details: `Approved pipeline report ${updated.reportNumber} (revision ${nextRevisionNumber})`,
  });

  return NextResponse.json(updated);
}
