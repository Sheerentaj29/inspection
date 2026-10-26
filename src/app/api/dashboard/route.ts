// GET /api/dashboard - aggregate stats for the dashboard
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [
    totalEquipment,
    totalClients,
    totalPlants,
    totalInspections,
    verifiedCount,
    unverifiedCount,
    demoCount,
    byCategoryAgg,
  ] = await Promise.all([
    db.equipment.count(),
    db.client.count(),
    db.plant.count(),
    db.inspection.count(),
    db.equipment.count({ where: { verificationStatus: "Verified" } }),
    db.equipment.count({ where: { verificationStatus: "Unverified" } }),
    db.equipment.count({ where: { isDemo: true } }),
    db.equipment.groupBy({
      by: ["category"],
      _count: { _all: true },
      orderBy: { category: "asc" },
    }),
  ]);

  // Inspections per category (join through equipment)
  const inspectionsByCategoryAgg = await db.inspection.findMany({
    select: {
      equipment: { select: { category: true } },
    },
    take: 500,
  });
  const inspectionsByCategory: Record<string, number> = {};
  for (const i of inspectionsByCategoryAgg) {
    const k = i.equipment.category;
    inspectionsByCategory[k] = (inspectionsByCategory[k] ?? 0) + 1;
  }

  const byCategory = byCategoryAgg.map((c) => ({
    category: c.category,
    count: c._all,
  }));

  return NextResponse.json({
    totalEquipment,
    totalClients,
    totalPlants,
    totalInspections,
    verifiedCount,
    unverifiedCount,
    demoCount,
    byCategory,
    inspectionsByCategory,
  });
}
