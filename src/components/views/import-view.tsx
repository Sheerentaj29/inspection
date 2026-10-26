"use client";

import { useState, useCallback } from "react";
import {
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface PreviewRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
  clientMatch?: { id: string; name: string };
  plantMatch?: { id: string; name: string };
}

interface PreviewResponse {
  rows: PreviewRow[];
  total: number;
  valid: number;
  invalid: number;
}

interface CommitResponse {
  created: number;
  skipped: number;
  failures: Array<{ row: number; error: string }>;
}

export function ImportView() {
  const { user, refresh, setView } = useAppStore();
  const isAdmin = user?.role === "ADMIN";

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState<CommitResponse | null>(null);

  const onPreview = useCallback(async () => {
    if (!file) {
      toast.error("Choose a CSV file first");
      return;
    }
    setPreviewing(true);
    setCommitted(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import-export/preview", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Preview failed");
      }
      const r = (await res.json()) as PreviewResponse;
      setPreview(r);
      toast.message(
        `Parsed ${r.total} rows: ${r.valid} valid, ${r.invalid} with errors`,
      );
    } catch (e) {
      const err = e as Error;
      toast.error(err.message);
    } finally {
      setPreviewing(false);
    }
  }, [file]);

  const onCommit = useCallback(async () => {
    if (!preview) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/import-export/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows }),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Commit failed");
      }
      const r = (await res.json()) as CommitResponse;
      setCommitted(r);
      toast.success(`Imported ${r.created} records`);
      refresh();
    } catch (e) {
      const err = e as Error;
      toast.error(err.message);
    } finally {
      setCommitting(false);
    }
  }, [preview, refresh]);

  function downloadTemplate() {
    window.open("/api/import-export/template", "_blank");
  }

  function exportAll() {
    window.location.href = "/api/import-export/export";
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access required</CardTitle>
          <CardDescription>
            Only administrators can import or export equipment records.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CSV Import / Export</h1>
        <p className="text-sm text-muted-foreground">
          Bulk import or export equipment records via CSV. All rows are previewed
          and validated before being committed.
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Download Template</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              CSV with the correct headers and one labelled sample row.
              Replace the sample with your real data before importing.
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-1 self-start">
              <Download className="mr-2 h-4 w-4" /> Template CSV
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Export All Equipment</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Downloads every registered equipment record as CSV. Includes the
              client and plant names so the file is round-trippable on import.
            </p>
            <Button variant="outline" size="sm" onClick={exportAll} className="mt-1 self-start">
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Import Equipment</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a CSV below. Rows are validated against the equipment
              catalog and existing client/plant records. Only rows without
              errors will be committed.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload + Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload &amp; Preview</CardTitle>
          <CardDescription>
            Step 1 — select a file. Step 2 — preview rows. Step 3 — commit
            valid rows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px] space-y-1">
              <label className="text-xs text-muted-foreground">CSV file</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setPreview(null);
                  setCommitted(null);
                }}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-white hover:file:bg-zinc-800 file:cursor-pointer"
              />
            </div>
            <Button onClick={onPreview} disabled={!file || previewing}>
              {previewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parsing...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" /> Preview Rows
                </>
              )}
            </Button>
          </div>

          {preview && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Preview ready</AlertTitle>
                <AlertDescription>
                  Parsed <strong>{preview.total}</strong> rows.{" "}
                  <span className="text-emerald-700 font-semibold">{preview.valid}</span> valid,{" "}
                  <span className="text-amber-700 font-semibold">{preview.invalid}</span> with errors.
                </AlertDescription>
              </Alert>

              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-2 text-left">Row</th>
                      <th className="px-2 py-2 text-left">Equipment ID</th>
                      <th className="px-2 py-2 text-left">Name</th>
                      <th className="px-2 py-2 text-left">Type</th>
                      <th className="px-2 py-2 text-left">Client / Plant</th>
                      <th className="px-2 py-2 text-left">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => {
                      const hasErrs = r.errors.length > 0;
                      return (
                        <tr
                          key={r.rowNumber}
                          className={hasErrs ? "bg-red-50" : r.warnings.length ? "bg-amber-50" : ""}
                        >
                          <td className="px-2 py-1.5">{r.rowNumber}</td>
                          <td className="px-2 py-1.5 font-mono">{r.data.equipmentId}</td>
                          <td className="px-2 py-1.5 max-w-[220px] truncate">{r.data.name}</td>
                          <td className="px-2 py-1.5">{r.data.type}</td>
                          <td className="px-2 py-1.5">
                            {r.clientMatch ? r.clientMatch.name : r.data.clientName ?? "—"}
                            <span className="text-muted-foreground"> / </span>
                            {r.plantMatch ? r.plantMatch.name : r.data.plantName ?? "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {r.errors.length === 0 && r.warnings.length === 0 && (
                              <Badge variant="outline" className="border-emerald-500 text-emerald-700">OK</Badge>
                            )}
                            {r.errors.map((e, i) => (
                              <div key={`e${i}`} className="text-red-700 flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 mt-0.5" /> {e}
                              </div>
                            ))}
                            {r.warnings.map((w, i) => (
                              <div key={`w${i}`} className="text-amber-700 flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 mt-0.5" /> {w}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={onCommit}
                  disabled={committing || preview.valid === 0}
                >
                  {committing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Committing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" /> Commit {preview.valid} Valid Rows
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPreview(null);
                    setFile(null);
                    setCommitted(null);
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          )}

          {committed && (
            <Alert variant={committed.failures.length === 0 ? "default" : "destructive"}>
              <AlertTitle>Import complete</AlertTitle>
              <AlertDescription>
                Created <strong>{committed.created}</strong> records. Skipped{" "}
                {committed.skipped} rows ({committed.failures.length} failed).
                {committed.failures.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs">
                    {committed.failures.slice(0, 10).map((f, i) => (
                      <li key={i}>Row {f.row}: {f.error}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Format reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV Format</CardTitle>
          <CardDescription>
            The header row is required. Unknown columns are ignored; missing
            columns are tolerated but flagged per row.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-2 text-left">Column</th>
                  <th className="px-2 py-2 text-left">Required</th>
                  <th className="px-2 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["equipmentId", "yes", "Must be unique within the client"],
                  ["name", "yes", "Human-readable equipment name"],
                  ["category", "yes", "STORAGE / PRESSURE / SEPARATION / UTILITY / PIPE / VALVE / PUMP / OTHER"],
                  ["type", "yes", "Must belong to the listed category"],
                  ["orientation", "no", "Horizontal / Vertical / Inclined / Not Applicable"],
                  ["diameter, height, length, width", "no", "Millimetres (mm)"],
                  ["capacity", "no", "Cubic metres (m³)"],
                  ["wallThickness", "no", "Millimetres (mm)"],
                  ["nominalDiameter, outsideDiameter", "no", "Pipe DN / OD in mm"],
                  ["tubeLength, shellDiameter", "no", "Heat-exchanger fields in mm"],
                  ["material, manufacturer, serialNumber", "no", "Free text"],
                  ["clientName, plantName", "yes", "Must match an existing client/plant"],
                  ["tagNumber", "no", "Plant tag / equipment number"],
                  ["dimensionSource", "no", "Approved Engineering Drawing / Manufacturer Drawing / Nameplate / Field Measurement"],
                  ["verificationStatus", "no", "Verified / Unverified (defaults to Unverified)"],
                ].map(([col, req, note]) => (
                  <tr key={col} className="border-t">
                    <td className="px-2 py-1.5 font-mono">{col}</td>
                    <td className="px-2 py-1.5">{req}</td>
                    <td className="px-2 py-1.5">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
