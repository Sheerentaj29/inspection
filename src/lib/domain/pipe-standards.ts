// ASME B36.10M (carbon steel) and B36.19M (stainless steel) reference
// data for the most commonly used nominal pipe sizes and schedules.
//
// Values are taken from publicly published ASME reference tables.
// They MUST be re-verified against the licensed / official ASME standard
// edition by an authorized administrator before production use.
//
// These values are marked isVerified = false on seed so the UI clearly
// flags them as "unverified reference data" until an admin signs off.

export interface PipeStandardSeed {
  standard: string;       // "ASME B36.10M" | "ASME B36.19M"
  edition: string;
  nominalSizeInch: string;
  nominalSizeMm: number;  // actual OD in mm
  dn: string;
  schedule: string;
  wallThicknessMm: number;
  oD_mm?: number;
}

// Common ASME B36.10M (carbon steel) schedule wall thickness values, in mm.
// Source: ASME B36.10M published reference tables (publicly available).
export const ASME_B36_10M_SEED: PipeStandardSeed[] = [
  // 1/8" DN6
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/8", nominalSizeMm: 10.3, dn: "DN6",  schedule: "SCH 40",  wallThicknessMm: 1.73, oD_mm: 10.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/8", nominalSizeMm: 10.3, dn: "DN6",  schedule: "SCH 80",  wallThicknessMm: 2.41, oD_mm: 10.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/8", nominalSizeMm: 10.3, dn: "DN6",  schedule: "SCH 160", wallThicknessMm: 3.02, oD_mm: 10.3 },
  // 1/4" DN8
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/4", nominalSizeMm: 13.7, dn: "DN8",  schedule: "SCH 40",  wallThicknessMm: 2.24, oD_mm: 13.7 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/4", nominalSizeMm: 13.7, dn: "DN8",  schedule: "SCH 80",  wallThicknessMm: 3.02, oD_mm: 13.7 },
  // 3/8" DN10
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3/8", nominalSizeMm: 17.1, dn: "DN10", schedule: "SCH 40",  wallThicknessMm: 2.31, oD_mm: 17.1 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3/8", nominalSizeMm: 17.1, dn: "DN10", schedule: "SCH 80",  wallThicknessMm: 3.20, oD_mm: 17.1 },
  // 1/2" DN15
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "SCH 40",  wallThicknessMm: 2.77, oD_mm: 21.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "SCH 80",  wallThicknessMm: 3.73, oD_mm: 21.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "SCH 160", wallThicknessMm: 5.08, oD_mm: 21.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "STD",     wallThicknessMm: 2.77, oD_mm: 21.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "XS",      wallThicknessMm: 3.73, oD_mm: 21.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "XXS",     wallThicknessMm: 7.47, oD_mm: 21.3 },
  // 3/4" DN20
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3/4", nominalSizeMm: 26.7, dn: "DN20", schedule: "SCH 40",  wallThicknessMm: 2.87, oD_mm: 26.7 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3/4", nominalSizeMm: 26.7, dn: "DN20", schedule: "SCH 80",  wallThicknessMm: 3.91, oD_mm: 26.7 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3/4", nominalSizeMm: 26.7, dn: "DN20", schedule: "SCH 160", wallThicknessMm: 5.54, oD_mm: 26.7 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3/4", nominalSizeMm: 26.7, dn: "DN20", schedule: "STD",     wallThicknessMm: 2.87, oD_mm: 26.7 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3/4", nominalSizeMm: 26.7, dn: "DN20", schedule: "XS",      wallThicknessMm: 3.91, oD_mm: 26.7 },
  // 1" DN25
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "SCH 40",  wallThicknessMm: 3.38, oD_mm: 33.4 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "SCH 80",  wallThicknessMm: 4.55, oD_mm: 33.4 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "SCH 160", wallThicknessMm: 6.35, oD_mm: 33.4 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "STD",     wallThicknessMm: 3.38, oD_mm: 33.4 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "XS",      wallThicknessMm: 4.55, oD_mm: 33.4 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "XXS",     wallThicknessMm: 9.09, oD_mm: 33.4 },
  // 1 1/4" DN32
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/4", nominalSizeMm: 42.2, dn: "DN32", schedule: "SCH 40",  wallThicknessMm: 3.56, oD_mm: 42.2 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/4", nominalSizeMm: 42.2, dn: "DN32", schedule: "SCH 80",  wallThicknessMm: 4.85, oD_mm: 42.2 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/4", nominalSizeMm: 42.2, dn: "DN32", schedule: "SCH 160", wallThicknessMm: 6.35, oD_mm: 42.2 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/4", nominalSizeMm: 42.2, dn: "DN32", schedule: "STD",     wallThicknessMm: 3.56, oD_mm: 42.2 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/4", nominalSizeMm: 42.2, dn: "DN32", schedule: "XS",      wallThicknessMm: 4.85, oD_mm: 42.2 },
  // 1 1/2" DN40
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/2", nominalSizeMm: 48.3, dn: "DN40", schedule: "SCH 40",  wallThicknessMm: 3.68, oD_mm: 48.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/2", nominalSizeMm: 48.3, dn: "DN40", schedule: "SCH 80",  wallThicknessMm: 5.08, oD_mm: 48.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/2", nominalSizeMm: 48.3, dn: "DN40", schedule: "SCH 160", wallThicknessMm: 7.14, oD_mm: 48.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/2", nominalSizeMm: 48.3, dn: "DN40", schedule: "STD",     wallThicknessMm: 3.68, oD_mm: 48.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/2", nominalSizeMm: 48.3, dn: "DN40", schedule: "XS",      wallThicknessMm: 5.08, oD_mm: 48.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "1 1/2", nominalSizeMm: 48.3, dn: "DN40", schedule: "XXS",     wallThicknessMm: 8.74, oD_mm: 48.3 },
  // 2" DN50
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "SCH 40",  wallThicknessMm: 3.93, oD_mm: 60.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "SCH 80",  wallThicknessMm: 5.54, oD_mm: 60.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "SCH 160", wallThicknessMm: 7.14, oD_mm: 60.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "STD",     wallThicknessMm: 3.93, oD_mm: 60.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "XS",      wallThicknessMm: 5.54, oD_mm: 60.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "XXS",     wallThicknessMm: 9.70, oD_mm: 60.3 },
  // 2 1/2" DN65
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2 1/2", nominalSizeMm: 73.0, dn: "DN65", schedule: "SCH 40",  wallThicknessMm: 5.16, oD_mm: 73.0 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2 1/2", nominalSizeMm: 73.0, dn: "DN65", schedule: "SCH 80",  wallThicknessMm: 7.01, oD_mm: 73.0 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2 1/2", nominalSizeMm: 73.0, dn: "DN65", schedule: "STD",     wallThicknessMm: 5.16, oD_mm: 73.0 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "2 1/2", nominalSizeMm: 73.0, dn: "DN65", schedule: "XS",      wallThicknessMm: 7.01, oD_mm: 73.0 },
  // 3" DN80
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "SCH 40",  wallThicknessMm: 5.49, oD_mm: 88.9 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "SCH 80",  wallThicknessMm: 7.62, oD_mm: 88.9 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "SCH 160", wallThicknessMm: 11.13, oD_mm: 88.9 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "STD",     wallThicknessMm: 5.49, oD_mm: 88.9 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "XS",      wallThicknessMm: 7.62, oD_mm: 88.9 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "XXS",     wallThicknessMm: 13.48, oD_mm: 88.9 },
  // 4" DN100
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "SCH 40",  wallThicknessMm: 6.02, oD_mm: 114.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "SCH 80",  wallThicknessMm: 8.56, oD_mm: 114.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "SCH 160", wallThicknessMm: 11.13, oD_mm: 114.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "STD",     wallThicknessMm: 6.02, oD_mm: 114.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "XS",      wallThicknessMm: 8.56, oD_mm: 114.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "XXS",     wallThicknessMm: 17.12, oD_mm: 114.3 },
  // 6" DN150
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "SCH 40",  wallThicknessMm: 7.11, oD_mm: 168.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "SCH 80",  wallThicknessMm: 10.97, oD_mm: 168.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "SCH 160", wallThicknessMm: 14.27, oD_mm: 168.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "STD",     wallThicknessMm: 7.11, oD_mm: 168.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "XS",      wallThicknessMm: 10.97, oD_mm: 168.3 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "XXS",     wallThicknessMm: 18.26, oD_mm: 168.3 },
  // 8" DN200
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "SCH 40",  wallThicknessMm: 8.18, oD_mm: 219.1 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "SCH 80",  wallThicknessMm: 12.70, oD_mm: 219.1 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "SCH 160", wallThicknessMm: 18.26, oD_mm: 219.1 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "STD",     wallThicknessMm: 8.18, oD_mm: 219.1 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "XS",      wallThicknessMm: 12.70, oD_mm: 219.1 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "XXS",     wallThicknessMm: 23.01, oD_mm: 219.1 },
  // 10" DN250
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "10",  nominalSizeMm: 273.0, dn: "DN250", schedule: "SCH 40",  wallThicknessMm: 9.27, oD_mm: 273.0 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "10",  nominalSizeMm: 273.0, dn: "DN250", schedule: "SCH 80",  wallThicknessMm: 15.09, oD_mm: 273.0 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "10",  nominalSizeMm: 273.0, dn: "DN250", schedule: "SCH 160", wallThicknessMm: 21.41, oD_mm: 273.0 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "10",  nominalSizeMm: 273.0, dn: "DN250", schedule: "STD",     wallThicknessMm: 9.27, oD_mm: 273.0 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "10",  nominalSizeMm: 273.0, dn: "DN250", schedule: "XS",      wallThicknessMm: 12.70, oD_mm: 273.0 },
  // 12" DN300
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "12",  nominalSizeMm: 323.9, dn: "DN300", schedule: "SCH 40",  wallThicknessMm: 9.52, oD_mm: 323.9 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "12",  nominalSizeMm: 323.9, dn: "DN300", schedule: "SCH 80",  wallThicknessMm: 12.70, oD_mm: 323.9 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "12",  nominalSizeMm: 323.9, dn: "DN300", schedule: "SCH 160", wallThicknessMm: 17.48, oD_mm: 323.9 },
  { standard: "ASME B36.10M", edition: "2018", nominalSizeInch: "12",  nominalSizeMm: 323.9, dn: "DN300", schedule: "STD",     wallThicknessMm: 9.52, oD_mm: 323.9 },
];

