// POST /api/import-export/commit - commit a CSV file's preview rows to the database.
// Body: { rows: PreviewRow[] }  - the validated rows from /preview.
// Skips rows with errors.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const DIM_FIELDS = [
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
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — administrator role required" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.rows || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Missing rows array" }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;
  const failures: { row: number; error: string }[] = [];

  for (const r of body.rows) {
    if (r.errors && r.errors.length > 0) {
      skipped++;
      continue;
    }
    const data = r.data;
    if (!data || !r.clientMatch || !r.plantMatch) {
      skipped++;
      continue;
    }

    // Duplicate equipmentId within client scope check
    const dupe = await db.equipment.findUnique({
      where: {
        clientId_equipmentId: { clientId: r.clientMatch.id, equipmentId: data.equipmentId },
      },
    });
    if (dupe) {
      failures.push({
        row: r.rowNumber,
        error: `Equipment ID '${data.equipmentId}' already exists for this client`,
      });
      skipped++;
      continue;
    }

    // Build dimensions
    const dimData: Record<string, number | null> = {};
    for (const f of DIM_FIELDS) {
      const v = data[f];
      if (!v || v.length === 0) dimData[f] = null;
      else {
        const n = Number(v);
        if (Number.isNaN(n)) dimData[f] = null;
        else dimData[f] = n;
      }
    }

    try {
      await db.equipment.create({
        data: {
          equipmentId: data.equipmentId.trim(),
          name: data.name.trim(),
          category: data.category,
          type: data.type,
          orientation: data.orientation || null,
          ...dimData,
          material: data.material?.trim() || null,
          manufacturer: data.manufacturer?.trim() || null,
          serialNumber: data.serialNumber?.trim() || null,
          clientId: r.clientMatch.id,
          plantId: r.plantMatch.id,
          tagNumber: data.tagNumber?.trim() || null,
          dimensionSource: data.dimensionSource || null,
          verificationStatus: data.verificationStatus || "Unverified",
          isDemo: false,
          createdById: session.id,
        },
      });
      created++;
    } catch (e) {
      failures.push({
        row: r.rowNumber,
        error: e instanceof Error ? e.message : String(e),
      });
      skipped++;
    }
  }

  await recordAudit({
    userId: session.id,
    userName: session.name,
    action: "IMPORT",
    entity: "Equipment",
    details: `Imported ${created} equipment records (${skipped} skipped, ${failures.length} failed)`,
  });

  return NextResponse.json({ created, skipped, failures });
}
