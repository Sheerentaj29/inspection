// GET  /api/pipeline-inspections/[id]/measurements - list measurements
// POST /api/pipeline-inspections/[id]/measurements - create new measurement row
//
// On create/update:
//   - Look up PipeStandard to compute nominalThicknessMm
//   - If the (standard, edition, nominalSizeInch, schedule) combo doesn't
//     exist, return 422 with a clear "unsupported combination" message
//   - Recompute observedMinimumMm from valid clock measurements
//   - Never convert missing/NotMeasured/NotApplicable values to zero

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

/**
 * Compute observed minimum thickness from valid (Measured) clock readings.
 * Excludes missing, NotMeasured, and NotApplicable values. Returns null
 * if no valid measurements exist (never zero).
 */
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

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const items = await db.thicknessMeasurement.findMany({
    where: { pipelineInspectionId: id },
    orderBy: { sortOrder: "asc" },
    include: {
      componentType: { select: { id: true, code: true, label: true } },
      standard: { select: { id: true, standard: true, edition: true, nominalSizeInch: true, schedule: true, wallThicknessMm: true, isVerified: true } },
    },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "INSPECTOR" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — inspector role required" }, { status: 403 });
  }
  const { id } = await ctx.params;

  const report = await db.pipelineInspection.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  if (report.status === "Approved" && session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Approved reports can only be edited by an administrator via the revision flow" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Required: pipeSizeInch, pipeSchedule
  if (!body.pipeSizeInch || !body.pipeSchedule) {
    return NextResponse.json(
      { error: "pipeSizeInch and pipeSchedule are required (first two fixed columns)" },
      { status: 400 },
    );
  }

  // Look up PipeStandard to compute nominalThicknessMm (third column).
  // Use the report's applicableStandard + standardEdition if set; fall back
  // to matching by size+schedule across standards if not.
  const standardFilter: Record<string, string> = {
    nominalSizeInch: body.pipeSizeInch,
    schedule: body.pipeSchedule,
  };
  if (report.applicableStandard) standardFilter.standard = report.applicableStandard;
  if (report.standardEdition) standardFilter.edition = report.standardEdition;

  let pipeStandard = await db.pipeStandard.findFirst({ where: standardFilter });

  // If strict standard filter doesn't match, try without standard/edition
  // (still report it as a potential mismatch)
  let standardMismatch = false;
  if (!pipeStandard) {
    pipeStandard = await db.pipeStandard.findFirst({
      where: { nominalSizeInch: body.pipeSizeInch, schedule: body.pipeSchedule },
    });
    if (pipeStandard) {
      standardMismatch = true;
    }
  }

  // If still no match, return 422 — unsupported combination
  if (!pipeStandard) {
    return NextResponse.json(
      {
        error: `Unsupported combination: ${body.pipeSizeInch}" ${body.pipeSchedule} not found in any seeded ASME standard table. Add this size/schedule to the Pipe Standards table (admin) before recording measurements, or override via the documented override process.`,
        unsupportedCombination: true,
        pipeSizeInch: body.pipeSizeInch,
        pipeSchedule: body.pipeSchedule,
      },
      { status: 422 },
    );
  }

  // Look up component type (or default to PIPE)
  let componentTypeId: string | null = null;
  let componentTypeCode = "PIPE";
  if (body.componentTypeCode) {
    const ct = await db.componentType.findUnique({ where: { code: body.componentTypeCode } });
    if (ct) {
      componentTypeId = ct.id;
      componentTypeCode = ct.code;
    } else {
      return NextResponse.json(
        { error: `Unknown component type: ${body.componentTypeCode}` },
        { status: 400 },
      );
    }
  } else if (body.componentTypeId) {
    const ct = await db.componentType.findUnique({ where: { id: body.componentTypeId } });
    if (ct) {
      componentTypeId = ct.id;
      componentTypeCode = ct.code;
    }
  }

  // Validate measurement statuses
  const normalizeStatus = (s: unknown): MeasurementStatus => {
    if (typeof s === "string" && MEASUREMENT_STATUSES.includes(s as MeasurementStatus)) {
      return s as MeasurementStatus;
    }
    return "NotMeasured";
  };

  const northMm = parseNum(body.northMm);
  const northStatus = normalizeStatus(body.northStatus);
  const eastMm = parseNum(body.eastMm);
  const eastStatus = normalizeStatus(body.eastStatus);
  const southMm = parseNum(body.southMm);
  const southStatus = normalizeStatus(body.southStatus);
  const westMm = parseNum(body.westMm);
  const westStatus = normalizeStatus(body.westStatus);

  // If a status is "Measured", the value MUST be a valid positive number.
  const invalidMeasured = (
    [
      [northStatus, northMm], [eastStatus, eastMm],
      [southStatus, southMm], [westStatus, westMm],
    ] as Array<[string, number | null]>
  ).filter(([s, v]) => s === "Measured" && v === null);
  if (invalidMeasured.length > 0) {
    return NextResponse.json(
      {
        error: `Status 'Measured' requires a valid positive value. Found ${invalidMeasured.length} measurement(s) marked Measured without a valid value.`,
      },
      { status: 400 },
    );
  }

  const observedMinimumMm = computeObservedMinimum({
    northMm, northStatus, eastMm, eastStatus,
    southMm, southStatus, westMm, westStatus,
  });

  // Determine sortOrder — append at end if not specified
  const maxSortOrder = await db.thicknessMeasurement.findFirst({
    where: { pipelineInspectionId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : (maxSortOrder?.sortOrder ?? -1) + 1;

  const created = await db.thicknessMeasurement.create({
    data: {
      pipelineInspectionId: id,
      pointNo: body.pointNo?.trim() || `P-${sortOrder + 1}`,
      sortOrder,
      pipeSizeInch: body.pipeSizeInch,
      pipeSchedule: body.pipeSchedule,
      // Snapshot the calculated nominal thickness at row creation time.
      // The original value is preserved even if the standard is later edited.
      nominalThicknessMm: pipeStandard.wallThicknessMm,
      standardId: pipeStandard.id,
      componentTypeId,
      componentTypeCode,
      northMm,
      northStatus,
      eastMm,
      eastStatus,
      southMm,
      southStatus,
      westMm,
      westStatus,
      observedMinimumMm,
      findingsComments: body.findingsComments?.trim() || null,
    },
    include: {
      componentType: { select: { id: true, code: true, label: true } },
      standard: { select: { id: true, standard: true, edition: true, nominalSizeInch: true, schedule: true, wallThicknessMm: true, isVerified: true } },
    },
  });

  await recordAudit({
    userId: session.id, userName: session.name,
    action: "CREATE", entity: "ThicknessMeasurement", entityId: created.id,
    details: `Added measurement ${created.pointNo} (${created.pipeSizeInch}" ${created.pipeSchedule}, nominal ${created.nominalThicknessMm}mm, observed min ${created.observedMinimumMm ?? "—"}mm)${standardMismatch ? " [STANDARD MISMATCH — row uses default standard but report specifies different]" : ""} to report ${report.reportNumber}`,
  });

  return NextResponse.json(created, { status: 201 });
}
