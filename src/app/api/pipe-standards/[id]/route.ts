// PUT  /api/pipe-standards/[id] - update (admin only)
// DELETE /api/pipe-standards/[id] - delete (admin only)
// POST /api/pipe-standards/[id]/verify - mark verified (admin only)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — administrator role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await db.pipeStandard.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If key fields change, check for duplicates
  const newStandard = body.standard ?? existing.standard;
  const newEdition = body.edition ?? existing.edition;
  const newSize = body.nominalSizeInch ?? existing.nominalSizeInch;
  const newSchedule = body.schedule ?? existing.schedule;
  if (newStandard !== existing.standard || newEdition !== existing.edition ||
      newSize !== existing.nominalSizeInch || newSchedule !== existing.schedule) {
    const dupe = await db.pipeStandard.findUnique({
      where: {
        standard_edition_nominalSizeInch_schedule: {
          standard: newStandard, edition: newEdition,
          nominalSizeInch: newSize, schedule: newSchedule,
        },
      },
    });
    if (dupe && dupe.id !== id) {
      return NextResponse.json({ error: "Combination already exists" }, { status: 409 });
    }
  }

  const updated = await db.pipeStandard.update({
    where: { id },
    data: {
      standard: newStandard,
      edition: newEdition,
      nominalSizeInch: newSize,
      nominalSizeMm: body.nominalSizeMm ?? existing.nominalSizeMm,
      dn: body.dn ?? existing.dn,
      schedule: newSchedule,
      wallThicknessMm: body.wallThicknessMm ?? existing.wallThicknessMm,
      oD_mm: body.oD_mm ?? existing.oD_mm,
      notes: body.notes ?? existing.notes,
      // Any edit resets isVerified to false until re-confirmed
      isVerified: false,
      verifiedById: null,
      verifiedAt: null,
    },
  });

  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "UPDATE",
    entity: "PipeStandard",
    entityId: updated.id,
    details: `Edited ${updated.standard} ${updated.nominalSizeInch}" ${updated.schedule} = ${updated.wallThicknessMm}mm (reset to UNVERIFIED)`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — administrator role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const existing = await db.pipeStandard.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.pipeStandard.delete({ where: { id } });
  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "DELETE",
    entity: "PipeStandard",
    entityId: id,
    details: `Deleted ${existing.standard} ${existing.nominalSizeInch}" ${existing.schedule}`,
  });
  return NextResponse.json({ ok: true });
}

// Verify endpoint — admin marks a row as verified against licensed standard
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — administrator role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const existing = await db.pipeStandard.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updated = await db.pipeStandard.update({
    where: { id },
    data: {
      isVerified: true,
      verifiedById: session.id,
      verifiedAt: new Date(),
      notes: body.confirmationNote
        ? `${existing.notes ?? ""}\n[Verified: ${body.confirmationNote}]`.trim()
        : existing.notes,
    },
  });

  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "UPDATE",
    entity: "PipeStandard",
    entityId: updated.id,
    details: `Verified ${updated.standard} ${updated.nominalSizeInch}" ${updated.schedule} = ${updated.wallThicknessMm}mm against licensed standard`,
  });

  return NextResponse.json(updated);
}
