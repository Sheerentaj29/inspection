// Server-side PDF generator for the Pipeline Thickness Measurement Report.
// Uses pdfkit (pure JS, no native deps).
//
// Layout requirements (per user spec):
// - A4 landscape, consistent margins
// - Header section with client + plant + pipeline identity
// - Green measurement-table header
// - 11 columns in fixed order
// - Repeat table header on subsequent pages
// - Engineering-style borders
// - Page numbering footer
// - Inspector name + date + approval + revision details

import PDFDocument from "pdfkit";
import type { Writable } from "stream";
import type { PipelineInspection, ThicknessMeasurement, Client, Plant, User } from "@prisma/client";

export interface PdfReportInput {
  report: PipelineInspection & {
    client: Pick<Client, "id" | "name">;
    plant: Pick<Plant, "id" | "name" | "location" | "address">;
    inspector: Pick<User, "id" | "name" | "email">;
    approver: Pick<User, "id" | "name" | "email"> | null;
  };
  measurements: ThicknessMeasurement[];
}

type Doc = PDFDocument.PDFDocument;

const PAGE_W = 841.89; // A4 landscape width in points (297mm)
const PAGE_H = 595.28; // A4 landscape height (210mm)
const MARGIN = 28;
const HEADER_BG = "#3a7d3a"; // green
const HEADER_FG = "#ffffff";

interface Column {
  key: string;
  header: string;
  width: number;
  vertical?: boolean;
}

const COLUMNS: Column[] = [
  { key: "diaInch",      header: "Dia mm\n(inch)",        width: 50 },
  { key: "schedule",     header: "Pipe\nSchedule",       width: 55 },
  { key: "nominal",      header: "Nominal\nThickness\n(mm)", width: 55 },
  { key: "component",    header: "Component\nType",      width: 60 },
  { key: "pointNo",      header: "Point\nNo",             width: 40 },
  { key: "north",        header: "12 o'clock North (mm)",  width: 55, vertical: true },
  { key: "east",         header: "3 o'clock East (mm)",   width: 55, vertical: true },
  { key: "south",        header: "6 o'clock South (mm)",  width: 55, vertical: true },
  { key: "west",         header: "9 o'clock West (mm)",   width: 55, vertical: true },
  { key: "obsMin",       header: "Observed Minimum Thickness (mm)", width: 60, vertical: true },
  { key: "findings",     header: "Findings / Comments",   width: 0 },
];

function calcColumnWidths(): number[] {
  const usable = PAGE_W - 2 * MARGIN;
  let fixed = 0;
  for (const c of COLUMNS) if (c.width > 0) fixed += c.width;
  const findingsW = usable - fixed;
  return COLUMNS.map((c) => (c.width > 0 ? c.width : Math.max(120, findingsW)));
}

