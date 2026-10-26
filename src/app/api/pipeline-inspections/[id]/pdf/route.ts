// GET  /api/pipeline-inspections/[id]/pdf - generate and stream the PDF.
// POST /api/pipeline-inspections/[id]/pdf - regenerate and persist PDF.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { generatePipelineReportPdf } from "@/lib/pdf/pipeline-report";
import { Writable } from "stream";

class BufferWritable extends Writable {
  chunks: Buffer[] = [];
  _write(chunk: Buffer, _enc: BufferEncoding, cb: (err?: Error | null) => void) {
    this.chunks.push(chunk);
    cb();
  }
  toBuffer(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const report = await db.pipelineInspection.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      plant: { select: { id: true, name: true, location: true, address: true } },
      inspector: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
      measurements: {
        orderBy: { sortOrder: "asc" },
        include: {
          componentType: { select: { id: true, code: true, label: true } },
          standard: { select: { id: true, standard: true, edition: true, nominalSizeInch: true, schedule: true, wallThicknessMm: true, isVerified: true } },
        },
      },
    },
  });
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const writable = new BufferWritable();
  await new Promise<void>((resolve, reject) => {
    writable.on("finish", () => resolve());
    writable.on("error", reject);
    void generatePipelineReportPdf({ report, measurements: report.measurements as never }, writable);
  });

  const buf = writable.toBuffer();
  await recordAudit({
    userId: session.id, userName: session.name,
    action: "EXPORT", entity: "PipelineInspection", entityId: report.id,
    details: `Downloaded PDF for ${report.reportNumber} (${buf.length} bytes)`,
  });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${report.reportNumber}.pdf"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
