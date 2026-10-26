// GET  /api/clients - list all clients (with plants + equipment counts)
// POST /api/clients - create a new client (admin only)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clients = await db.client.findMany({
    orderBy: { name: "asc" },
    include: {
      plants: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, location: true, address: true, isDemo: true },
      },
      _count: { select: { equipment: true } },
    },
  });
  return NextResponse.json({ items: clients });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — administrator role required" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }
  const existing = await db.client.findUnique({ where: { name: body.name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Client name must be unique" }, { status: 409 });
  }
  const client = await db.client.create({
    data: {
      name: body.name.trim(),
      industry: body.industry?.trim() || null,
      contactName: body.contactName?.trim() || null,
      contactEmail: body.contactEmail?.trim() || null,
      contactPhone: body.contactPhone?.trim() || null,
      address: body.address?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });
  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "CREATE",
    entity: "Client",
    entityId: client.id,
    details: `Created client ${client.name}`,
  });
  return NextResponse.json(client, { status: 201 });
}