export async function generatePipelineReportPdf(input: PdfReportInput, out: Writable): Promise<void> {
  const doc = new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    layout: "landscape",
    info: {
      Title: `Pipeline Thickness Measurement Report ${input.report.reportNumber}`,
      Author: input.report.inspectorName,
      Subject: input.report.pipelineDescription ?? "UT Thickness Measurement",
      Producer: "Inspection Report Automation System",
    },
  });
  doc.pipe(out);

  let pageNo = 0;
  const drawHeaderAndFooter = () => {
    pageNo += 1;
    doc.fontSize(7).fillColor("#666");
    doc.text(
      `Page ${pageNo} | Generated ${new Date().toISOString().slice(0, 19).replace("T", " ")} | Inspection Report Automation System`,
      MARGIN, PAGE_H - 18,
      { width: PAGE_W - 2 * MARGIN, align: "center" },
    );
    doc.fillColor("#000");
  };

  drawHeaderAndFooter();

  // ----- REPORT HEADER BLOCK -----
  const titleY = MARGIN;
  doc.fontSize(13).font("Helvetica-Bold");
  doc.text("PIPELINE THICKNESS MEASUREMENT REPORT", MARGIN, titleY, {
    width: PAGE_W - 2 * MARGIN, align: "center",
  });
  doc.font("Helvetica").fontSize(8);
  doc.text(
    `Report No: ${input.report.reportNumber}    |    Rev: ${input.report.revisionNumber}    |    Date: ${input.report.inspectionDate.toISOString().slice(0, 10)}`,
    MARGIN, titleY + 18, { width: PAGE_W - 2 * MARGIN, align: "center" },
  );

  // Logo placeholders
  doc.rect(MARGIN, titleY + 36, 110, 36).stroke();
  doc.fontSize(7).fillColor("#666");
  doc.text("SERVICE COMPANY\nLOGO", MARGIN, titleY + 48, { width: 110, align: "center" });
  doc.rect(PAGE_W - MARGIN - 110, titleY + 36, 110, 36).stroke();
  const clientShort = input.report.client.name.length > 28
    ? input.report.client.name.slice(0, 28)
    : input.report.client.name;
  doc.text(`${clientShort}\nCLIENT LOGO`, PAGE_W - MARGIN - 110, titleY + 48, { width: 110, align: "center" });
  doc.fillColor("#000");

  // Header info grid — two-column key/value pairs
  const infoY = titleY + 80;
  const labelW = 150;
  const valueW = (PAGE_W - 2 * MARGIN - 2 * labelW) / 2;
  const rowH = 14;
  const infoRows: Array<[string, string | null | undefined]> = [
    ["Client", input.report.client.name],
    ["Location", input.report.plant.location],
    ["Plant Name", input.report.plant.name],
    ["Inspection Area", input.report.inspectionArea],
    ["Pipeline Description", input.report.pipelineDescription],
    ["Pipeline Identification No.", input.report.pipelineIdentificationNumber],
    ["Isometric Drawing No.", input.report.isometricDrawingNumber],
    ["Material of Construction (MOC)", input.report.materialOfConstruction],
    ["Applicable Standard", `${input.report.applicableStandard ?? "—"} ${input.report.standardEdition ?? ""}`.trim()],
  ];

  infoRows.forEach((row, idx) => {
    const side = idx % 2;
    const rIdx = Math.floor(idx / 2);
    const x = side === 0 ? MARGIN : MARGIN + labelW + valueW;
    const y = infoY + rIdx * rowH;
    doc.font("Helvetica-Bold").fontSize(8);
    doc.rect(x, y, labelW, rowH).stroke();
    doc.text(row[0], x + 4, y + 3, { width: labelW - 8, align: "left" });
    doc.font("Helvetica").fontSize(8);
    doc.rect(x + labelW, y, side === 0 ? valueW : valueW, rowH).stroke();
    doc.text(row[1] ?? "—", x + labelW + 4, y + 3, { width: valueW - 8, align: "left" });
  });

  // ----- TABLE HEADER -----
  const headerInfoRowsCount = Math.ceil(infoRows.length / 2);
  const tableTop = infoY + headerInfoRowsCount * rowH + 14;

  drawTableHeader(doc, tableTop);

  // ----- TABLE ROWS -----
  let y = tableTop + 36; // header height
  const rowH2 = 28;
  const maxRowY = PAGE_H - MARGIN - 30;

  for (const m of input.measurements) {
    if (y + rowH2 > maxRowY) {
      doc.addPage({ size: [PAGE_W, PAGE_H], layout: "landscape", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
      drawHeaderAndFooter();
      drawTableHeader(doc, MARGIN);
      y = MARGIN + 36;
    }
    drawMeasurementRow(doc, y, m);
    y += rowH2;
  }

  // ----- FINDINGS / COMMENTS SECTION -----
  if (y + 100 > maxRowY) {
    doc.addPage({ size: [PAGE_W, PAGE_H], layout: "landscape", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
    drawHeaderAndFooter();
    y = MARGIN;
  }
  y += 8;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
  doc.text("Findings Summary", MARGIN, y);
  doc.font("Helvetica").fontSize(8);
  doc.text(input.report.findingsSummary ?? "—", MARGIN, y + 14, {
    width: PAGE_W - 2 * MARGIN, align: "left",
  });
  y += 50;

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Comments", MARGIN, y);
  doc.font("Helvetica").fontSize(8);
  doc.text(input.report.comments ?? "—", MARGIN, y + 14, {
    width: PAGE_W - 2 * MARGIN, align: "left",
  });
  y += 50;

  // ----- SIGN-OFF -----
  if (y + 80 > maxRowY) {
    doc.addPage({ size: [PAGE_W, PAGE_H], layout: "landscape", margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } });
    drawHeaderAndFooter();
    y = MARGIN;
  }
  y += 10;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
  doc.text("Sign-off", MARGIN, y);
  y += 18;

  const signW = (PAGE_W - 2 * MARGIN - 2 * 8) / 3;
  const drawSignBlock = (label: string, name: string | null, dateLabel: string, dateVal: string, x: number) => {
    doc.font("Helvetica").fontSize(7).fillColor("#666");
    doc.rect(x, y, signW, 50).stroke("#999");
    doc.text(label, x + 4, y + 4, { width: signW - 8 });
    doc.fillColor("#000");
    doc.font("Helvetica-Bold").fontSize(8);
    doc.text(name ?? "—", x + 4, y + 16, { width: signW - 8 });
    doc.font("Helvetica").fontSize(7).fillColor("#666");
    doc.text(`${dateLabel}: ${dateVal}`, x + 4, y + 36, { width: signW - 8 });
    doc.fillColor("#000");
  };

  drawSignBlock("Inspected by", input.report.inspectorName, "Date", input.report.inspectionDate.toISOString().slice(0, 10), MARGIN);
  drawSignBlock("Reviewed / Approved by", input.report.approver?.name ?? "—", "Date", input.report.approvedAt?.toISOString().slice(0, 10) ?? "—", MARGIN + signW + 8);
  drawSignBlock("Revision", `Rev ${input.report.revisionNumber}`, "Status", input.report.status, MARGIN + 2 * (signW + 8));

  // Override note (if any)
  if (input.report.overrideReason) {
    y += 60;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#a00");
    doc.text("OVERRIDE APPLIED (recorded):", MARGIN, y, { width: 200 });
    doc.font("Helvetica").fillColor("#000").fontSize(7);
    doc.text(input.report.overrideReason, MARGIN + 140, y, { width: PAGE_W - 2 * MARGIN - 140 });
  }

  doc.end();
}

// ---------- HELPERS ----------

function drawTableHeader(doc: Doc, y: number) {
  const colWidths = calcColumnWidths();
  const usable = PAGE_W - 2 * MARGIN;
  doc.rect(MARGIN, y, usable, 36).fill(HEADER_BG).fillColor(HEADER_FG);
  let x = MARGIN;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(HEADER_FG);
  for (let i = 0; i < COLUMNS.length; i++) {
    const c = COLUMNS[i];
    const w = colWidths[i];
    if (c.vertical) {
      const lines = c.header.split("\n");
      const joined = lines.join(" ");
      doc.save();
      doc.translate(x + w / 2 + 3, y + 32);
      doc.rotate(-90);
      doc.text(joined, 0, 0, { width: 30, align: "left" });
      doc.restore();
    } else {
      const lines = c.header.split("\n");
      let ly = y + 4;
      for (const ln of lines) {
        doc.text(ln, x + 3, ly, { width: w - 6, align: "center" });
        ly += 9;
      }
    }
    doc.rect(x, y, w, 36).stroke("#1b4d1b");
    x += w;
  }
  doc.fillColor("#000");
}

function drawMeasurementRow(doc: Doc, y: number, m: ThicknessMeasurement) {
  const colWidths = calcColumnWidths();
  const rowH = 28;
  const usable = PAGE_W - 2 * MARGIN;
  doc.rect(MARGIN, y, usable, rowH).stroke("#999");

  let x = MARGIN;
  const cellPad = 3;
  doc.font("Helvetica").fontSize(8).fillColor("#000");

  const cells = [
    { text: m.pipeSizeInch, align: "center" as const },
    { text: m.pipeSchedule, align: "center" as const },
    { text: m.nominalThicknessMm !== null ? m.nominalThicknessMm.toFixed(2) : "—", align: "center" as const },
    { text: m.componentTypeCode, align: "center" as const },
    { text: m.pointNo, align: "center" as const },
    { text: formatMeasurement(m.northMm, m.northStatus), align: "center" as const },
    { text: formatMeasurement(m.eastMm, m.eastStatus), align: "center" as const },
    { text: formatMeasurement(m.southMm, m.southStatus), align: "center" as const },
    { text: formatMeasurement(m.westMm, m.westStatus), align: "center" as const },
    { text: m.observedMinimumMm !== null ? m.observedMinimumMm.toFixed(2) : "—", align: "center" as const },
    { text: m.findingsComments ?? "", align: "left" as const },
  ];

  for (let i = 0; i < cells.length; i++) {
    const w = colWidths[i];
    const cell = cells[i];
    doc.rect(x, y, w, rowH).stroke("#bbb");
    const maxW = w - 2 * cellPad;
    const wrapped = doc.widthOfString(cell.text) > maxW
      ? cell.text.slice(0, Math.floor((maxW / doc.widthOfString(cell.text)) * cell.text.length)) + "…"
      : cell.text;
    doc.text(wrapped, x + cellPad, y + 9, { width: maxW, align: cell.align });
    x += w;
  }
}

function formatMeasurement(value: number | null, status: string): string {
  if (status === "NotApplicable") return "N/A";
  if (status === "NotMeasured" || value === null || value === undefined) return "—";
  return value.toFixed(2);
}
