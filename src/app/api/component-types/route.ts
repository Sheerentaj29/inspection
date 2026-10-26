// GET  /api/component-types - list all component types
// POST /api/component-types - create (admin only)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await db.componentType.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
  });
  return NextResponse.json({ items });
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
  if (!body?.code || !body?.label) {
    return NextResponse.json({ error: "code and label are required" }, { status: 400 });
  }
  const dupe = await db.componentType.findUnique({ where: { code: body.code } });
  if (dupe) return NextResponse.json({ error: "code already exists" }, { status: 409 });

  const created = await db.componentType.create({
    data: {
      code: String(body.code).toUpperCase(),
      label: body.label,
      sortOrder: Number(body.sortOrder ?? 0),
      active: body.active !== false,
    },
  });
  await recordAudit({
    userId: session.id, userName: session.name,
    action: "CREATE", entity: "ComponentType", entityId: created.id,
    details: `Created component type ${created.code} (${created.label})`,
  });
  return NextResponse.json(created, { status: 201 });
}
