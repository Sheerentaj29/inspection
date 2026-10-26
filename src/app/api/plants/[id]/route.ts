// PUT /api/plants/[id] - update plant
// DELETE /api/plants/[id] - delete plant
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

  const existing = await db.plant.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.plant.update({
    where: { id },
    data: {
      name: body.name?.trim() ?? existing.name,
      location: body.location ?? existing.location,
      address: body.address ?? existing.address,
      notes: body.notes ?? existing.notes,
    },
  });
  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "UPDATE",
    entity: "Plant",
    entityId: updated.id,
    details: `Updated plant ${updated.name}`,
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
  const plant = await db.plant.findUnique({ where: { id } });
  if (!plant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.plant.delete({ where: { id } });
  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "DELETE",
    entity: "Plant",
    entityId: id,
    details: `Deleted plant ${plant.name}`,
  });
  return NextResponse.json({ ok: true });
}
