// PUT    /api/pipeline-inspections/[id]/measurements/[mid] - update single measurement
// DELETE /api/pipeline-inspections/[id]/measurements/[mid] - delete measurement
// PATCH  /api/pipeline-inspections/[id]/measurements/[mid] - reorder (sortOrder only)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const MEASUREMENT_STATUSES = ["Measured", "NotMeasured", "NotApplicable"] as const;
type MeasurementStatus = (typeof MEASUREMENT_STATUSES)[number];

function parseNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

function computeObservedMinimum(args: {
  northMm: number | null; northStatus: string;
  eastMm: number | null; eastStatus: string;
  southMm: number | null; southStatus: string;
  westMm: number | null; westStatus: string;
}): number | null {
  const values: number[] = [];
  for (const [val, status] of [
    [args.northMm, args.northStatus],
    [args.eastMm, args.eastStatus],
    [args.southMm, args.southStatus],
    [args.westMm, args.westStatus],
  ] as const) {
    if (status === "Measured" && val !== null && val !== undefined) {
      values.push(Number(val));
    }
  }
  if (values.length === 0) return null;
  return Math.min(...values);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; mid: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "INSPECTOR" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — inspector role required" }, { status: 403 });
  }
  const { id, mid } = await ctx.params;
  const report = await db.pipelineInspection.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.status === "Approved" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Approved reports can only be edited by an administrator via the revision flow" },
      { status: 403 },
    );
  }

  const existing = await db.thicknessMeasurement.findUnique({ where: { id: mid } });
  if (!existing || existing.pipelineInspectionId !== id) {
    return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // If pipeSizeInch or pipeSchedule changes, re-resolve the standard
  const newSize = body.pipeSizeInch ?? existing.pipeSizeInch;
  const newSchedule = body.pipeSchedule ?? existing.pipeSchedule;
  let nominalThicknessMm = existing.nominalThicknessMm;
  let standardId = existing.standardId;
  let standardMismatch = false;

  if (newSize !== existing.pipeSizeInch || newSchedule !== existing.pipeSchedule) {
    const standardFilter: Record<string, string> = {
      nominalSizeInch: newSize, schedule: newSchedule,
    };
    if (report.applicableStandard) standardFilter.standard = report.applicableStandard;
    if (report.standardEdition) standardFilter.edition = report.standardEdition;

    let pipeStandard = await db.pipeStandard.findFirst({ where: standardFilter });
    if (!pipeStandard) {
      pipeStandard = await db.pipeStandard.findFirst({
        where: { nominalSizeInch: newSize, schedule: newSchedule },
      });
      if (pipeStandard) standardMismatch = true;
    }

    if (!pipeStandard) {
      return NextResponse.json(
        {
          error: `Unsupported combination: ${newSize}" ${newSchedule} not found in any seeded ASME standard table. Add it via the Pipe Standards table (admin) before recording measurements.`,
          unsupportedCombination: true,
        },
        { status: 422 },
      );
    }
    nominalThicknessMm = pipeStandard.wallThicknessMm;
    standardId = pipeStandard.id;
  }

  // Component type lookup
  let componentTypeId = existing.componentTypeId;
  let componentTypeCode = existing.componentTypeCode;
  if (body.componentTypeCode && body.componentTypeCode !== existing.componentTypeCode) {
    const ct = await db.componentType.findUnique({ where: { code: body.componentTypeCode } });
    if (!ct) {
      return NextResponse.json(
        { error: `Unknown component type: ${body.componentTypeCode}` },
        { status: 400 },
      );
    }
    componentTypeId = ct.id;
    componentTypeCode = ct.code;
  }

  // Validate measurement statuses
  const normalizeStatus = (s: unknown, fallback: string): MeasurementStatus => {
    if (typeof s === "string" && MEASUREMENT_STATUSES.includes(s as MeasurementStatus)) {
      return s as MeasurementStatus;
    }
    return fallback as MeasurementStatus;
  };

  const northMm = body.northMm !== undefined ? parseNum(body.northMm) : existing.northMm;
  const northStatus = normalizeStatus(body.northStatus ?? existing.northStatus, "NotMeasured");
  const eastMm = body.eastMm !== undefined ? parseNum(body.eastMm) : existing.eastMm;
  const eastStatus = normalizeStatus(body.eastStatus ?? existing.eastStatus, "NotMeasured");
  const southMm = body.southMm !== undefined ? parseNum(body.southMm) : existing.southMm;
  const southStatus = normalizeStatus(body.southStatus ?? existing.southStatus, "NotMeasured");
  const westMm = body.westMm !== undefined ? parseNum(body.westMm) : existing.westMm;
  const westStatus = normalizeStatus(body.westStatus ?? existing.westStatus, "NotMeasured");

  // If a status is "Measured", value MUST be valid
  const invalidMeasured = (
    [
      [northStatus, northMm], [eastStatus, eastMm],
      [southStatus, southMm], [westStatus, westMm],
    ] as Array<[string, number | null]>
  ).filter(([s, v]) => s === "Measured" && v === null);
  if (invalidMeasured.length > 0) {
    return NextResponse.json(
      { error: "Status 'Measured' requires a valid positive value." },
      { status: 400 },
    );
  }

  // Recompute observed minimum (unless override is being applied)
  const observedMinimumOverride = body.observedMinimumOverride !== undefined
    ? parseNum(body.observedMinimumOverride)
    : existing.observedMinimumOverride;

  const observedMinimumMm = body.observedMinimumMm !== undefined
    ? parseNum(body.observedMinimumMm)
    : computeObservedMinimum({
        northMm, northStatus, eastMm, eastStatus,
        southMm, southStatus, westMm, westStatus,
      });

  const updated = await db.thicknessMeasurement.update({
    where: { id: mid },
    data: {
      pointNo: body.pointNo?.trim() ?? existing.pointNo,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
      pipeSizeInch: newSize,
      pipeSchedule: newSchedule,
      nominalThicknessMm,
      standardId,
      componentTypeId,
      componentTypeCode,
      northMm, northStatus,
      eastMm, eastStatus,
      southMm, southStatus,
      westMm, westStatus,
      observedMinimumMm,
      observedMinimumOverride,
      findingsComments: body.findingsComments?.trim() ?? existing.findingsComments,
    },
    include: {
      componentType: { select: { id: true, code: true, label: true } },
      standard: { select: { id: true, standard: true, edition: true, nominalSizeInch: true, schedule: true, wallThicknessMm: true, isVerified: true } },
    },
  });

  await recordAudit({
    userId: session.id, userName: session.name,
    action: "UPDATE", entity: "ThicknessMeasurement", entityId: updated.id,
    details: `Updated measurement ${updated.pointNo} (${updated.pipeSizeInch}" ${updated.pipeSchedule}, nominal ${updated.nominalThicknessMm}mm, observed min ${updated.observedMinimumMm ?? "—"}mm)${standardMismatch ? " [STANDARD MISMATCH]" : ""}`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; mid: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "INSPECTOR" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — inspector role required" }, { status: 403 });
  }
  const { id, mid } = await ctx.params;
  const report = await db.pipelineInspection.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.status === "Approved" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Approved reports can only be edited by an administrator via the revision flow" },
      { status: 403 },
    );
  }
  const existing = await db.thicknessMeasurement.findUnique({ where: { id: mid } });
  if (!existing || existing.pipelineInspectionId !== id) {
    return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
  }

  await db.thicknessMeasurement.delete({ where: { id: mid } });
  await recordAudit({
    userId: session.id, userName: session.name,
    action: "DELETE", entity: "ThicknessMeasurement", entityId: mid,
    details: `Deleted measurement ${existing.pointNo} from report ${report.reportNumber}`,
  });
  return NextResponse.json({ ok: true });
}
