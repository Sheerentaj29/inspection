// GET /api/equipment/catalog - returns the equipment category catalog (static)
import { NextResponse } from "next/server";
import { EQUIPMENT_CATEGORIES, DIMENSION_FIELD_META } from "@/lib/domain/equipment-catalog";

export async function GET() {
  return NextResponse.json({
    categories: EQUIPMENT_CATEGORIES,
    dimensionFields: DIMENSION_FIELD_META,
  });
}
