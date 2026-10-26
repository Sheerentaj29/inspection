/**
 * Seed script for Equipment Master Management module.
 * Creates demo users, clients, plants, equipment, inspections, and audit logs.
 * All demo records are clearly flagged isDemo=true and unverified dimensions
 * are explicitly marked verificationStatus="Unverified".
 *
 * Run with: bun run /home/z/my-project/scripts/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const db = new PrismaClient();

// Tiny password hash helper (NOT for production — this is a demo only).
function hashPassword(pw: string): string {
  return createHash("sha256").update(pw).digest("hex");
}

async function main() {
  console.log("Seeding Equipment Master demo data...");

  // -------- USERS --------
  const admin = await db.user.upsert({
    where: { email: "admin@inspections.demo" },
    update: {},
    create: {
      email: "admin@inspections.demo",
      name: "Priya Admin",
      passwordHash: hashPassword("admin123"),
      role: "ADMIN",
    },
  });

  const inspector = await db.user.upsert({
    where: { email: "inspector@inspections.demo" },
    update: {},
    create: {
      email: "inspector@inspections.demo",
      name: "Rahul Inspector",
      passwordHash: hashPassword("inspector123"),
      role: "INSPECTOR",
    },
  });

  // -------- CLIENTS --------
  const client1 = await db.client.upsert({
    where: { name: "AcidChem Industries Pvt Ltd (DEMO)" },
    update: {},
    create: {
      name: "AcidChem Industries Pvt Ltd (DEMO)",
      industry: "Specialty Chemicals",
      contactName: "Anil Mehta",
      contactEmail: "anil.mehta@acidchem.demo",
      contactPhone: "+91 98200 11223",
      address: "Plot 14, Chemical Zone, Vapi, Gujarat 396195",
      notes: "DEMO DATA — fictional client for training only.",
      isDemo: true,
    },
  });

  const client2 = await db.client.upsert({
    where: { name: "Western Petrochem Ltd (DEMO)" },
    update: {},
    create: {
      name: "Western Petrochem Ltd (DEMO)",
      industry: "Petrochemicals",
      contactName: "Sunita Rao",
      contactEmail: "sunita.rao@westernpetro.demo",
      contactPhone: "+91 98765 43210",
      address: "Refinery Road, Mangalore SEZ, Karnataka 575027",
      notes: "DEMO DATA — fictional client for training only.",
      isDemo: true,
    },
  });

  const client3 = await db.client.upsert({
    where: { name: "Greenfield Water Solutions (DEMO)" },
    update: {},
    create: {
      name: "Greenfield Water Solutions (DEMO)",
      industry: "Water & Wastewater Treatment",
      contactName: "Imran Khan",
      contactEmail: "imran@greenfieldwater.demo",
      contactPhone: "+91 90909 80808",
      address: "Survey 88, Industrial Area, Pune, Maharashtra 411019",
      notes: "DEMO DATA — fictional client for training only.",
      isDemo: true,
    },
  });

  // -------- PLANTS --------
  const plant1 = await db.plant.create({
    data: {
      clientId: client1.id,
      name: "Vapi Acid Plant (DEMO)",
      location: "Vapi, Gujarat",
      address: "Plot 14, Chemical Zone, Vapi 396195",
      isDemo: true,
    },
  });

  const plant2 = await db.plant.create({
    data: {
      clientId: client1.id,
      name: "Vapi Solvent Unit (DEMO)",
      location: "Vapi, Gujarat",
      address: "Plot 14B, Chemical Zone, Vapi 396195",
      isDemo: true,
    },
  });

  const plant3 = await db.plant.create({
    data: {
      clientId: client2.id,
      name: "Mangalore Refinery Unit 2 (DEMO)",
      location: "Mangalore, Karnataka",
      address: "Refinery Road, Mangalore SEZ 575027",
      isDemo: true,
    },
  });

  const plant4 = await db.plant.create({
    data: {
      clientId: client3.id,
      name: "Pune Effluent Treatment Plant (DEMO)",
      location: "Pune, Maharashtra",
      address: "Survey 88, Industrial Area, Pune 411019",
      isDemo: true,
    },
  });

  // -------- EQUIPMENT (DEMO SAMPLE) --------
  // NOTE: dimensions below are illustrative only. Real plant dimensions must
  // come from approved drawings, manufacturer records, nameplates, or
  // verified field measurements. Unverified records are flagged explicitly.
  type EqSeed = {
    equipmentId: string;
    name: string;
    category: string;
    type: string;
    orientation?: string;
    diameter?: number;
    height?: number;
    length?: number;
    width?: number;
    capacity?: number;
    wallThickness?: number;
    nominalDiameter?: number;
    outsideDiameter?: number;
    tubeLength?: number;
    shellDiameter?: number;
    material?: string;
    manufacturer?: string;
    serialNumber?: string;
    clientId: string;
    plantId: string;
    tagNumber?: string;
    dimensionSource?: string;
    verificationStatus: string;
  };

  const equipmentSeed: EqSeed[] = [
    {
      equipmentId: "AC-VAPI-001",
      name: "Sulphuric Acid Storage Tank T-101",
      category: "STORAGE",
      type: "Chemical Storage Tank",
      orientation: "Vertical",
      diameter: 4500,
      height: 12000,
      capacity: 190,
      wallThickness: 8,
      material: "Carbon Steel (Rubber Lined)",
      manufacturer: "Tanks India Fabricators",
      serialNumber: "TIF-2019-0418",
      clientId: client1.id,
      plantId: plant1.id,
      tagNumber: "T-101",
      dimensionSource: "Approved Engineering Drawing",
      verificationStatus: "Verified",
    },
    {
      equipmentId: "AC-VAPI-002",
      name: "Caustic Dosing Tank T-104",
      category: "STORAGE",
      type: "Chemical Dosing Tank",
      orientation: "Vertical",
      diameter: 1200,
      height: 1800,
      capacity: 2,
      wallThickness: 5,
      material: "HDPE",
      manufacturer: "Polyquip India",
      serialNumber: "PQ-2021-2204",
      clientId: client1.id,
      plantId: plant1.id,
      tagNumber: "T-104",
      dimensionSource: "Manufacturer Drawing",
      verificationStatus: "Verified",
    },
    {
      equipmentId: "AC-VAPI-003",
      name: "Solvent Day Tank T-220",
      category: "STORAGE",
      type: "Solvent Storage Tank",
      orientation: "Horizontal",
      diameter: 2400,
      length: 6000,
      capacity: 25,
      wallThickness: 6,
      material: "SS316L",
      manufacturer: "Stainless Fab India",
      serialNumber: "SFI-2020-1180",
      clientId: client1.id,
      plantId: plant2.id,
      tagNumber: "T-220",
      dimensionSource: "Nameplate",
      verificationStatus: "Unverified",
    },
    {
      equipmentId: "AC-VAPI-004",
      name: "Process Air Receiver V-301",
      category: "UTILITY",
      type: "Air Receiver",
      orientation: "Vertical",
      diameter: 900,
      height: 2400,
      wallThickness: 10,
      material: "Carbon Steel SA516 Gr70",
      manufacturer: "Ingersoll Rand",
      serialNumber: "IR-AR-77321",
      clientId: client1.id,
      plantId: plant2.id,
      tagNumber: "V-301",
      dimensionSource: "Manufacturer Drawing",
      verificationStatus: "Verified",
    },
    {
      equipmentId: "AC-VAPI-005",
      name: "HCL Process Pipe P-401",
      category: "PIPE",
      type: "Process Pipe",
      orientation: "Horizontal",
      nominalDiameter: 50,
      outsideDiameter: 60.3,
      length: 24500,
      wallThickness: 3.91,
      material: "SS316L Seamless",
      manufacturer: "Jindal Stainless",
      serialNumber: "JS-P24001",
      clientId: client1.id,
      plantId: plant1.id,
      tagNumber: "P-401",
      dimensionSource: "Field Measurement",
      verificationStatus: "Unverified",
    },
    {
      equipmentId: "WP-MNG-001",
      name: "LPG Spherical Storage Vessel V-501",
      category: "PRESSURE",
      type: "LPG Storage Vessel",
      orientation: "Vertical",
      diameter: 9200,
      height: 9200,
      capacity: 620,
      wallThickness: 38,
      material: "SA537 CL2",
      manufacturer: "L&T Heavy Engineering",
      serialNumber: "LHE-2018-9911",
      clientId: client2.id,
      plantId: plant3.id,
      tagNumber: "V-501",
      dimensionSource: "Approved Engineering Drawing",
      verificationStatus: "Verified",
    },
    {
      equipmentId: "WP-MNG-002",
      name: "High-Pressure Gas Receiver V-510",
      category: "PRESSURE",
      type: "Gas Receiver",
      orientation: "Horizontal",
      diameter: 1400,
      length: 4500,
      wallThickness: 22,
      material: "SA516 Gr70",
      manufacturer: "Godrej Process Equipment",
      serialNumber: "GPE-2020-4412",
      clientId: client2.id,
      plantId: plant3.id,
      tagNumber: "V-510",
      dimensionSource: "Manufacturer Drawing",
      verificationStatus: "Verified",
    },
    {
      equipmentId: "WP-MNG-003",
      name: "Debutanizer Column C-601",
      category: "SEPARATION",
      type: "Distillation Column",
      orientation: "Vertical",
      diameter: 2200,
      height: 38500,
      wallThickness: 18,
      material: "SA516 Gr70 + Clad SS316L",
      manufacturer: "L&T Heavy Engineering",
      serialNumber: "LHE-2017-3300",
      clientId: client2.id,
      plantId: plant3.id,
      tagNumber: "C-601",
      dimensionSource: "Approved Engineering Drawing",
      verificationStatus: "Verified",
    },
    {
      equipmentId: "WP-MNG-004",
      name: "Shell-and-Tube Cooler E-615",
      category: "SEPARATION",
      type: "Shell-and-Tube Heat Exchanger",
      orientation: "Horizontal",
      shellDiameter: 900,
      tubeLength: 4880,
      length: 5400,
      wallThickness: 12,
      material: "Shell: SA516 Gr70 / Tubes: SS316",
      manufacturer: "Bharat Heavy Vessels",
      serialNumber: "BHV-2019-7741",
      clientId: client2.id,
      plantId: plant3.id,
      tagNumber: "E-615",
      dimensionSource: "Approved Engineering Drawing",
      verificationStatus: "Verified",
    },
    {
      equipmentId: "WP-MNG-005",
      name: "Centrifugal Cooling Water Pump P-701",
      category: "PUMP",
      type: "Centrifugal Pump",
      orientation: "Horizontal",
      nominalDiameter: 150,
      material: "Cast Iron + SS Impeller",
      manufacturer: "Kirloskar Brothers",
      serialNumber: "KBL-CP-18820",
      clientId: client2.id,
      plantId: plant3.id,
      tagNumber: "P-701",
      dimensionSource: "Nameplate",
      verificationStatus: "Unverified",
    },
    {
      equipmentId: "WP-MNG-006",
      name: "Main Ball Isolation Valve V-705",
      category: "VALVE",
      type: "Ball Valve",
      orientation: "Not Applicable",
      nominalDiameter: 200,
      outsideDiameter: 219,
      material: "WCB Body + Trunnion SS316",
      manufacturer: "Audco Valves",
      serialNumber: "AV-BV-44110",
      clientId: client2.id,
      plantId: plant3.id,
      tagNumber: "V-705",
      dimensionSource: "Nameplate",
      verificationStatus: "Verified",
    },
    {
      equipmentId: "GW-PUN-001",
      name: "Equalization Tank T-011",
      category: "STORAGE",
      type: "Wastewater Treatment Tank",
      orientation: "Vertical",
      diameter: 8000,
      height: 6500,
      capacity: 320,
      wallThickness: 10,
      material: "RCC with Epoxy Lining",
      manufacturer: "Civil Contractor",
      clientId: client3.id,
      plantId: plant4.id,
      tagNumber: "T-011",
      dimensionSource: "Field Measurement",
      verificationStatus: "Unverified",
    },
    {
      equipmentId: "GW-PUN-002",
      name: "Demineralized Water Storage Tank T-025",
      category: "STORAGE",
      type: "Demineralized Water Tank",
      orientation: "Vertical",
      diameter: 3000,
      height: 4500,
      capacity: 32,
      wallThickness: 5,
      material: "FRP",
      manufacturer: "BEC Industries",
      serialNumber: "BEC-2021-0992",
      clientId: client3.id,
      plantId: plant4.id,
      tagNumber: "T-025",
      dimensionSource: "Manufacturer Drawing",
      verificationStatus: "Verified",
    },
    {
      equipmentId: "GW-PUN-003",
      name: "DM Water Transfer Pump P-040",
      category: "PUMP",
      type: "Centrifugal Pump",
      orientation: "Horizontal",
      nominalDiameter: 65,
      material: "SS316",
      manufacturer: "CRI Pumps",
      serialNumber: "CRI-2022-1187",
      clientId: client3.id,
      plantId: plant4.id,
      tagNumber: "P-040",
      dimensionSource: "Nameplate",
      verificationStatus: "Unverified",
    },
  ];

  // Wipe previous demo equipment, inspections, audit logs (preserve users/clients/plants).
  console.log("Clearing previous demo equipment, inspections, audit logs...");
  await db.auditLog.deleteMany({ where: { entity: { in: ["Equipment", "Inspection"] } } });
  await db.inspection.deleteMany({});
  await db.equipment.deleteMany({});

  // Insert equipment
  for (const e of equipmentSeed) {
    await db.equipment.create({
      data: {
        ...e,
        isDemo: true,
        notes:
          "DEMO DATA — illustrative dimensions only. Real plant dimensions must come from approved drawings, manufacturer records, nameplates, or verified field measurements.",
        createdById: admin.id,
      },
    });
  }

  // -------- INSPECTIONS (DEMO) --------
  const insp1 = await db.equipment.findFirst({
    where: { equipmentId: "AC-VAPI-001" },
  });
  const insp2 = await db.equipment.findFirst({
    where: { equipmentId: "WP-MNG-002" },
  });
  const insp3 = await db.equipment.findFirst({
    where: { equipmentId: "GW-PUN-002" },
  });

  if (insp1) {
    await db.inspection.create({
      data: {
        equipmentId: insp1.id,
        inspectorId: inspector.id,
        inspectionDate: new Date("2025-04-12"),
        inspectionType: "UT Thickness Measurement",
        status: "Completed",
        summary: "Eight UT points on shell course 2. All readings within retirement thickness.",
        observations:
          "Internal lining intact at sampling locations. No external corrosion observed. Coating breakdown noted near nozzle N3.",
        measurements: JSON.stringify([
          { label: "UT-1", value: 7.8, unit: "mm", notes: "Shell course 2, 0 deg" },
          { label: "UT-2", value: 7.9, unit: "mm", notes: "Shell course 2, 90 deg" },
          { label: "UT-3", value: 7.6, unit: "mm", notes: "Shell course 2, 180 deg" },
          { label: "UT-4", value: 7.7, unit: "mm", notes: "Shell course 2, 270 deg" },
        ]),
        photoCount: 12,
        reportPath: "/reports/AC-VAPI-001-2025-04-12.pdf",
        isDemo: true,
      },
    });
  }
  if (insp2) {
    await db.inspection.create({
      data: {
        equipmentId: insp2.id,
        inspectorId: inspector.id,
        inspectionDate: new Date("2025-08-20"),
        inspectionType: "Visual Inspection",
        status: "Completed",
        summary: "External visual inspection. Support cradle, saddle, nozzle flanges inspected.",
        observations:
          "Paint coating in fair condition with localised peeling on top half. Saddle welds sound. No weepage at supports.",
        measurements: JSON.stringify([
          { label: "Coating thickness", value: 240, unit: "μm", notes: "Average of 5 readings" },
        ]),
        photoCount: 18,
        reportPath: "/reports/WP-MNG-002-2025-08-20.pdf",
        isDemo: true,
      },
    });
  }
  if (insp3) {
    await db.inspection.create({
      data: {
        equipmentId: insp3.id,
        inspectorId: inspector.id,
        inspectionDate: new Date("2026-01-15"),
        inspectionType: "Visual Inspection",
        status: "Completed",
        summary: "Quarterly visual inspection per client QA plan.",
        observations:
          "External surface clean. No visible cracks at nozzle-to-shell junction. Inlet strainer replaced.",
        measurements: JSON.stringify([]),
        photoCount: 6,
        reportPath: "/reports/GW-PUN-002-2026-01-15.pdf",
        isDemo: true,
      },
    });
  }

  // -------- AUDIT LOG --------
  await db.auditLog.create({
    data: {
      userId: admin.id,
      userName: admin.name,
      action: "IMPORT",
      entity: "Equipment",
      details: `Seeded ${equipmentSeed.length} demo equipment records.`,
    },
  });

  console.log("Seed complete.");
  console.log(`  Users: ${await db.user.count()}`);
  console.log(`  Clients: ${await db.client.count()}`);
  console.log(`  Plants: ${await db.plant.count()}`);
  console.log(`  Equipment: ${await db.equipment.count()}`);
  console.log(`  Inspections: ${await db.inspection.count()}`);
  console.log(`  AuditLogs: ${await db.auditLog.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
