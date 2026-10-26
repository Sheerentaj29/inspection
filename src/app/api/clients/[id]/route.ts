// PUT  /api/clients/[id] - update client (admin only)
// DELETE /api/clients/[id] - delete client (admin only) - cascades plants/equipment/inspections
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

  const existing = await db.client.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.name && body.name.trim() !== existing.name) {
    const dupe = await db.client.findUnique({ where: { name: body.name.trim() } });
    if (dupe) {
      return NextResponse.json({ error: "Client name must be unique" }, { status: 409 });
    }
  }

  const updated = await db.client.update({
    where: { id },
    data: {
      name: body.name?.trim() ?? existing.name,
      industry: body.industry ?? existing.industry,
      contactName: body.contactName ?? existing.contactName,
      contactEmail: body.contactEmail ?? existing.contactEmail,
      contactPhone: body.contactPhone ?? existing.contactPhone,
      address: body.address ?? existing.address,
      notes: body.notes ?? existing.notes,
    },
  });
  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "UPDATE",
    entity: "Client",
    entityId: updated.id,
    details: `Updated client ${updated.name}`,
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
  const client = await db.client.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.client.delete({ where: { id } });
  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "DELETE",
    entity: "Client",
    entityId: id,
    details: `Deleted client ${client.name}`,
  });
  return NextResponse.json({ ok: true });
}