// ASME B36.19M (stainless steel) - Sch 5S, 10S, 40S, 80S for common sizes.
export const ASME_B36_19M_SEED: PipeStandardSeed[] = [
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "SCH 5S",  wallThicknessMm: 1.65, oD_mm: 21.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "SCH 10S", wallThicknessMm: 2.11, oD_mm: 21.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "SCH 40S", wallThicknessMm: 2.77, oD_mm: 21.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "1/2", nominalSizeMm: 21.3, dn: "DN15", schedule: "SCH 80S", wallThicknessMm: 3.73, oD_mm: 21.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "3/4", nominalSizeMm: 26.7, dn: "DN20", schedule: "SCH 5S",  wallThicknessMm: 1.65, oD_mm: 26.7 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "3/4", nominalSizeMm: 26.7, dn: "DN20", schedule: "SCH 10S", wallThicknessMm: 2.11, oD_mm: 26.7 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "3/4", nominalSizeMm: 26.7, dn: "DN20", schedule: "SCH 40S", wallThicknessMm: 2.87, oD_mm: 26.7 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "3/4", nominalSizeMm: 26.7, dn: "DN20", schedule: "SCH 80S", wallThicknessMm: 3.91, oD_mm: 26.7 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "SCH 5S",  wallThicknessMm: 1.65, oD_mm: 33.4 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "SCH 10S", wallThicknessMm: 2.11, oD_mm: 33.4 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "SCH 40S", wallThicknessMm: 3.38, oD_mm: 33.4 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "1",   nominalSizeMm: 33.4, dn: "DN25", schedule: "SCH 80S", wallThicknessMm: 4.55, oD_mm: 33.4 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "SCH 5S",  wallThicknessMm: 1.65, oD_mm: 60.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "SCH 10S", wallThicknessMm: 2.11, oD_mm: 60.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "SCH 40S", wallThicknessMm: 3.93, oD_mm: 60.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "2",   nominalSizeMm: 60.3, dn: "DN50", schedule: "SCH 80S", wallThicknessMm: 5.54, oD_mm: 60.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "SCH 5S",  wallThicknessMm: 2.11, oD_mm: 88.9 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "SCH 10S", wallThicknessMm: 2.77, oD_mm: 88.9 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "SCH 40S", wallThicknessMm: 5.49, oD_mm: 88.9 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "3",   nominalSizeMm: 88.9, dn: "DN80", schedule: "SCH 80S", wallThicknessMm: 7.62, oD_mm: 88.9 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "SCH 5S",  wallThicknessMm: 2.11, oD_mm: 114.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "SCH 10S", wallThicknessMm: 2.77, oD_mm: 114.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "SCH 40S", wallThicknessMm: 6.02, oD_mm: 114.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "4",   nominalSizeMm: 114.3, dn: "DN100", schedule: "SCH 80S", wallThicknessMm: 8.56, oD_mm: 114.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "SCH 5S",  wallThicknessMm: 2.77, oD_mm: 168.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "SCH 10S", wallThicknessMm: 3.40, oD_mm: 168.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "SCH 40S", wallThicknessMm: 7.11, oD_mm: 168.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "6",   nominalSizeMm: 168.3, dn: "DN150", schedule: "SCH 80S", wallThicknessMm: 10.97, oD_mm: 168.3 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "SCH 5S",  wallThicknessMm: 2.77, oD_mm: 219.1 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "SCH 10S", wallThicknessMm: 3.76, oD_mm: 219.1 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "SCH 40S", wallThicknessMm: 8.18, oD_mm: 219.1 },
  { standard: "ASME B36.19M", edition: "2018", nominalSizeInch: "8",   nominalSizeMm: 219.1, dn: "DN200", schedule: "SCH 80S", wallThicknessMm: 12.70, oD_mm: 219.1 },
];

