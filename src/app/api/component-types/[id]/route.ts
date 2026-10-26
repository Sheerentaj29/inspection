// PUT  /api/component-types/[id] - update (admin only)
// DELETE /api/component-types/[id] - delete (admin only)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — administrator role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await db.componentType.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If code changes, check for duplicates
  const newCode = body.code ?? existing.code;
  if (newCode !== existing.code) {
    const dupe = await db.componentType.findUnique({ where: { code: newCode } });
    if (dupe && dupe.id !== id) {
      return NextResponse.json({ error: "code already exists" }, { status: 409 });
    }
  }

  const updated = await db.componentType.update({
    where: { id },
    data: {
      code: String(newCode).toUpperCase(),
      label: body.label ?? existing.label,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
      active: body.active !== undefined ? Boolean(body.active) : existing.active,
    },
  });
  await recordAudit({
    userId: session.id, userName: session.name,
    action: "UPDATE", entity: "ComponentType", entityId: updated.id,
    details: `Updated component type ${updated.code} (${updated.label})`,
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
  const existing = await db.componentType.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.componentType.delete({ where: { id } });
  await recordAudit({
    userId: session.id, userName: session.name,
    action: "DELETE", entity: "ComponentType", entityId: id,
    details: `Deleted component type ${existing.code} (${existing.label})`,
  });
  return NextResponse.json({ ok: true });
}
