// GET /api/import-export/export - export equipment as CSV
// Query: clientId (optional), format=csv (only csv supported for now)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { DIMENSION_FIELD_META, type DimensionField } from "@/lib/domain/equipment-catalog";

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const DIM_ORDER: DimensionField[] = [
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
];

const HEADERS = [
  "equipmentId",
  "name",
  "category",
  "type",
  "orientation",
  ...DIM_ORDER,
  "material",
  "manufacturer",
  "serialNumber",
  "clientName",
  "plantName",
  "tagNumber",
  "dimensionSource",
  "verificationStatus",
];

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? undefined;

  const items = await db.equipment.findMany({
    where: clientId ? { clientId } : undefined,
    include: {
      client: { select: { name: true } },
      plant: { select: { name: true } },
    },
    orderBy: { equipmentId: "asc" },
    take: 2000,
  });

  const rows = items.map((e) =>
    [
      e.equipmentId,
      e.name,
      e.category,
      e.type,
      e.orientation ?? "",
      ...DIM_ORDER.map((f) => (e[f] as number | null) ?? ""),
      e.material ?? "",
      e.manufacturer ?? "",
      e.serialNumber ?? "",
      e.client.name,
      e.plant.name,
      e.tagNumber ?? "",
      e.dimensionSource ?? "",
      e.verificationStatus,
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [HEADERS.join(","), ...rows].join("\n");
  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "EXPORT",
    entity: "Equipment",
    details: `Exported ${items.length} equipment records as CSV${clientId ? " (single client)" : ""}`,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="equipment-master-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

// (DIMENSION_FIELD_META import kept for potential use in validation; ensures type alignment.)
export const _dimMeta = DIMENSION_FIELD_META;
