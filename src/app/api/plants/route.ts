// GET  /api/plants - list plants (optionally filtered by clientId)
// POST /api/plants - create a plant (admin only)
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
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const plants = await db.plant.findMany({
    where: clientId ? { clientId } : undefined,
    orderBy: { name: "asc" },
    include: {
      client: { select: { id: true, name: true } },
      _count: { select: { equipment: true } },
    },
  });
  return NextResponse.json({ items: plants });
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
  if (!body?.name || !body.clientId) {
    return NextResponse.json({ error: "Plant name and clientId required" }, { status: 400 });
  }
  const client = await db.client.findUnique({ where: { id: body.clientId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 400 });

  const plant = await db.plant.create({
    data: {
      name: body.name.trim(),
      clientId: body.clientId,
      location: body.location?.trim() || null,
      address: body.address?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "CREATE",
    entity: "Plant",
    entityId: plant.id,
    details: `Created plant ${plant.name} under ${client.name}`,
  });
  return NextResponse.json(plant, { status: 201 });
}
