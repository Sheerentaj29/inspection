"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Download,
  Loader2,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  User as UserIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

interface FullReport {
  id: string;
  reportNumber: string;
  clientId: string;
  plantId: string;
  inspectionArea: string | null;
  pipelineDescription: string | null;
  pipelineIdentificationNumber: string | null;
  isometricDrawingNumber: string | null;
  materialOfConstruction: string | null;
  applicableStandard: string | null;
  standardEdition: string | null;
  inspectionDate: string;
  status: "Draft" | "Submitted" | "Approved" | "Rejected" | "Superseded";
  revisionNumber: number;
  inspectorId: string;
  inspectorName: string;
  findingsSummary: string | null;
  comments: string | null;
  overrideReason: string | null;
  overrideAppliedAt: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string };
  plant: { id: string; name: string; location: string | null; address: string | null };
  inspector: { id: string; name: string; email: string };
  approver: { id: string; name: string; email: string } | null;
  measurements: Array<{
    id: string;
    pointNo: string;
    sortOrder: number;
    pipeSizeInch: string;
    pipeSchedule: string;
    nominalThicknessMm: number | null;
    componentTypeCode: string;
    componentType?: { code: string; label: string } | null;
    northMm: number | null; northStatus: string;
    eastMm: number | null; eastStatus: string;
    southMm: number | null; southStatus: string;
    westMm: number | null; westStatus: string;
    observedMinimumMm: number | null;
    findingsComments: string | null;
    standard?: {
      standard: string; edition: string; nominalSizeInch: string;
      schedule: string; wallThicknessMm: number; isVerified: boolean;
    } | null;
  }>;
  revisions: Array<{
    id: string; revisionNumber: number; revisionDate: string;
    revisedByName: string | null; changeDescription: string | null;
  }>;
}

function fmtMeasurement(v: number | null, status: string): string {
  if (status === "NotApplicable") return "N/A";
  if (status === "NotMeasured" || v === null || v === undefined) return "—";
  return v.toFixed(2);
}

