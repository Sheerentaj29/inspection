// GET    /api/equipment/[id] - get one equipment with related data
// PUT    /api/equipment/[id] - update (admin only)
// DELETE /api/equipment/[id] - delete (admin only)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { findCategoryByType } from "@/lib/domain/equipment-catalog";

const DIMENSION_FIELDS = [
  "diameter",
  "height",
  "length",
  "width",
  "capacity",
  "wallThickness",
  "nominalDiameter",
  "outsideDiameter",
  "tubeLength",
  "shellDiameter",
] as const;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const equipment = await db.equipment.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      plant: { select: { id: true, name: true, location: true, address: true } },
      createdBy: { select: { id: true, name: true } },
      inspections: {
        orderBy: { inspectionDate: "desc" },
        include: { inspector: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!equipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(equipment);
}

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

  const existing = await db.equipment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Validate category/type if either changed
  if (body.type || body.category) {
    const finalType = body.type ?? existing.type;
    const finalCategory = body.category ?? existing.category;
    const cat = findCategoryByType(finalType);
    if (!cat || cat.key !== finalCategory) {
      return NextResponse.json(
        { error: `Equipment type '${finalType}' does not belong to category '${finalCategory}'` },
        { status: 400 },
      );
    }
  }

  // If clientId/equipmentId changing, ensure new combo is unique
  const newClientId = body.clientId ?? existing.clientId;
  const newEquipmentId = (body.equipmentId ?? existing.equipmentId).trim();
  if (newClientId !== existing.clientId || newEquipmentId !== existing.equipmentId) {
    const dupe = await db.equipment.findUnique({
      where: { clientId_equipmentId: { clientId: newClientId, equipmentId: newEquipmentId } },
    });
    if (dupe && dupe.id !== id) {
      return NextResponse.json(
        { error: `Equipment ID '${newEquipmentId}' already exists for this client` },
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

  // Build dimension updates
  const dimData: Record<string, number | null> = {};
  for (const f of DIMENSION_FIELDS) {
    if (body[f] !== undefined) {
      const v = body[f];
      if (v === null || v === "") {
        dimData[f] = null;
      } else {
        const n = typeof v === "string" ? parseFloat(v) : v;
        if (Number.isNaN(n) || n < 0) {
          return NextResponse.json(
            { error: `Field '${f}' must be a positive number` },
            { status: 400 },
          );
        }
        dimData[f] = n;
      }
    }
  }

  const updated = await db.equipment.update({
    where: { id },
    data: {
      equipmentId: newEquipmentId,
      name: body.name?.trim() ?? existing.name,
      category: body.category ?? existing.category,
      type: body.type ?? existing.type,
      orientation: body.orientation ?? existing.orientation,
      ...dimData,
      material: body.material?.trim() ?? existing.material,
      manufacturer: body.manufacturer?.trim() ?? existing.manufacturer,
      serialNumber: body.serialNumber?.trim() ?? existing.serialNumber,
      clientId: newClientId,
      plantId: body.plantId ?? existing.plantId,
      tagNumber: body.tagNumber?.trim() ?? existing.tagNumber,
      dimensionSource: body.dimensionSource ?? existing.dimensionSource,
      verificationStatus: body.verificationStatus ?? existing.verificationStatus,
      notes: body.notes ?? existing.notes,
    },
  });

  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "UPDATE",
    entity: "Equipment",
    entityId: updated.id,
    details: `Updated equipment ${updated.equipmentId}`,
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
  const eq = await db.equipment.findUnique({ where: { id } });
  if (!eq) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.equipment.delete({ where: { id } });
  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "DELETE",
    entity: "Equipment",
    entityId: id,
    details: `Deleted equipment ${eq.equipmentId} (${eq.name})`,
  });
  return NextResponse.json({ ok: true });
}