// Default component types as required by the spec.
export const COMPONENT_TYPES_SEED = [
  { code: "PIPE",    label: "Pipe",    sortOrder: 0 },
  { code: "ELBOW",   label: "Elbow",   sortOrder: 1 },
  { code: "TEE",     label: "Tee",     sortOrder: 2 },
  { code: "REDUCER", label: "Reducer", sortOrder: 3 },
  { code: "FLANGE",  label: "Flange",  sortOrder: 4 },
  { code: "OTHER",   label: "Other",   sortOrder: 99 },
];

// Coromandel International Limited — publicly listed plant locations.
// Source: company public website / annual report. These are CITY-LEVEL
// location records only — no internal plant-unit names, equipment IDs,
// dimensions, inspection records, or operational status are invented.
// Treat as initial DEMO DATA that an admin can edit.
export const COROMANDEL_LOCATIONS = [
  "Visakhapatnam",
  "Kakinada",
  "Ennore",
  "Ranipet",
  "Thyagavalli",
  "Ankleshwar",
  "Dahej",
  "Sarigam",
  "Nandesari",
  "Jammu",
  "Udaipur",
  "Kota",
  "Nimrani",
  "Hospet/Munirabad",
  "Raebareli",
  "Pali",
];

// Default example pipeline-configuration values per the user's spec.
export const COROMANDEL_DEFAULT_PIPELINE = {
  location: "Chennai",
  plantName: "Ennore Fertilizer Unit",
  pipelineDescription: "2-inch water pipeline, top pipe rack, west side",
  moc: "Carbon Steel",
  applicableStandard: "ASME B36.10M",
  standardEdition: "2018",
};