export function PipelineReportDetailView() {
  const {
    user,
    selectedPipelineReportId,
    setView,
    openEditPipelineReport,
    refresh,
    refreshKey,
  } = useAppStore();
  const canEdit = user?.role === "ADMIN" || user?.role === "INSPECTOR";
  const canApprove = user?.role === "ADMIN" || user?.role === "APPROVER";

  const [report, setReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const load = useCallback(() => {
    if (!selectedPipelineReportId) return;
    setLoading(true);
    apiFetch<FullReport>(`/api/pipeline-inspections/${selectedPipelineReportId}`)
      .then((r) => setReport(r))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedPipelineReportId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  function downloadPdf() {
    if (!report) return;
    window.open(`/api/pipeline-inspections/${report.id}/pdf`, "_blank");
  }

  async function approve() {
    if (!report) return;
    setApproving(true);
    try {
      await apiFetch(`/api/pipeline-inspections/${report.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ approvalNotes }),
      });
      toast.success("Report approved");
      setApprovalNotes("");
      refresh();
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Approval failed");
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading report...
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  if (!report) {
    return <p className="p-8 text-muted-foreground">No report selected.</p>;
  }

  const allVerified = report.measurements.every(
    (m) => m.standard?.isVerified || m.standard === null,
  );

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setView("pipeline-reports")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadPdf}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          {canEdit && report.status !== "Approved" && (
            <Button size="sm" onClick={() => openEditPipelineReport(report.id)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Verification banner */}
      {!allVerified && (
        <Alert className="border-amber-300 bg-amber-50">
          <ShieldAlert className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">Reference data not yet verified</AlertTitle>
          <AlertDescription className="text-amber-900">
            One or more nominal wall thickness values reference unverified ASME
            standard data. An administrator must verify them against the licensed
            ASME standard edition before this report can be used for production
            inspection decisions.
          </AlertDescription>
        </Alert>
      )}

      {/* ---------- PRINTABLE REPORT ---------- */}
      <div className="rounded-md border border-zinc-400 bg-white p-8 print:shadow-none print:border-0" style={{ minHeight: "210mm" }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-center text-lg font-bold tracking-tight">
            PIPELINE THICKNESS MEASUREMENT REPORT
          </h1>
          <p className="text-center text-xs text-zinc-700">
            Report No: <span className="font-mono">{report.reportNumber}</span>
            {"    |    "}Rev: {report.revisionNumber}
            {"    |    "}Date: {new Date(report.inspectionDate).toISOString().slice(0, 10)}
          </p>
        </div>

        {/* Logo placeholders */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-14 w-28 items-center justify-center border border-zinc-400 text-[10px] text-zinc-500">
            SERVICE COMPANY<br />LOGO
          </div>
          <div className="flex h-14 w-28 items-center justify-center border border-zinc-400 text-[10px] text-zinc-500 text-center">
            {report.client.name.slice(0, 24)}<br />CLIENT LOGO
          </div>
        </div>

        {/* Header info grid */}
        <div className="mb-4 grid grid-cols-2 gap-0 border border-zinc-500 text-xs">
          {[
            ["Client", report.client.name],
            ["Location", report.plant.location ?? "—"],
            ["Plant Name", report.plant.name],
            ["Inspection Area", report.inspectionArea ?? "—"],
            ["Pipeline Description", report.pipelineDescription ?? "—"],
            ["Pipeline Identification No.", report.pipelineIdentificationNumber ?? "—"],
            ["Isometric Drawing No.", report.isometricDrawingNumber ?? "—"],
            ["Material of Construction (MOC)", report.materialOfConstruction ?? "—"],
            ["Applicable Standard", `${report.applicableStandard ?? "—"} ${report.standardEdition ?? ""}`.trim()],
            ["Status", report.status],
          ].map(([label, value], idx) => (
            <div key={idx} className={`flex border-b border-r border-zinc-300 ${idx % 2 === 1 ? "border-r-0" : ""} ${idx >= 8 ? "border-b-0" : ""}`}>
              <div className="w-1/2 bg-zinc-100 px-2 py-1 font-semibold border-r border-zinc-300">{label}</div>
              <div className="flex-1 px-2 py-1">{value}</div>
            </div>
          ))}
        </div>

        {/* Measurement table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-emerald-800 text-white">
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 50 }}>Dia mm<br />(inch)</th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 55 }}>Pipe<br />Schedule</th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 55 }}>Nominal<br />Thickness<br />(mm)</th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 60 }}>Component<br />Type</th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 45 }}>Point<br />No</th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 65 }}>
                  <div className="flex flex-col items-center">
                    <span>12 o'clock</span><span>North</span><span>(mm)</span>
                  </div>
                </th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 65 }}>
                  <div className="flex flex-col items-center">
                    <span>3 o'clock</span><span>East</span><span>(mm)</span>
                  </div>
                </th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 65 }}>
                  <div className="flex flex-col items-center">
                    <span>6 o'clock</span><span>South</span><span>(mm)</span>
                  </div>
                </th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 65 }}>
                  <div className="flex flex-col items-center">
                    <span>9 o'clock</span><span>West</span><span>(mm)</span>
                  </div>
                </th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 70 }}>
                  <div className="flex flex-col items-center">
                    <span>Observed</span><span>Minimum</span><span>Thickness (mm)</span>
                  </div>
                </th>
                <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 200 }}>Findings / Comments</th>
              </tr>
            </thead>
            <tbody>
              {report.measurements.length === 0 && (
                <tr>
                  <td colSpan={11} className="border border-zinc-400 text-center py-4 text-zinc-500">
                    No measurement rows recorded.
                  </td>
                </tr>
              )}
              {report.measurements.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="border border-zinc-400 px-2 py-1 text-center font-mono">{m.pipeSizeInch}</td>
                  <td className="border border-zinc-400 px-2 py-1 text-center font-mono">{m.pipeSchedule}</td>
                  <td className="border border-zinc-400 px-2 py-1 text-center tabular-nums">
                    {m.nominalThicknessMm !== null ? m.nominalThicknessMm.toFixed(2) : "—"}
                    {m.standard && !m.standard.isVerified && (
                      <span className="ml-1 text-[9px] text-amber-700" title="Reference data not yet verified">
                        (unv)
                      </span>
                    )}
                  </td>
                  <td className="border border-zinc-400 px-2 py-1 text-center">
                    {m.componentType?.label ?? m.componentTypeCode}
                  </td>
                  <td className="border border-zinc-400 px-2 py-1 text-center font-mono">{m.pointNo}</td>
                  <td className="border border-zinc-400 px-2 py-1 text-center tabular-nums">{fmtMeasurement(m.northMm, m.northStatus)}</td>
                  <td className="border border-zinc-400 px-2 py-1 text-center tabular-nums">{fmtMeasurement(m.eastMm, m.eastStatus)}</td>
                  <td className="border border-zinc-400 px-2 py-1 text-center tabular-nums">{fmtMeasurement(m.southMm, m.southStatus)}</td>
                  <td className="border border-zinc-400 px-2 py-1 text-center tabular-nums">{fmtMeasurement(m.westMm, m.westStatus)}</td>
                  <td className="border border-zinc-400 px-2 py-1 text-center font-semibold tabular-nums bg-emerald-50">
                    {m.observedMinimumMm !== null ? m.observedMinimumMm.toFixed(2) : "—"}
                  </td>
                  <td className="border border-zinc-400 px-2 py-1 text-left whitespace-pre-wrap">{m.findingsComments ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Findings + Comments */}
        <div className="mt-4 space-y-3">
          <div>
            <h3 className="text-xs font-bold uppercase text-zinc-700">Findings Summary</h3>
            <p className="mt-1 text-xs whitespace-pre-wrap">{report.findingsSummary ?? "—"}</p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-zinc-700">Comments</h3>
            <p className="mt-1 text-xs whitespace-pre-wrap">{report.comments ?? "—"}</p>
          </div>
        </div>

        {/* Sign-off */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { label: "Inspected by", name: report.inspectorName, date: new Date(report.inspectionDate).toISOString().slice(0, 10) },
            { label: "Reviewed / Approved by", name: report.approver?.name ?? "—", date: report.approvedAt?.slice(0, 10) ?? "—" },
            { label: "Revision", name: `Rev ${report.revisionNumber}`, date: report.status },
          ].map((b, i) => (
            <div key={i} className="border border-zinc-400 p-2 text-xs">
              <div className="text-[10px] text-zinc-500">{b.label}</div>
              <div className="mt-2 font-bold">{b.name}</div>
              <div className="mt-3 text-[10px] text-zinc-500">Date / Status: {b.date}</div>
            </div>
          ))}
        </div>

        {/* Override note */}
        {report.overrideReason && (
          <div className="mt-4 rounded-md border border-red-400 bg-red-50 p-2 text-xs text-red-900">
            <strong>Override applied (recorded):</strong> {report.overrideReason}
            <div className="mt-1 text-[10px]">
              Applied at {report.overrideAppliedAt ? new Date(report.overrideAppliedAt).toLocaleString() : "—"} by an authorized administrator.
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 border-t border-zinc-300 pt-2 text-center text-[10px] text-zinc-500">
          Page 1 | Generated {new Date().toISOString().slice(0, 19).replace("T", " ")} | Inspection Report Automation System
        </div>
      </div>

      {/* ---------- APPROVAL BLOCK (only for non-approved reports) ---------- */}
      {report.status !== "Approved" && canApprove && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold">Approve this report</h3>
            <p className="text-xs text-muted-foreground">
              Approval generates a revision snapshot and locks the report from
              further inspector edits. To modify an approved report, an
              administrator must use the revision flow.
            </p>
            <textarea
              className="w-full rounded-md border border-zinc-300 p-2 text-sm"
              rows={2}
              placeholder="Approval notes (optional)"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={approve} disabled={approving}>
                {approving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" /> Approve Report
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---------- REVISION HISTORY ---------- */}
      {report.revisions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 text-sm font-bold">Revision History</h3>
            <div className="divide-y">
              {report.revisions.map((r) => (
                <div key={r.id} className="py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">Rev {r.revisionNumber}</Badge>
                    <span className="text-muted-foreground">{new Date(r.revisionDate).toLocaleString()}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{r.revisedByName ?? "—"}</span>
                  </div>
                  {r.changeDescription && (
                    <p className="mt-1">{r.changeDescription}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Reference standard verification:</strong> All nominal wall
            thickness values are sourced from publicly published ASME B36.10M /
            B36.19M reference tables. The applicable standard and edition shown
            in the header are configurable. An authorized administrator must
            verify each standard row against the licensed / official ASME
            edition before using the report for production inspection
            decisions. The Observed Minimum column shows the smallest valid
            measured value at each point — it is a measurement, not a
            pass / fail decision; the engineering acceptance criteria must be
            applied separately by the responsible engineer.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
