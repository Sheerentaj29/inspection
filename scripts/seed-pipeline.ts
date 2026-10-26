/**
 * Seed script for the Pipeline Thickness Report feature.
 * - Adds Coromandel International Limited as a DEMO client
 * - Adds 16 publicly listed Coromandel plant locations as DEMO plants
 *   (city-level only — no internal plant-unit names, equipment IDs, or
 *   dimensions are invented)
 * - Seeds ASME B36.10M and B36.19M reference wall thickness values for
 *   common pipe sizes and schedules (clearly marked UNVERIFIED until an
 *   admin confirms against the licensed standard)
 * - Seeds the 6 default component types (PIPE, ELBOW, TEE, REDUCER, FLANGE, OTHER)
 * - Seeds a sample pipeline inspection with 3 measurement rows that
 *   demonstrate the full report layout (default Coromandel Ennore example)
 *
 * Run with: bun run /home/z/my-project/scripts/seed-pipeline.ts
 *
 * NOTE: This script is IDEMPOTENT — it only adds missing records. It
 * preserves existing equipment, inspections, and audit logs.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding pipeline-thickness feature data...");

  // ---------- COMPONENT TYPES ----------
  const COMPONENT_TYPES = [
    { code: "PIPE",    label: "Pipe",    sortOrder: 0 },
    { code: "ELBOW",   label: "Elbow",   sortOrder: 1 },
    { code: "TEE",     label: "Tee",     sortOrder: 2 },
    { code: "REDUCER", label: "Reducer", sortOrder: 3 },
    { code: "FLANGE",  label: "Flange",  sortOrder: 4 },
    { code: "OTHER",   label: "Other",   sortOrder: 99 },
  ];
  for (const ct of COMPONENT_TYPES) {
    await db.componentType.upsert({
      where: { code: ct.code },
      update: { label: ct.label, sortOrder: ct.sortOrder },
      create: { ...ct, active: true },
    });
  }
  const componentTypeCount = await db.componentType.count();
  console.log(`  ComponentTypes: ${componentTypeCount}`);

  // ---------- PIPE STANDARDS ----------
  // Publicly published ASME B36.10M and B36.19M wall thickness values
  // for the most commonly used nominal pipe sizes and schedules.
  // MARKED UNVERIFIED — an admin must confirm against the licensed
  // standard edition before production use.
  const adminUser = await db.user.findFirst({ where: { email: "admin@inspections.demo" } });

  // B36.10M (carbon steel)
  const B36_10M: Array<[string, number, string, string, number, number?]> = [
    ["1/8", 10.3,  "DN6",   "SCH 40",   1.73, 10.3],
    ["1/8", 10.3,  "DN6",   "SCH 80",   2.41, 10.3],
    ["1/8", 10.3,  "DN6",   "SCH 160",  3.02, 10.3],
    ["1/4", 13.7,  "DN8",   "SCH 40",   2.24, 13.7],
    ["1/4", 13.7,  "DN8",   "SCH 80",   3.02, 13.7],
    ["3/8", 17.1,  "DN10",  "SCH 40",   2.31, 17.1],
    ["3/8", 17.1,  "DN10",  "SCH 80",   3.20, 17.1],
    ["1/2", 21.3,  "DN15",  "SCH 40",   2.77, 21.3],
    ["1/2", 21.3,  "DN15",  "SCH 80",   3.73, 21.3],
    ["1/2", 21.3,  "DN15",  "SCH 160",  5.08, 21.3],
    ["1/2", 21.3,  "DN15",  "STD",      2.77, 21.3],
    ["1/2", 21.3,  "DN15",  "XS",       3.73, 21.3],
    ["1/2", 21.3,  "DN15",  "XXS",      7.47, 21.3],
    ["3/4", 26.7,  "DN20",  "SCH 40",   2.87, 26.7],
    ["3/4", 26.7,  "DN20",  "SCH 80",   3.91, 26.7],
    ["3/4", 26.7,  "DN20",  "SCH 160",  5.54, 26.7],
    ["1",   33.4,  "DN25",  "SCH 40",   3.38, 33.4],
    ["1",   33.4,  "DN25",  "SCH 80",   4.55, 33.4],
    ["1",   33.4,  "DN25",  "SCH 160",  6.35, 33.4],
    ["1 1/4", 42.2, "DN32", "SCH 40",   3.56, 42.2],
    ["1 1/4", 42.2, "DN32", "SCH 80",   4.85, 42.2],
    ["1 1/2", 48.3, "DN40", "SCH 40",    3.68, 48.3],
    ["1 1/2", 48.3, "DN40", "SCH 80",   5.08, 48.3],
    ["1 1/2", 48.3, "DN40", "SCH 160",  7.14, 48.3],
    ["2",   60.3,  "DN50",  "SCH 40",   3.93, 60.3],
    ["2",   60.3,  "DN50",  "SCH 80",   5.54, 60.3],
    ["2",   60.3,  "DN50",  "SCH 160",  7.14, 60.3],
    ["2",   60.3,  "DN50",  "STD",      3.93, 60.3],
    ["2",   60.3,  "DN50",  "XS",       5.54, 60.3],
    ["2",   60.3,  "DN50",  "XXS",      9.70, 60.3],
    ["2 1/2", 73.0, "DN65", "SCH 40",   5.16, 73.0],
    ["2 1/2", 73.0, "DN65", "SCH 80",   7.01, 73.0],
    ["3",   88.9,  "DN80",  "SCH 40",   5.49, 88.9],
    ["3",   88.9,  "DN80",  "SCH 80",   7.62, 88.9],
    ["3",   88.9,  "DN80",  "SCH 160",  11.13, 88.9],
    ["4",   114.3, "DN100", "SCH 40",   6.02, 114.3],
    ["4",   114.3, "DN100", "SCH 80",   8.56, 114.3],
    ["4",   114.3, "DN100", "SCH 160",  11.13, 114.3],
    ["6",   168.3, "DN150", "SCH 40",   7.11, 168.3],
    ["6",   168.3, "DN150", "SCH 80",  10.97, 168.3],
    ["6",   168.3, "DN150", "SCH 160", 14.27, 168.3],
    ["8",   219.1, "DN200", "SCH 40",   8.18, 219.1],
    ["8",   219.1, "DN200", "SCH 80",  12.70, 219.1],
    ["8",   219.1, "DN200", "SCH 160", 18.26, 219.1],
    ["10",  273.0, "DN250", "SCH 40",   9.27, 273.0],
    ["10",  273.0, "DN250", "SCH 80",  15.09, 273.0],
    ["12",  323.9, "DN300", "SCH 40",   9.52, 323.9],
    ["12",  323.9, "DN300", "SCH 80",  12.70, 323.9],
  ];

  // B36.19M (stainless steel) - Sch 5S/10S/40S/80S
  const B36_19M: Array<[string, number, string, string, number, number?]> = [
    ["1/2", 21.3,  "DN15",  "SCH 5S",  1.65, 21.3],
    ["1/2", 21.3,  "DN15",  "SCH 10S", 2.11, 21.3],
    ["1/2", 21.3,  "DN15",  "SCH 40S", 2.77, 21.3],
    ["1/2", 21.3,  "DN15",  "SCH 80S", 3.73, 21.3],
    ["3/4", 26.7,  "DN20",  "SCH 5S",  1.65, 26.7],
    ["3/4", 26.7,  "DN20",  "SCH 10S", 2.11, 26.7],
    ["3/4", 26.7,  "DN20",  "SCH 40S", 2.87, 26.7],
    ["3/4", 26.7,  "DN20",  "SCH 80S", 3.91, 26.7],
    ["1",   33.4,  "DN25",  "SCH 5S",  1.65, 33.4],
    ["1",   33.4,  "DN25",  "SCH 10S", 2.11, 33.4],
    ["1",   33.4,  "DN25",  "SCH 40S", 3.38, 33.4],
    ["1",   33.4,  "DN25",  "SCH 80S", 4.55, 33.4],
    ["2",   60.3,  "DN50",  "SCH 5S",  1.65, 60.3],
    ["2",   60.3,  "DN50",  "SCH 10S", 2.11, 60.3],
    ["2",   60.3,  "DN50",  "SCH 40S", 3.93, 60.3],
    ["2",   60.3,  "DN50",  "SCH 80S", 5.54, 60.3],
    ["3",   88.9,  "DN80",  "SCH 5S",  2.11, 88.9],
    ["3",   88.9,  "DN80",  "SCH 10S", 2.77, 88.9],
    ["3",   88.9,  "DN80",  "SCH 40S", 5.49, 88.9],
    ["3",   88.9,  "DN80",  "SCH 80S", 7.62, 88.9],
    ["4",   114.3, "DN100", "SCH 5S",  2.11, 114.3],
    ["4",   114.3, "DN100", "SCH 10S", 2.77, 114.3],
    ["4",   114.3, "DN100", "SCH 40S", 6.02, 114.3],
    ["4",   114.3, "DN100", "SCH 80S", 8.56, 114.3],
    ["6",   168.3, "DN150", "SCH 5S",  2.77, 168.3],
    ["6",   168.3, "DN150", "SCH 10S", 3.40, 168.3],
    ["6",   168.3, "DN150", "SCH 40S", 7.11, 168.3],
    ["6",   168.3, "DN150", "SCH 80S", 10.97, 168.3],
    ["8",   219.1, "DN200", "SCH 5S",  2.77, 219.1],
    ["8",   219.1, "DN200", "SCH 10S", 3.76, 219.1],
    ["8",   219.1, "DN200", "SCH 40S", 8.18, 219.1],
    ["8",   219.1, "DN200", "SCH 80S", 12.70, 219.1],
  ];

  // Idempotent upsert for pipe standards
  for (const [ns, nsMm, dn, sch, wt, od] of B36_10M) {
    await db.pipeStandard.upsert({
      where: {
        standard_edition_nominalSizeInch_schedule: {
          standard: "ASME B36.10M", edition: "2018", nominalSizeInch: ns, schedule: sch,
        },
      },
      update: { nominalSizeMm: nsMm, dn, wallThicknessMm: wt, oD_mm: od ?? null },
      create: {
        standard: "ASME B36.10M",
        edition: "2018",
        nominalSizeInch: ns,
        nominalSizeMm: nsMm,
        dn,
        schedule: sch,
        wallThicknessMm: wt,
        oD_mm: od ?? null,
        isVerified: false,
        notes: "DEMO reference data — verify against licensed ASME B36.10M before production use.",
      },
    });
  }
  for (const [ns, nsMm, dn, sch, wt, od] of B36_19M) {
    await db.pipeStandard.upsert({
      where: {
        standard_edition_nominalSizeInch_schedule: {
          standard: "ASME B36.19M", edition: "2018", nominalSizeInch: ns, schedule: sch,
        },
      },
      update: { nominalSizeMm: nsMm, dn, wallThicknessMm: wt, oD_mm: od ?? null },
      create: {
        standard: "ASME B36.19M",
        edition: "2018",
        nominalSizeInch: ns,
        nominalSizeMm: nsMm,
        dn,
        schedule: sch,
        wallThicknessMm: wt,
        oD_mm: od ?? null,
        isVerified: false,
        notes: "DEMO reference data — verify against licensed ASME B36.19M before production use.",
      },
    });
  }
  const stdCount = await db.pipeStandard.count();
  console.log(`  PipeStandards: ${stdCount}`);

  // ---------- COROMANDEL CLIENT ----------
  const coromandel = await db.client.upsert({
    where: { name: "COROMANDEL INTERNATIONAL LIMITED" },
    update: {},
    create: {
      name: "COROMANDEL INTERNATIONAL LIMITED",
      industry: "Fertilizers & Agrochemicals",
      contactName: "Coromandel Quality Team",
      contactEmail: "quality@coromandel.example",
      contactPhone: "+91 40 2335 3000",
      address: "Coromandel House, Sardar Patel Road, Secunderabad, Telangana",
      notes: "DEMO DATA — client configured for pipeline thickness report demonstration. Plant locations seeded from publicly available city-level listings only. Internal plant-unit names, equipment IDs, and operational status must be entered by an authorized administrator before production use.",
      isDemo: true,
    },
  });
  console.log(`  Client: ${coromandel.name} (${coromandel.id})`);

  // ---------- 16 COROMANDEL PLANT LOCATIONS ----------
  const LOCATIONS = [
    "Visakhapatnam", "Kakinada", "Ennore", "Ranipet", "Thyagavalli",
    "Ankleshwar", "Dahej", "Sarigam", "Nandesari", "Jammu",
    "Udaipur", "Kota", "Nimrani", "Hospet/Munirabad", "Raebareli", "Pali",
  ];

  // For Ennore, use the user-supplied default plant name. For other
  // locations, create a generic placeholder that clearly indicates the
  // plant name must be edited by an admin.
  for (const loc of LOCATIONS) {
    const plantName = loc === "Ennore"
      ? "Ennore Fertilizer Unit (DEMO)"
      : `${loc} Plant (DEMO — rename)`;
    // For Chennai (which corresponds to Ennore in the user's example),
    // we already cover it via Ennore above.
    // For Ennore, the location field is "Chennai" per the spec.
    const locationField = loc === "Ennore" ? "Chennai" : loc;
    const notes = loc === "Ennore"
      ? "DEMO DATA — Coromandel's Ennore Fertilizer Unit (publicly listed). Plant name, inspection area, pipeline description, MOC, and isometric number must be confirmed by an authorized administrator before production use."
      : "DEMO DATA — publicly listed Coromandel location. Plant unit name and full pipeline identification must be entered by an authorized administrator before production use.";

    const existing = await db.plant.findFirst({
      where: { clientId: coromandel.id, name: plantName },
    });
    if (existing) continue;

    await db.plant.create({
      data: {
        clientId: coromandel.id,
        name: plantName,
        location: locationField,
        address: `${loc}, India`,
        isDemo: true,
        notes,
      },
    });
  }
  const coromandelPlantCount = await db.plant.count({ where: { clientId: coromandel.id } });
  console.log(`  Coromandel plants: ${coromandelPlantCount}`);

  // ---------- SAMPLE PIPELINE INSPECTION ----------
  // Demonstrate the report layout using the user's default example:
  //   Location: Chennai (Ennore Fertilizer Unit)
  //   Pipeline Description: 2-inch water pipeline, top pipe rack, west side
  //   MOC: Carbon Steel
  const ennorePlant = await db.plant.findFirst({
    where: { clientId: coromandel.id, name: "Ennore Fertilizer Unit (DEMO)" },
  });
  if (!ennorePlant || !adminUser) {
    console.log("  Skipping sample inspection (Ennore plant or admin user not found).");
    return;
  }

  // Reference the 2" SCH 40 entry from ASME B36.10M (nominal thickness = 3.93mm)
  const std2Sch40 = await db.pipeStandard.findUnique({
    where: {
      standard_edition_nominalSizeInch_schedule: {
        standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2", schedule: "SCH 40",
      },
    },
  });
  if (!std2Sch40) {
    console.log("  Warning: ASME B36.10M 2\" SCH 40 reference not found.");
    return;
  }

  const pipeType = await db.componentType.findUnique({ where: { code: "PIPE" } });
  const elbowType = await db.componentType.findUnique({ where: { code: "ELBOW" } });
  if (!pipeType || !elbowType) {
    console.log("  Warning: PIPE / ELBOW component types not found.");
    return;
  }

  // Create the sample inspection report (only if it doesn't already exist)
  const existingReport = await db.pipelineInspection.findUnique({
    where: { clientId_reportNumber: { clientId: coromandel.id, reportNumber: "UT-COR-ENN-001-DEMO" } },
  });
  if (existingReport) {
    console.log("  Sample inspection already seeded — skipping.");
    return;
  }

  const sampleReport = await db.pipelineInspection.create({
    data: {
      reportNumber: "UT-COR-ENN-001-DEMO",
      clientId: coromandel.id,
      plantId: ennorePlant.id,
      inspectionArea: "Top Pipe Rack, West Side",
      pipelineDescription: "2-inch water pipeline, top pipe rack, west side",
      pipelineIdentificationNumber: "DEMO-PID-001",
      isometricDrawingNumber: "DEMO-ISO-001",
      materialOfConstruction: "Carbon Steel",
      applicableStandard: "ASME B36.10M",
      standardEdition: "2018",
      inspectionDate: new Date("2026-10-20"),
      status: "Draft",
      revisionNumber: 1,
      inspectorId: adminUser.id,
      inspectorName: adminUser.name,
      findingsSummary:
        "Ultrasonic thickness measurements carried out at multiple locations on the 2-inch water pipeline. All measured values are within acceptable range relative to nominal wall thickness. No significant metal loss observed at inspected points. (DEMO DATA — illustrative only.)",
      comments:
        "Inspection conducted per client QA plan. Reference standard: ASME B36.10M-2018. (DEMO DATA)",
      isDemo: true,
      // 3 sample measurement rows
      measurements: {
        create: [
          {
            pointNo: "P-1",
            sortOrder: 0,
            pipeSizeInch: "2",
            pipeSchedule: "SCH 40",
            nominalThicknessMm: 3.93,
            standardId: std2Sch40.id,
            componentTypeId: pipeType.id,
            componentTypeCode: "PIPE",
            northMm: 3.85,
            northStatus: "Measured",
            eastMm: 3.80,
            eastStatus: "Measured",
            southMm: 3.88,
            southStatus: "Measured",
            westMm: 3.82,
            westStatus: "Measured",
            observedMinimumMm: 3.80,
            findingsComments: "No significant metal loss. (DEMO DATA)",
          },
          {
            pointNo: "P-2",
            sortOrder: 1,
            pipeSizeInch: "2",
            pipeSchedule: "SCH 40",
            nominalThicknessMm: 3.93,
            standardId: std2Sch40.id,
            componentTypeId: elbowType.id,
            componentTypeCode: "ELBOW",
            northMm: 3.65,
            northStatus: "Measured",
            eastMm: 3.72,
            eastStatus: "Measured",
            southMm: 3.68,
            southStatus: "Measured",
            westMm: 3.70,
            westStatus: "Measured",
            observedMinimumMm: 3.65,
            findingsComments: "Slight thinning on extrados. (DEMO DATA)",
          },
          {
            pointNo: "P-3",
            sortOrder: 2,
            pipeSizeInch: "2",
            pipeSchedule: "SCH 40",
            nominalThicknessMm: 3.93,
            standardId: std2Sch40.id,
            componentTypeId: pipeType.id,
            componentTypeCode: "PIPE",
            northMm: 3.78,
            northStatus: "Measured",
            eastMm: 3.81,
            eastStatus: "Measured",
            southMm: 3.79,
            southStatus: "Measured",
            westMm: null,
            westStatus: "NotMeasured",
            observedMinimumMm: 3.78,
            findingsComments: "West position not accessible due to support steel. (DEMO DATA)",
          },
        ],
      },
    },
    include: { measurements: true },
  });

  console.log(`  Sample inspection: ${sampleReport.reportNumber} (${sampleReport.measurements.length} rows)`);

  // ---------- AUDIT LOG ----------
  await db.auditLog.create({
    data: {
      userId: adminUser.id,
      userName: adminUser.name,
      action: "IMPORT",
      entity: "PipeStandard",
      details: `Seeded ${B36_10M.length + B36_19M.length} ASME B36.10M / B36.19M reference rows (marked UNVERIFIED).`,
    },
  });
  await db.auditLog.create({
    data: {
      userId: adminUser.id,
      userName: adminUser.name,
      action: "CREATE",
      entity: "Client",
      entityId: coromandel.id,
      details: `Seeded COROMANDEL INTERNATIONAL LIMITED + ${coromandelPlantCount} demo plant locations.`,
    },
  });
  await db.auditLog.create({
    data: {
      userId: adminUser.id,
      userName: adminUser.name,
      action: "CREATE",
      entity: "PipelineInspection",
      entityId: sampleReport.id,
      details: `Seeded sample pipeline thickness report ${sampleReport.reportNumber} with 3 demo measurement rows.`,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
