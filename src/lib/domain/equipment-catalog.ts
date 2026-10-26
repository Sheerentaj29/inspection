// Centralized domain constants: equipment categories, types, orientation rules,
// dimension sources, verification status, inspection types, user roles.

import type { Prisma } from "@prisma/client";

// ----- USER ROLES -----
export const USER_ROLES = ["ADMIN", "INSPECTOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ----- ORIENTATION -----
export const ORIENTATIONS = ["Horizontal", "Vertical", "Inclined", "Not Applicable"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

// ----- DIMENSION SOURCE -----
export const DIMENSION_SOURCES = [
  "Approved Engineering Drawing",
  "Manufacturer Drawing",
  "Nameplate",
  "Field Measurement",
] as const;
export type DimensionSource = (typeof DIMENSION_SOURCES)[number];

// ----- VERIFICATION STATUS -----
export const VERIFICATION_STATUSES = ["Verified", "Unverified"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

// ----- INSPECTION TYPES -----
export const INSPECTION_TYPES = [
  "Visual Inspection",
  "UT Thickness Measurement",
  "Dye Penetrant Testing",
  "Magnetic Particle Testing",
  "Radiographic Testing",
  "Ultrasonic Flaw Detection",
  "Pressure / Hydrostatic Test",
  "Coating Inspection",
  "Other",
] as const;

export const INSPECTION_STATUSES = [
  "Scheduled",
  "In-Progress",
  "Completed",
  "Failed",
] as const;

// =====================================================
// EQUIPMENT CATEGORY DEFINITIONS
// =====================================================
// Each category declares its possible equipment types and the set of
// dimension fields that are relevant. The UI uses this to render
// conditional dimension inputs and to pick sensible default orientations.

export type DimensionField =
  | "diameter"
  | "height"
  | "length"
  | "width"
  | "capacity"
  | "wallThickness"
  | "nominalDiameter"
  | "outsideDiameter"
  | "tubeLength"
  | "shellDiameter";

export interface CategoryDefinition {
  key: string;
  label: string;
  types: string[];
  defaultOrientation?: Orientation;
  orientations: Orientation[];
  dimensions: DimensionField[];
  description?: string;
}

export const EQUIPMENT_CATEGORIES: CategoryDefinition[] = [
  // -------------------- STORAGE --------------------
  {
    key: "STORAGE",
    label: "Storage Equipment",
    description:
      "Atmospheric or low-pressure vessels used to hold liquids and gases across the plant.",
    types: [
      "Chemical Storage Tank",
      "Raw Material Tank",
      "Solvent Storage Tank",
      "Buffer Tank",
      "Day Tank",
      "Intermediate Storage Vessel",
      "Chemical Dosing Tank",
      "Water Treatment Tank",
      "Wastewater Treatment Tank",
      "Demineralized Water Tank",
    ],
    defaultOrientation: "Vertical",
    orientations: ["Vertical", "Horizontal", "Inclined", "Not Applicable"],
    dimensions: ["diameter", "height", "capacity", "wallThickness"],
  },
  // -------------------- PRESSURE & PROCESS --------------------
  {
    key: "PRESSURE",
    label: "Pressure and Process Equipment",
    description:
      "Code-stamped pressure vessels and process reactors operating above atmospheric pressure.",
    types: [
      "Pressure Vessel",
      "Gas Receiver",
      "Pressure Accumulator",
      "Separator Vessel",
      "Chemical Reactor",
      "Mixing Vessel",
      "Neutralization Tank",
      "Crystallizer",
      "Fermentation Vessel",
      "LPG Storage Vessel",
    ],
    defaultOrientation: "Vertical",
    orientations: ["Vertical", "Horizontal", "Inclined", "Not Applicable"],
    dimensions: ["diameter", "height", "length", "capacity", "wallThickness"],
  },
  // -------------------- SEPARATION & THERMAL --------------------
  {
    key: "SEPARATION",
    label: "Separation and Thermal Equipment",
    description:
      "Mass-transfer columns, separation drums, and shell-and-tube heat exchangers.",
    types: [
      "Flash Vessel",
      "Knockout Drum",
      "Distillation Column",
      "Absorption Column",
      "Shell-and-Tube Heat Exchanger",
      "Condenser",
      "Evaporator",
    ],
    defaultOrientation: "Vertical",
    orientations: ["Vertical", "Horizontal", "Inclined", "Not Applicable"],
    dimensions: [
      "diameter",
      "height",
      "length",
      "capacity",
      "wallThickness",
      "shellDiameter",
      "tubeLength",
    ],
  },
  // -------------------- UTILITY --------------------
  {
    key: "UTILITY",
    label: "Utility Equipment",
    description:
      "Plant-utility vessels supporting boilers, compressed air, water treatment and chemical preparation.",
    types: [
      "Boiler Feedwater Tank",
      "Air Receiver",
      "Chemical Preparation Tank",
      "Condensate Collection Tank",
      "Brine Tank",
      "Slurry Tank",
      "Settling Tank",
      "Filter Vessel",
    ],
    defaultOrientation: "Vertical",
    orientations: ["Vertical", "Horizontal", "Inclined", "Not Applicable"],
    dimensions: ["diameter", "height", "length", "width", "capacity", "wallThickness"],
  },
  // -------------------- PIPE --------------------
  {
    key: "PIPE",
    label: "Pipes",
    description:
      "Process pipework. Dimensional fields differ from vessels — nominal/OD/length/wall thickness dominate.",
    types: [
      "Process Pipe",
      "Transfer Line",
      "Steam Line",
      "Cooling Water Line",
      "Instrument Tubing",
    ],
    defaultOrientation: "Horizontal",
    orientations: ["Horizontal", "Vertical", "Inclined", "Not Applicable"],
    dimensions: ["nominalDiameter", "outsideDiameter", "length", "wallThickness"],
  },
  // -------------------- VALVE --------------------
  {
    key: "VALVE",
    label: "Valves",
    description:
      "Isolation, control and safety valves. Equipment-specific tags dominate; dimensions are minimal.",
    types: [
      "Ball Valve",
      "Gate Valve",
      "Globe Valve",
      "Check Valve",
      "Butterfly Valve",
      "Pressure Relief Valve",
      "Control Valve",
    ],
    defaultOrientation: "Not Applicable",
    orientations: ["Not Applicable", "Horizontal", "Vertical"],
    dimensions: ["nominalDiameter", "outsideDiameter"],
  },
  // -------------------- PUMP --------------------
  {
    key: "PUMP",
    label: "Pumps",
    description:
      "Centrifugal, positive-displacement and metering pumps. Orientation typically not applicable.",
    types: [
      "Centrifugal Pump",
      "Positive Displacement Pump",
      "Gear Pump",
      "Diaphragm Pump",
      "Metering Pump",
      "Submersible Pump",
    ],
    defaultOrientation: "Horizontal",
    orientations: ["Horizontal", "Vertical", "Not Applicable"],
    dimensions: ["nominalDiameter"],
  },
  // -------------------- OTHER --------------------
  {
    key: "OTHER",
    label: "Other Equipment",
    description:
      "Extensible category for filters, scrubbers, stacks, and any other industrial component.",
    types: ["Filter", "Scrubber", "Stack", "Furnace", "Custom Component"],
    defaultOrientation: "Vertical",
    orientations: ["Vertical", "Horizontal", "Inclined", "Not Applicable"],
    dimensions: ["diameter", "height", "length", "width", "capacity", "wallThickness"],
  },
];

// Quick lookup helpers used by API and UI code.
export const CATEGORY_MAP: Record<string, CategoryDefinition> = Object.fromEntries(
  EQUIPMENT_CATEGORIES.map((c) => [c.key, c]),
);

export const ALL_EQUIPMENT_TYPES = EQUIPMENT_CATEGORIES.flatMap((c) =>
  c.types.map((t) => ({ category: c.key, type: t, categoryLabel: c.label })),
);

export function findCategoryByKey(key: string): CategoryDefinition | undefined {
  return CATEGORY_MAP[key];
}

export function findCategoryByType(type: string): CategoryDefinition | undefined {
  return EQUIPMENT_CATEGORIES.find((c) => c.types.includes(type));
}

// ----- DIMENSION FIELD METADATA -----
export const DIMENSION_FIELD_META: Record<
  DimensionField,
  { label: string; unit: string; hint?: string }
> = {
  diameter: { label: "Diameter", unit: "mm", hint: "Internal diameter for vessels" },
  height: { label: "Height", unit: "mm", hint: "Overall height (vertical vessels)" },
  length: { label: "Length", unit: "mm", hint: "Horizontal length (horizontal vessels / pipes)" },
  width: { label: "Width", unit: "mm", hint: "Rectangular tank width" },
  capacity: { label: "Capacity / Volume", unit: "m³", hint: "Working or geometric volume" },
  wallThickness: { label: "Wall Thickness", unit: "mm", hint: "Shell / plate thickness" },
  nominalDiameter: { label: "Nominal Diameter (DN)", unit: "mm", hint: "Pipe nominal size" },
  outsideDiameter: { label: "Outside Diameter (OD)", unit: "mm", hint: "Pipe outer diameter" },
  tubeLength: { label: "Tube Length", unit: "mm", hint: "Heat-exchanger tube length" },
  shellDiameter: { label: "Shell Diameter", unit: "mm", hint: "Heat-exchanger shell ID" },
};
