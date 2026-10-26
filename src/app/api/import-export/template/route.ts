// GET /api/import-export/template - return a blank CSV template with headers + 1 sample row
import { NextResponse } from "next/server";

const HEADERS = [
  "equipmentId",
  "name",
  "category",
  "type",
  "orientation",
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
  "material",
  "manufacturer",
  "serialNumber",
  "clientName",
  "plantName",
  "tagNumber",
  "dimensionSource",
  "verificationStatus",
];

const SAMPLE = [
  "EQ-DEMO-001",
  "Sample Storage Tank (DEMO - replace before import)",
  "STORAGE",
  "Chemical Storage Tank",
  "Vertical",
  "3000",
  "6000",
  "",
  "",
  "42",
  "8",
  "",
  "",
  "",
  "",
  "Carbon Steel",
  "Sample Fabricator",
  "SN-001",
  "AcidChem Industries Pvt Ltd (DEMO)",
  "Vapi Acid Plant (DEMO)",
  "T-001",
  "Manufacturer Drawing",
  "Unverified",
];

export async function GET() {
  const csv = [HEADERS.join(","), SAMPLE.map((s) => `"${s}"`).join(",")].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="equipment-import-template.csv"',
    },
  });
}
