// GET /api/equipment/[id]/inspections - list inspections for an equipment
// POST /api/equipment/[id]/inspections - create new inspection record

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
  const inspections = await db.inspection.findMany({
    where: { equipmentId: id },
    orderBy: { inspectionDate: "desc" },
    include: { inspector: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ items: inspections });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const eq = await db.equipment.findUnique({ where: { id } });
  if (!eq) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (!body.inspectionDate) {
    return NextResponse.json({ error: "Inspection date is required" }, { status: 400 });
  }
  const date = new Date(body.inspectionDate);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid inspection date" }, { status: 400 });
  }
  if (!body.inspectionType) {
    return NextResponse.json({ error: "Inspection type is required" }, { status: 400 });
  }

  // measurements is a free-form array; serialize to JSON
  let measurementsJson: string | null = null;
  if (Array.isArray(body.measurements)) {
    measurementsJson = JSON.stringify(body.measurements);
  } else if (typeof body.measurements === "string") {
    measurementsJson = body.measurements;
  }

  const inspection = await db.inspection.create({
    data: {
      equipmentId: id,
      inspectorId: session.id,
      inspectionDate: date,
      inspectionType: body.inspectionType,
      status: body.status ?? "Completed",
      summary: body.summary ?? null,
      observations: body.observations ?? null,
      measurements: measurementsJson,
      photoCount: Number.isFinite(Number(body.photoCount)) ? Number(body.photoCount) : 0,
      reportPath: body.reportPath ?? null,
      isDemo: false,
    },
    include: { inspector: { select: { id: true, name: true, email: true } } },
  });

  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "CREATE",
    entity: "Inspection",
    entityId: inspection.id,
    details: `New ${inspection.inspectionType} inspection on equipment ${eq.equipmentId}`,
  });

  return NextResponse.json(inspection, { status: 201 });
}
