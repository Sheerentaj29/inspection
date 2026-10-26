// GET  /api/pipeline-inspections - list with filters/pagination
// POST /api/pipeline-inspections - create new pipeline inspection report
//
// Query params:
//   q          - search across reportNumber, pipelineDescription, pipelineIdentificationNumber, isometricDrawingNumber
//   clientId   - filter by client
//   plantId    - filter by plant
//   status     - filter by status (Draft, Submitted, Approved, Rejected)
//   page       - default 1
//   pageSize   - default 10

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const plantId = url.searchParams.get("plantId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "10", 10) || 10));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { reportNumber: { contains: q } },
      { pipelineDescription: { contains: q } },
      { pipelineIdentificationNumber: { contains: q } },
      { isometricDrawingNumber: { contains: q } },
      { inspectionArea: { contains: q } },
    ];
  }
  if (clientId) where.clientId = clientId;
  if (plantId) where.plantId = plantId;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    db.pipelineInspection.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { select: { id: true, name: true } },
        plant: { select: { id: true, name: true, location: true } },
        inspector: { select: { id: true, name: true } },
        approver: { select: { id: true, name: true } },
        _count: { select: { measurements: true, revisions: true } },
      },
    }),
    db.pipelineInspection.count({ where }),
  ]);

  return NextResponse.json({
    items, total, page, pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // INSPECTOR + ADMIN can create new reports
  if (session.role !== "INSPECTOR" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — inspector role required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const required = ["reportNumber", "clientId", "plantId"];
  for (const k of required) {
    if (!body[k] || typeof body[k] !== "string") {
      return NextResponse.json({ error: `Field '${k}' is required` }, { status: 400 });
    }
  }

  // Verify plant belongs to client
  const plant = await db.plant.findUnique({
    where: { id: body.plantId },
    include: { client: true },
  });
  if (!plant) return NextResponse.json({ error: "Plant not found" }, { status: 400 });
  if (plant.clientId !== body.clientId) {
    return NextResponse.json(
      { error: "Plant does not belong to the selected client" },
      { status: 400 },
    );
  }

  // Duplicate reportNumber within client
  const existing = await db.pipelineInspection.findUnique({
    where: { clientId_reportNumber: { clientId: body.clientId, reportNumber: body.reportNumber } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Report number '${body.reportNumber}' already exists for this client` },
      { status: 409 },
    );
  }

  const created = await db.pipelineInspection.create({
    data: {
      reportNumber: body.reportNumber.trim(),
      clientId: body.clientId,
      plantId: body.plantId,
      inspectionArea: body.inspectionArea?.trim() || null,
      pipelineDescription: body.pipelineDescription?.trim() || null,
      pipelineIdentificationNumber: body.pipelineIdentificationNumber?.trim() || null,
      isometricDrawingNumber: body.isometricDrawingNumber?.trim() || null,
      materialOfConstruction: body.materialOfConstruction?.trim() || null,
      applicableStandard: body.applicableStandard || null,
      standardEdition: body.standardEdition || null,
      inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : new Date(),
      status: "Draft",
      inspectorId: session.id,
      inspectorName: session.name,
      findingsSummary: body.findingsSummary ?? null,
      comments: body.comments ?? null,
      isDemo: false,
    },
    include: {
      client: { select: { id: true, name: true } },
      plant: { select: { id: true, name: true, location: true } },
    },
  });

  await recordAudit({
    userId: session.id, userName: session.name,
    action: "CREATE", entity: "PipelineInspection", entityId: created.id,
    details: `Created pipeline report ${created.reportNumber}`,
  });

  return NextResponse.json(created, { status: 201 });
}
