// GET  /api/pipe-standards - list pipe standard reference rows
//   Query params:
//     standard   - "ASME B36.10M" | "ASME B36.19M" (optional filter)
//     edition    - e.g. "2018"
//     nominalSizeInch - e.g. "2"
//     schedule   - e.g. "SCH 40"
//     search     - free-text search across size/schedule/DN
// POST /api/pipe-standards - create new row (admin only)

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
  const standard = url.searchParams.get("standard") ?? undefined;
  const edition = url.searchParams.get("edition") ?? undefined;
  const nominalSizeInch = url.searchParams.get("nominalSizeInch") ?? undefined;
  const schedule = url.searchParams.get("schedule") ?? undefined;
  const search = url.searchParams.get("search") ?? "";

  const where: Record<string, unknown> = {};
  if (standard) where.standard = standard;
  if (edition) where.edition = edition;
  if (nominalSizeInch) where.nominalSizeInch = nominalSizeInch;
  if (schedule) where.schedule = schedule;
  if (search) {
    where.OR = [
      { nominalSizeInch: { contains: search } },
      { schedule: { contains: search } },
      { dn: { contains: search } },
    ];
  }

  const items = await db.pipeStandard.findMany({
    where,
    orderBy: [{ standard: "asc" }, { nominalSizeInch: "asc" }, { schedule: "asc" }],
    take: 500,
    include: { verifiedBy: { select: { id: true, name: true } } },
  });

  // Distinct sizes + schedules for dropdown population on the client.
  const sizes = Array.from(
    new Set(items.map((i) => i.nominalSizeInch)),
  ).sort((a, b) => {
    // natural sort by numeric+fraction parts
    const na = a.split(/[\s/]+/).map((x) => parseFloat(x));
    const nb = b.split(/[\s/]+/).map((x) => parseFloat(x));
    for (let i = 0; i < Math.max(na.length, nb.length); i++) {
      const va = na[i] ?? 0;
      const vb = nb[i] ?? 0;
      if (va !== vb) return va - vb;
    }
    return 0;
  });
  const schedules = Array.from(new Set(items.map((i) => i.schedule))).sort();
  const standards = Array.from(new Set(items.map((i) => i.standard))).sort();
  const editions = Array.from(new Set(items.map((i) => i.edition))).sort();

  return NextResponse.json({
    items,
    sizes,
    schedules,
    standards,
    editions,
    total: items.length,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — administrator role required" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const required = ["standard", "edition", "nominalSizeInch", "schedule", "wallThicknessMm", "nominalSizeMm"];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      return NextResponse.json({ error: `Field '${k}' is required` }, { status: 400 });
    }
  }
  if (typeof body.wallThicknessMm !== "number" || body.wallThicknessMm <= 0) {
    return NextResponse.json({ error: "wallThicknessMm must be a positive number" }, { status: 400 });
  }

  // Duplicate check
  const existing = await db.pipeStandard.findUnique({
    where: {
      standard_edition_nominalSizeInch_schedule: {
        standard: body.standard, edition: body.edition,
        nominalSizeInch: body.nominalSizeInch, schedule: body.schedule,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Combination already exists: ${body.standard} ${body.nominalSizeInch} ${body.schedule}` },
      { status: 409 },
    );
  }

  const created = await db.pipeStandard.create({
    data: {
      standard: body.standard,
      edition: body.edition,
      nominalSizeInch: body.nominalSizeInch,
      nominalSizeMm: body.nominalSizeMm,
      dn: body.dn ?? `DN${Math.round(body.nominalSizeMm)}`,
      schedule: body.schedule,
      wallThicknessMm: body.wallThicknessMm,
      oD_mm: body.oD_mm ?? null,
      isVerified: false, // never auto-verify new rows
      notes: body.notes ?? null,
    },
  });

  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "CREATE",
    entity: "PipeStandard",
    entityId: created.id,
    details: `Added ${created.standard} ${created.nominalSizeInch}" ${created.schedule} = ${created.wallThicknessMm}mm (UNVERIFIED)`,
  });

  return NextResponse.json(created, { status: 201 });
}
