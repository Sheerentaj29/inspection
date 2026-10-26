// POST /api/import-export/preview - parse uploaded CSV, validate, return preview rows
// and a list of problems per row. Does NOT persist to DB.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { findCategoryByType, EQUIPMENT_CATEGORIES, DIMENSION_SOURCES } from "@/lib/domain/equipment-catalog";

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

const HEADERS = [
  "equipmentId",
  "name",
  "category",
  "type",
  "orientation",
  ...DIM_FIELDS,
  "material",
  "manufacturer",
  "serialNumber",
  "clientName",
  "plantName",
  "tagNumber",
  "dimensionSource",
  "verificationStatus",
];

interface PreviewRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
  clientMatch?: { id: string; name: string };
  plantMatch?: { id: string; name: string };
}

function splitCSVLine(line: string): string[] {
  // Simple RFC4180-aware parser supporting quoted fields with embedded commas/newlines.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — administrator role required" }, { status: 403 });
  }
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  const text = await file.text();

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });

  const header = splitCSVLine(lines[0]).map((h) => h.trim());
  const headerIdx: Record<string, number> = {};
  header.forEach((h, i) => {
    if (HEADERS.includes(h)) headerIdx[h] = i;
  });
  // Tolerant: missing fields are allowed; they will be flagged per-row.

  // Pre-fetch all clients and plants for matching
  const clients = await db.client.findMany({
    include: { plants: { select: { id: true, name: true } } },
  });

  const preview: PreviewRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitCSVLine(lines[r]);
    const row: Record<string, string> = {};
    for (const [k, i] of Object.entries(headerIdx)) {
      row[k] = (cells[i] ?? "").trim();
    }
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.equipmentId) errors.push("Missing equipmentId");
    if (!row.name) errors.push("Missing name");
    if (!row.category) errors.push("Missing category");
    if (!row.type) errors.push("Missing type");

    // Validate category / type pairing
    const cat = EQUIPMENT_CATEGORIES.find((c) => c.key === row.category);
    if (!cat && row.category) errors.push(`Unknown category: '${row.category}'`);
    const catByType = row.type ? findCategoryByType(row.type) : undefined;
    if (!catByType && row.type) {
      errors.push(`Unknown equipment type: '${row.type}'`);
    } else if (cat && catByType && cat.key !== catByType.key) {
      errors.push(`Type '${row.type}' should belong to category '${catByType.key}' (got '${row.category}')`);
    }

    // Validate dimensions are numbers (if present)
    for (const f of DIM_FIELDS) {
      const v = row[f];
      if (v && v.length > 0) {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0) {
          errors.push(`Invalid numeric value for '${f}': '${v}'`);
        }
      }
    }

    // Orientation
    const validOrientations = cat?.orientations ?? [];
    if (row.orientation && !validOrientations.includes(row.orientation as never)) {
      warnings.push(`Orientation '${row.orientation}' not in allowed list for category '${row.category}'`);
    }

    // Dimension source
    if (row.dimensionSource && !DIMENSION_SOURCES.includes(row.dimensionSource as never)) {
      warnings.push(`Dimension source '${row.dimensionSource}' is not a standard value`);
    }

    // Verification status
    if (row.verificationStatus && !["Verified", "Unverified"].includes(row.verificationStatus)) {
      warnings.push(`Verification status should be 'Verified' or 'Unverified' (got '${row.verificationStatus}')`);
    }

    // Match client + plant by name
    let clientMatch: PreviewRow["clientMatch"];
    let plantMatch: PreviewRow["plantMatch"];
    if (row.clientName) {
      const cl = clients.find((c) => c.name.toLowerCase() === row.clientName.toLowerCase());
      if (!cl) {
        errors.push(`Unknown client '${row.clientName}'`);
      } else {
        clientMatch = { id: cl.id, name: cl.name };
        if (row.plantName) {
          const pl = cl.plants.find((p) => p.name.toLowerCase() === row.plantName.toLowerCase());
          if (!pl) {
            errors.push(`Unknown plant '${row.plantName}' for client '${row.clientName}'`);
          } else {
            plantMatch = { id: pl.id, name: pl.name };
          }
        } else {
          errors.push("Missing plantName");
        }
      }
    } else {
      errors.push("Missing clientName");
    }

    preview.push({
      rowNumber: r + 1,
      data: row,
      errors,
      warnings,
      clientMatch,
      plantMatch,
    });
  }

  const validRows = preview.filter((r) => r.errors.length === 0).length;
  return NextResponse.json({
    rows: preview,
    total: preview.length,
    valid: validRows,
    invalid: preview.length - validRows,
  });
}
