// GET    /api/pipeline-inspections/[id] - get full inspection with measurements
// PUT    /api/pipeline-inspections/[id] - update header fields
// DELETE /api/pipeline-inspections/[id] - delete entire report (admin only)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const report = await db.pipelineInspection.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      plant: { select: { id: true, name: true, location: true, address: true } },
      inspector: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      measurements: {
        orderBy: { sortOrder: "asc" },
        include: {
          componentType: { select: { id: true, code: true, label: true } },
          standard: { select: { id: true, standard: true, edition: true, nominalSizeInch: true, schedule: true, wallThicknessMm: true, isVerified: true } },
        },
      },
      revisions: { orderBy: { revisionNumber: "desc" } },
    },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(report);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Inspector + admin can edit Draft reports. Once Approved, only admin via revision flow.
  const { id } = await ctx.params;
  const existing = await db.pipelineInspection.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === "Approved" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Approved reports can only be edited by an administrator via the revision flow" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // If clientId/reportNumber changing, check for duplicates
  const newClientId = body.clientId ?? existing.clientId;
  const newReportNumber = (body.reportNumber ?? existing.reportNumber).trim();
  if (newClientId !== existing.clientId || newReportNumber !== existing.reportNumber) {
    const dupe = await db.pipelineInspection.findUnique({
      where: { clientId_reportNumber: { clientId: newClientId, reportNumber: newReportNumber } },
    });
    if (dupe && dupe.id !== id) {
      return NextResponse.json(
        { error: `Report number '${newReportNumber}' already exists for this client` },
        { status: 409 },
      );
    }
  }

  // Plant must belong to client
  if (body.plantId) {
    const plant = await db.plant.findUnique({ where: { id: body.plantId } });
    if (!plant || plant.clientId !== newClientId) {
      return NextResponse.json(
        { error: "Plant does not belong to the selected client" },
        { status: 400 },
      );
    }
  }

  const updated = await db.pipelineInspection.update({
    where: { id },
    data: {
      reportNumber: newReportNumber,
      clientId: newClientId,
      plantId: body.plantId ?? existing.plantId,
      inspectionArea: body.inspectionArea ?? existing.inspectionArea,
      pipelineDescription: body.pipelineDescription ?? existing.pipelineDescription,
      pipelineIdentificationNumber: body.pipelineIdentificationNumber ?? existing.pipelineIdentificationNumber,
      isometricDrawingNumber: body.isometricDrawingNumber ?? existing.isometricDrawingNumber,
      materialOfConstruction: body.materialOfConstruction ?? existing.materialOfConstruction,
      applicableStandard: body.applicableStandard ?? existing.applicableStandard,
      standardEdition: body.standardEdition ?? existing.standardEdition,
      inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : existing.inspectionDate,
      findingsSummary: body.findingsSummary ?? existing.findingsSummary,
      comments: body.comments ?? existing.comments,
    },
  });

  await recordAudit({
    userId: session.id, userName: session.name,
    action: "UPDATE", entity: "PipelineInspection", entityId: updated.id,
    details: `Updated pipeline report header ${updated.reportNumber}`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — administrator role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const existing = await db.pipelineInspection.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.pipelineInspection.delete({ where: { id } });
  await recordAudit({
    userId: session.id, userName: session.name,
    action: "DELETE", entity: "PipelineInspection", entityId: id,
    details: `Deleted pipeline report ${existing.reportNumber}`,
  });
  return NextResponse.json({ ok: true });
}
