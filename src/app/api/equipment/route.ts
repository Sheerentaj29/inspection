// GET  /api/equipment            - list with search/filter/pagination/sort
// POST /api/equipment            - create (admin only)
//
// Query params:
//   q          - search across name, equipmentId, tagNumber, type
//   clientId   - filter by client
//   plantId    - filter by plant
//   category   - filter by category
//   type       - filter by type
//   verified   - "Verified" | "Unverified" | undefined
//   demo       - "true" | "false" | undefined (filter demo records)
//   page       - 1-based page number (default 1)
//   pageSize   - items per page (default 10)
//   sort       - field name (e.g. name, equipmentId, createdAt)
//   order      - "asc" | "desc"

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { findCategoryByType } from "@/lib/domain/equipment-catalog";

const SORT_FIELDS = new Set([
  "equipmentId",
  "name",
  "category",
  "type",
  "orientation",
  "tagNumber",
  "material",
  "verificationStatus",
  "createdAt",
  "updatedAt",
]);

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const plantId = url.searchParams.get("plantId") ?? undefined;
  const category = url.searchParams.get("category") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const verified = url.searchParams.get("verified") ?? undefined;
  const demoParam = url.searchParams.get("demo");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "10", 10) || 10),
  );
  const sortRaw = url.searchParams.get("sort") ?? "createdAt";
  const sort = SORT_FIELDS.has(sortRaw) ? sortRaw : "createdAt";
  const order = (url.searchParams.get("order") as "asc" | "desc") || "desc";

  // Build where clause
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { equipmentId: { contains: q } },
      { tagNumber: { contains: q } },
      { type: { contains: q } },
      { manufacturer: { contains: q } },
      { serialNumber: { contains: q } },
    ];
  }
  if (clientId) where.clientId = clientId;
  if (plantId) where.plantId = plantId;
  if (category) where.category = category;
  if (type) where.type = type;
  if (verified === "Verified" || verified === "Unverified") where.verificationStatus = verified;
  if (demoParam === "true") where.isDemo = true;
  if (demoParam === "false") where.isDemo = false;

  const [items, total] = await Promise.all([
    db.equipment.findMany({
      where,
      orderBy: { [sort]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { select: { id: true, name: true } },
        plant: { select: { id: true, name: true, location: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { inspections: true } },
      },
    }),
    db.equipment.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// ---------- POST ----------
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

  // Basic validation
  const required = ["equipmentId", "name", "category", "type", "clientId", "plantId"];
  for (const k of required) {
    if (!body[k] || typeof body[k] !== "string" || !body[k].trim()) {
      return NextResponse.json({ error: `Field '${k}' is required` }, { status: 400 });
    }
  }

  // Verify category / type consistency
  const catByType = findCategoryByType(body.type);
  if (!catByType) {
    return NextResponse.json({ error: `Unknown equipment type: ${body.type}` }, { status: 400 });
  }
  if (catByType.key !== body.category) {
    return NextResponse.json(
      { error: `Equipment type '${body.type}' does not belong to category '${body.category}'` },
      { status: 400 },
    );
  }

  // Verify plant belongs to client
  const plant = await db.plant.findUnique({
    where: { id: body.plantId },
    include: { client: true },
  });
  if (!plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 400 });
  }
  if (plant.clientId !== body.clientId) {
    return NextResponse.json(
      { error: "Plant does not belong to the selected client" },
      { status: 400 },
    );
  }

  // Duplicate equipmentId within client scope
  const existing = await db.equipment.findUnique({
    where: { clientId_equipmentId: { clientId: body.clientId, equipmentId: body.equipmentId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `Equipment ID '${body.equipmentId}' already exists for this client` },
      { status: 409 },
    );
  }

  // Build dimension data — only set if a valid number is provided.
  const dimData: Record<string, number | null> = {};
  for (const f of DIMENSION_FIELDS) {
    const v = body[f];
    if (v === null || v === undefined || v === "") {
      dimData[f] = null;
    } else {
      const n = typeof v === "string" ? parseFloat(v) : v;
      if (Number.isNaN(n) || n < 0) {
        return NextResponse.json({ error: `Field '${f}' must be a positive number` }, { status: 400 });
      }
      dimData[f] = n;
    }
  }

  // Validate orientation against category definition
  if (body.orientation && !catByType.orientations.includes(body.orientation)) {
    return NextResponse.json(
      { error: `Orientation '${body.orientation}' not allowed for category ${catByType.label}` },
      { status: 400 },
    );
  }

  const equipment = await db.equipment.create({
    data: {
      equipmentId: body.equipmentId.trim(),
      name: body.name.trim(),
      category: body.category,
      type: body.type,
      orientation: body.orientation ?? null,
      ...dimData,
      material: body.material?.trim() || null,
      manufacturer: body.manufacturer?.trim() || null,
      serialNumber: body.serialNumber?.trim() || null,
      clientId: body.clientId,
      plantId: body.plantId,
      tagNumber: body.tagNumber?.trim() || null,
      dimensionSource: body.dimensionSource ?? null,
      verificationStatus: body.verificationStatus ?? "Unverified",
      notes: body.notes?.trim() || null,
      isDemo: false,
      createdById: session.id,
    },
    include: {
      client: { select: { id: true, name: true } },
      plant: { select: { id: true, name: true, location: true } },
    },
  });

  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "CREATE",
    entity: "Equipment",
    entityId: equipment.id,
    details: `Created equipment ${equipment.equipmentId} (${equipment.name})`,
  });

  return NextResponse.json(equipment, { status: 201 });
}
