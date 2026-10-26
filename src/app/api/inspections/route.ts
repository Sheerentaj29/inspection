// GET /api/inspections - list inspections across all equipment
// Optional filters: equipmentId, inspectorId, fromDate, toDate, type
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const equipmentId = url.searchParams.get("equipmentId") ?? undefined;
  const inspectorId = url.searchParams.get("inspectorId") ?? undefined;
  const inspectionType = url.searchParams.get("type") ?? undefined;
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");

  const where: Record<string, unknown> = {};
  if (equipmentId) where.equipmentId = equipmentId;
  if (inspectorId) where.inspectorId = inspectorId;
  if (inspectionType) where.inspectionType = inspectionType;
  if (fromDate || toDate) {
    where.inspectionDate = {} as Record<string, Date>;
    if (fromDate) (where.inspectionDate as Record<string, Date>).gte = new Date(fromDate);
    if (toDate) (where.inspectionDate as Record<string, Date>).lte = new Date(toDate);
  }

  const items = await db.inspection.findMany({
    where,
    orderBy: { inspectionDate: "desc" },
    include: {
      equipment: {
        select: {
          id: true,
          equipmentId: true,
          name: true,
          tagNumber: true,
          type: true,
          client: { select: { id: true, name: true } },
          plant: { select: { id: true, name: true, location: true } },
        },
      },
      inspector: { select: { id: true, name: true, email: true } },
    },
    take: 200,
  });
  return NextResponse.json({ items });
}
