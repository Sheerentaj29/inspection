"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

// ---------- TYPES ----------

interface ClientItem {
  id: string;
  name: string;
  plants: Array<{ id: string; name: string; location: string | null }>;
}

interface ComponentTypeItem {
  id: string;
  code: string;
  label: string;
}

interface PipeStandardItem {
  id: string;
  standard: string;
  edition: string;
  nominalSizeInch: string;
  schedule: string;
  wallThicknessMm: number;
  isVerified: boolean;
}

interface MeasurementRow {
  id?: string;
  pointNo: string;
  sortOrder: number;
  pipeSizeInch: string;
  pipeSchedule: string;
  nominalThicknessMm: number | null;
  standardId: string | null;
  componentTypeCode: string;
  componentTypeId: string | null;
  northMm: string;
  northStatus: "Measured" | "NotMeasured" | "NotApplicable";
  eastMm: string;
  eastStatus: "Measured" | "NotMeasured" | "NotApplicable";
  southMm: string;
  southStatus: "Measured" | "NotMeasured" | "NotApplicable";
  westMm: string;
  westStatus: "Measured" | "NotMeasured" | "NotApplicable";
  observedMinimumMm: number | null;
  findingsComments: string;
  _isNew?: boolean;
}

interface ReportHeader {
  reportNumber: string;
  clientId: string;
  plantId: string;
  inspectionArea: string;
  pipelineDescription: string;
  pipelineIdentificationNumber: string;
  isometricDrawingNumber: string;
  materialOfConstruction: string;
  applicableStandard: string;
  standardEdition: string;
  inspectionDate: string;
  findingsSummary: string;
  comments: string;
}

const EMPTY_HEADER: ReportHeader = {
  reportNumber: "",
  clientId: "",
  plantId: "",
  inspectionArea: "",
  pipelineDescription: "",
  pipelineIdentificationNumber: "",
  isometricDrawingNumber: "",
  materialOfConstruction: "Carbon Steel",
  applicableStandard: "ASME B36.10M",
  standardEdition: "2018",
  inspectionDate: new Date().toISOString().slice(0, 10),
  findingsSummary: "",
  comments: "",
};

const MOC_OPTIONS = [
  "Carbon Steel",
  "Carbon Steel (LTCS)",
  "Stainless Steel SS304",
  "Stainless Steel SS304L",
  "Stainless Steel SS316",
  "Stainless Steel SS316L",
  "Duplex SS",
  "Alloy Steel",
  "Galvanised Steel",
  "Other",
];

const STANDARDS = ["ASME B36.10M", "ASME B36.19M"];
const EDITIONS = ["2018", "2021", "2024"];

const STATUS_OPTIONS: Array<{ value: "Measured" | "NotMeasured" | "NotApplicable"; label: string }> = [
  { value: "Measured", label: "Measured" },
  { value: "NotMeasured", label: "Not measured" },
  { value: "NotApplicable", label: "Not applicable" },
];

export function PipelineReportFormView() {
  const { user, editingPipelineReportId, setView, openPipelineReport, refresh } = useAppStore();
  const isEdit = !!editingPipelineReportId;
  const canEdit = user?.role === "ADMIN" || user?.role === "INSPECTOR";

  const [header, setHeader] = useState<ReportHeader>(EMPTY_HEADER);
  const [rows, setRows] = useState<MeasurementRow[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [componentTypes, setComponentTypes] = useState<ComponentTypeItem[]>([]);
  const [standards, setStandards] = useState<PipeStandardItem[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportStatus, setReportStatus] = useState<"Draft" | "Submitted" | "Approved" | "Rejected">("Draft");

  // ---------- INITIAL LOADS ----------
  useEffect(() => {
    apiFetch<{ items: ClientItem[] }>("/api/clients")
      .then((r) => {
        setClients(r.items);
        // Default to Coromandel + Ennore when creating new report
        if (!isEdit) {
          const coromandel = r.items.find((c) => c.name.includes("COROMANDEL"));
          if (coromandel) {
            const ennore = coromandel.plants.find((p) => p.name.includes("Ennore"));
            setHeader((h) => ({
              ...h,
              clientId: coromandel.id,
              plantId: ennore?.id ?? "",
              pipelineDescription: "2-inch water pipeline, top pipe rack, west side",
              materialOfConstruction: "Carbon Steel",
              applicableStandard: "ASME B36.10M",
              standardEdition: "2018",
            }));
          }
        }
      })
      .catch(() => toast.error("Failed to load clients"));
    apiFetch<{ items: ComponentTypeItem[] }>("/api/component-types")
      .then((r) => setComponentTypes(r.items))
      .catch(() => toast.error("Failed to load component types"));
    apiFetch<{ items: PipeStandardItem[] }>("/api/pipe-standards")
      .then((r) => setStandards(r.items))
      .catch(() => toast.error("Failed to load pipe standards"));
  }, [isEdit]);

  // ---------- EDIT LOAD ----------
  useEffect(() => {
    if (!editingPipelineReportId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch<any>(`/api/pipeline-inspections/${editingPipelineReportId}`)
      .then((r) => {
        setHeader({
          reportNumber: r.reportNumber,
          clientId: r.clientId,
          plantId: r.plantId,
          inspectionArea: r.inspectionArea ?? "",
          pipelineDescription: r.pipelineDescription ?? "",
          pipelineIdentificationNumber: r.pipelineIdentificationNumber ?? "",
          isometricDrawingNumber: r.isometricDrawingNumber ?? "",
          materialOfConstruction: r.materialOfConstruction ?? "Carbon Steel",
          applicableStandard: r.applicableStandard ?? "ASME B36.10M",
          standardEdition: r.standardEdition ?? "2018",
          inspectionDate: r.inspectionDate.slice(0, 10),
          findingsSummary: r.findingsSummary ?? "",
          comments: r.comments ?? "",
        });
        setReportStatus(r.status);
        setRows(
          r.measurements.map((m: any) => ({
            id: m.id,
            pointNo: m.pointNo,
            sortOrder: m.sortOrder,
            pipeSizeInch: m.pipeSizeInch,
            pipeSchedule: m.pipeSchedule,
            nominalThicknessMm: m.nominalThicknessMm,
            standardId: m.standardId,
            componentTypeCode: m.componentTypeCode,
            componentTypeId: m.componentTypeId,
            northMm: m.northMm?.toString() ?? "",
            northStatus: m.northStatus,
            eastMm: m.eastMm?.toString() ?? "",
            eastStatus: m.eastStatus,
            southMm: m.southMm?.toString() ?? "",
            southStatus: m.southStatus,
            westMm: m.westMm?.toString() ?? "",
            westStatus: m.westStatus,
            observedMinimumMm: m.observedMinimumMm,
            findingsComments: m.findingsComments ?? "",
          })),
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [editingPipelineReportId]);

  // ---------- DERIVED DATA ----------
  const plantsForClient = clients.find((c) => c.id === header.clientId)?.plants ?? [];

  // Sizes and schedules available from the standards reference table.
  // Used to populate the dropdowns for the first two fixed columns.
  const sizes = Array.from(new Set(standards.map((s) => s.nominalSizeInch))).sort(naturalCompare);
  const schedulesForSize = Array.from(
    new Set(
      standards
        .filter((s) => s.nominalSizeInch === (header.applicableStandard ? "" : ""))
        .map((s) => s.schedule),
    ),
  ).sort();

  function naturalCompare(a: string, b: string): number {
    const na = a.split(/[\s/]+/).map((x) => parseFloat(x));
    const nb = b.split(/[\s/]+/).map((x) => parseFloat(x));
    for (let i = 0; i < Math.max(na.length, nb.length); i++) {
      const va = na[i] ?? 0;
      const vb = nb[i] ?? 0;
      if (va !== vb) return va - vb;
    }
    return 0;
  }

  function schedulesForRow(sizeInch: string): string[] {
    return Array.from(
      new Set(
        standards
          .filter((s) => s.nominalSizeInch === sizeInch)
          .map((s) => s.schedule),
      ),
    ).sort();
  }

  // ---------- HEADER FIELD UPDATES ----------
  function updateHeader<K extends keyof ReportHeader>(k: K, v: ReportHeader[K]) {
    setHeader((h) => ({ ...h, [k]: v }));
  }

  function onClientChange(clientId: string) {
    const c = clients.find((cl) => cl.id === clientId);
    setHeader((h) => ({
      ...h,
      clientId,
      plantId: c?.plants[0]?.id ?? "",
    }));
  }

  // ---------- ROW OPERATIONS ----------
  function addRow() {
    setRows((r) => [
      ...r,
      {
        pointNo: `P-${r.length + 1}`,
        sortOrder: r.length,
        pipeSizeInch: "2",
        pipeSchedule: "SCH 40",
        nominalThicknessMm: lookupNominal("2", "SCH 40"),
        standardId: lookupStandardId("2", "SCH 40"),
        componentTypeCode: "PIPE",
        componentTypeId: componentTypes.find((c) => c.code === "PIPE")?.id ?? null,
        northMm: "", northStatus: "NotMeasured",
        eastMm: "", eastStatus: "NotMeasured",
        southMm: "", southStatus: "NotMeasured",
        westMm: "", westStatus: "NotMeasured",
        observedMinimumMm: null,
        findingsComments: "",
        _isNew: true,
      },
    ]);
  }

  function lookupNominal(sizeInch: string, schedule: string): number | null {
    const match = standards.find(
      (s) =>
        s.nominalSizeInch === sizeInch &&
        s.schedule === schedule &&
        (header.applicableStandard ? s.standard === header.applicableStandard : true) &&
        (header.standardEdition ? s.edition === header.standardEdition : true),
    ) ?? standards.find((s) => s.nominalSizeInch === sizeInch && s.schedule === schedule);
    return match?.wallThicknessMm ?? null;
  }

  function lookupStandardId(sizeInch: string, schedule: string): string | null {
    const match = standards.find(
      (s) =>
        s.nominalSizeInch === sizeInch &&
        s.schedule === schedule &&
        (header.applicableStandard ? s.standard === header.applicableStandard : true) &&
        (header.standardEdition ? s.edition === header.standardEdition : true),
    ) ?? standards.find((s) => s.nominalSizeInch === sizeInch && s.schedule === schedule);
    return match?.id ?? null;
  }

  function updateRow(idx: number, patch: Partial<MeasurementRow>) {
    setRows((rs) => {
      const next = [...rs];
      const cur = { ...next[idx], ...patch };

      // If pipeSizeInch or pipeSchedule changed, recompute nominal thickness
      if (patch.pipeSizeInch !== undefined || patch.pipeSchedule !== undefined) {
        cur.nominalThicknessMm = lookupNominal(cur.pipeSizeInch, cur.pipeSchedule);
        cur.standardId = lookupStandardId(cur.pipeSizeInch, cur.pipeSchedule);
      }

      // Recompute observed minimum (excluding NotMeasured, NotApplicable, and missing)
      const meas: number[] = [];
      if (cur.northStatus === "Measured" && cur.northMm) {
        const v = parseFloat(cur.northMm); if (!Number.isNaN(v)) meas.push(v);
      }
      if (cur.eastStatus === "Measured" && cur.eastMm) {
        const v = parseFloat(cur.eastMm); if (!Number.isNaN(v)) meas.push(v);
      }
      if (cur.southStatus === "Measured" && cur.southMm) {
        const v = parseFloat(cur.southMm); if (!Number.isNaN(v)) meas.push(v);
      }
      if (cur.westStatus === "Measured" && cur.westMm) {
        const v = parseFloat(cur.westMm); if (!Number.isNaN(v)) meas.push(v);
      }
      cur.observedMinimumMm = meas.length > 0 ? Math.min(...meas) : null;

      next[idx] = cur;
      return next;
    });
  }

  function deleteRow(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sortOrder: i })));
  }

  function moveRow(idx: number, dir: -1 | 1) {
    setRows((rs) => {
      const target = idx + dir;
      if (target < 0 || target >= rs.length) return rs;
      const next = [...rs];
      const tmp = next[idx];
      next[idx] = next[target];
      next[target] = tmp;
      // Re-number sortOrder
      return next.map((r, i) => ({ ...r, sortOrder: i }));
    });
  }

  // ---------- SAVE ----------
  async function saveHeader() {
    setError(null);
    if (!header.reportNumber.trim()) {
      setError("Report number is required");
      return;
    }
    if (!header.clientId || !header.plantId) {
      setError("Client and Plant are required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && editingPipelineReportId) {
        await apiFetch(`/api/pipeline-inspections/${editingPipelineReportId}`, {
          method: "PUT",
          body: JSON.stringify(header),
        });
        toast.success("Header saved");
      } else {
        const created = await apiFetch<{ id: string; reportNumber: string }>(
          "/api/pipeline-inspections",
          { method: "POST", body: JSON.stringify(header) },
        );
        toast.success(`Created ${created.reportNumber}`);
        refresh();
        openPipelineReport(created.id);
        // After navigation, switch to edit mode by directly going to form
        // (we re-use the editingPipelineReportId state via openPipelineReport path)
      }
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "Save failed");
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveRow(idx: number) {
    const row = rows[idx];
    if (!row) return;
    if (!editingPipelineReportId) {
      toast.error("Save the report header first");
      return;
    }
    if (!row.pipeSizeInch || !row.pipeSchedule) {
      toast.error("Pipe size and schedule are required");
      return;
    }
    if (row.nominalThicknessMm === null) {
      toast.error(
        `Unsupported combination: ${row.pipeSizeInch}" ${row.pipeSchedule} not found in standards table. Add it via the Pipe Standards view (admin).`,
      );
      return;
    }
    setSaving(true);
    try {
      if (row._isNew || !row.id) {
        const created = await apiFetch<{ id: string }>(
          `/api/pipeline-inspections/${editingPipelineReportId}/measurements`,
          { method: "POST", body: JSON.stringify(row) },
        );
        setRows((rs) => rs.map((r, i) => i === idx ? { ...r, id: created.id, _isNew: false } : r));
        toast.success(`Saved ${row.pointNo}`);
      } else {
        await apiFetch(
          `/api/pipeline-inspections/${editingPipelineReportId}/measurements/${row.id}`,
          { method: "PUT", body: JSON.stringify(row) },
        );
        toast.success(`Updated ${row.pointNo}`);
      }
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRowApi(idx: number) {
    const row = rows[idx];
    if (!row) return;
    if (!row.id || row._isNew) {
      deleteRow(idx);
      return;
    }
    if (!editingPipelineReportId) return;
    try {
      await apiFetch(
        `/api/pipeline-inspections/${editingPipelineReportId}/measurements/${row.id}`,
        { method: "DELETE" },
      );
      deleteRow(idx);
      toast.success(`Deleted ${row.pointNo}`);
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Delete failed");
    }
  }

  function previewPdf() {
    if (!editingPipelineReportId) {
      toast.error("Save the report first");
      return;
    }
    openPipelineReport(editingPipelineReportId);
  }

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading report...
      </div>
    );
  }

  if (!canEdit && isEdit && reportStatus === "Approved") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Report approved</AlertTitle>
        <AlertDescription>
          This report has been approved and can only be edited by an
          administrator via the revision flow. Use the back button to return
          to the list.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" onClick={() => setView("pipeline-reports")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {isEdit ? `Edit Report ${header.reportNumber}` : "New Pipeline Thickness Report"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure the report header, then add measurement rows. The first
          two columns (Dia mm (inch), Pipe Schedule) are dropdown-selected;
          the third column (Nominal Thickness) is auto-filled from the
          ASME standard reference table; the four clock-position measurements
          are entered manually; the Observed Minimum is computed
          automatically excluding any missing / NotMeasured / NotApplicable
          values.
        </p>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <ShieldAlert className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-amber-900">Reference data notice</AlertTitle>
        <AlertDescription className="text-amber-900">
          Nominal thickness values come from publicly published ASME B36.10M / B36.19M
          reference tables. They are marked UNVERIFIED until an administrator
          confirms them against the licensed / official standard edition. The
          nominal thickness is a dimensional reference value, distinct from
          the measured remaining wall thickness, and is not, by itself, an
          inspection pass / fail criterion.
        </AlertDescription>
      </Alert>

      {/* ---------- HEADER ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Header</CardTitle>
          <CardDescription>
            Client, plant, and pipeline identification. All fields editable
            by authorized users.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Report Number *</Label>
            <Input
              value={header.reportNumber}
              onChange={(e) => updateHeader("reportNumber", e.target.value.toUpperCase())}
              placeholder="e.g. UT-COR-ENN-001"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={header.clientId} onValueChange={onClientChange}>
              <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plant Location *</Label>
            <Select
              value={header.plantId}
              onValueChange={(v) => updateHeader("plantId", v)}
              disabled={!header.clientId}
            >
              <SelectTrigger><SelectValue placeholder="Select plant" /></SelectTrigger>
              <SelectContent>
                {plantsForClient.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.location ? `· ${p.location}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Inspection Area</Label>
            <Input
              value={header.inspectionArea}
              onChange={(e) => updateHeader("inspectionArea", e.target.value)}
              placeholder="e.g. Top Pipe Rack, West Side"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Pipeline Description</Label>
            <Input
              value={header.pipelineDescription}
              onChange={(e) => updateHeader("pipelineDescription", e.target.value)}
              placeholder="e.g. 2-inch water pipeline, top pipe rack, west side"
            />
          </div>
          <div className="space-y-2">
            <Label>Pipeline Identification No.</Label>
            <Input
              value={header.pipelineIdentificationNumber}
              onChange={(e) => updateHeader("pipelineIdentificationNumber", e.target.value)}
              placeholder="PID line number"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Isometric Drawing No.</Label>
            <Input
              value={header.isometricDrawingNumber}
              onChange={(e) => updateHeader("isometricDrawingNumber", e.target.value)}
              placeholder="ISO number"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Material of Construction (MOC)</Label>
            <Select
              value={header.materialOfConstruction}
              onValueChange={(v) => updateHeader("materialOfConstruction", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOC_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Applicable Standard</Label>
            <Select
              value={header.applicableStandard}
              onValueChange={(v) => updateHeader("applicableStandard", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STANDARDS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Standard Edition</Label>
            <Select
              value={header.standardEdition}
              onValueChange={(v) => updateHeader("standardEdition", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDITIONS.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Inspection Date</Label>
            <Input
              type="date"
              value={header.inspectionDate}
              onChange={(e) => updateHeader("inspectionDate", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label>Findings Summary</Label>
            <Textarea
              rows={2}
              value={header.findingsSummary}
              onChange={(e) => updateHeader("findingsSummary", e.target.value)}
              placeholder="Overall findings to appear in the report footer"
            />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label>Comments</Label>
            <Textarea
              rows={2}
              value={header.comments}
              onChange={(e) => updateHeader("comments", e.target.value)}
              placeholder="General comments"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={saveHeader} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isEdit ? "Save Header" : "Create Report"}
        </Button>
        {isEdit && (
          <Button variant="outline" onClick={previewPdf}>
            <Download className="mr-2 h-4 w-4" /> Preview / Download PDF
          </Button>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {/* ---------- MEASUREMENT TABLE ---------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Thickness Measurement Table</CardTitle>
              <CardDescription>
                11 columns in fixed order. The first two columns are
                dropdown-selected; the third is auto-computed from standards;
                the four clock-position measurements are entered manually; the
                observed minimum is calculated excluding any missing values.
              </CardDescription>
            </div>
            <Button onClick={addRow} disabled={!isEdit}>
              <Plus className="mr-2 h-4 w-4" /> Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!isEdit && (
            <div className="p-3 text-xs text-amber-800 bg-amber-50 border-b border-amber-200">
              Save the report header first to enable adding measurement rows.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-emerald-800 text-white">
                <tr>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 50 }}>Dia mm<br />(inch)</th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 60 }}>Pipe<br />Schedule</th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 55 }}>Nominal<br />Thickness<br />(mm)</th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 70 }}>Component<br />Type</th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 50 }}>Point<br />No</th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 70 }}>
                    <div className="flex flex-col items-center">
                      <span>12 o'clock</span>
                      <span>North (mm)</span>
                    </div>
                  </th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 70 }}>
                    <div className="flex flex-col items-center">
                      <span>3 o'clock</span>
                      <span>East (mm)</span>
                    </div>
                  </th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 70 }}>
                    <div className="flex flex-col items-center">
                      <span>6 o'clock</span>
                      <span>South (mm)</span>
                    </div>
                  </th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 70 }}>
                    <div className="flex flex-col items-center">
                      <span>9 o'clock</span>
                      <span>West (mm)</span>
                    </div>
                  </th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 75 }}>
                    Observed<br />Minimum<br />Thickness<br />(mm)
                  </th>
                  <th className="border border-emerald-900 px-2 py-2 text-center align-middle" style={{ minWidth: 200 }}>Findings / Comments</th>
                  <th className="border border-emerald-900 px-2 py-2 text-center" style={{ minWidth: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center py-6 text-muted-foreground border border-zinc-300">
                      No measurement rows yet. Click <strong>Add Row</strong> to begin.
                    </td>
                  </tr>
                )}
                {rows.map((row, idx) => {
                  const nominalMissing = row.nominalThicknessMm === null;
                  return (
                    <tr key={idx} className="hover:bg-muted/30">
                      {/* Col 1: Dia mm (inch) — dropdown */}
                      <td className="border border-zinc-300 p-1 text-center">
                        <Select
                          value={row.pipeSizeInch}
                          onValueChange={(v) => updateRow(idx, { pipeSizeInch: v })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {sizes.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Col 2: Pipe Schedule — dropdown */}
                      <td className="border border-zinc-300 p-1 text-center">
                        <Select
                          value={row.pipeSchedule}
                          onValueChange={(v) => updateRow(idx, { pipeSchedule: v })}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {schedulesForRow(row.pipeSizeInch).map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Col 3: Nominal Thickness — auto-computed */}
                      <td className="border border-zinc-300 p-1 text-center tabular-nums">
                        {nominalMissing ? (
                          <Badge variant="outline" className="border-red-500 text-red-700 text-[10px]">
                            UNSUPPORTED
                          </Badge>
                        ) : (
                          <span>{row.nominalThicknessMm?.toFixed(2)}</span>
                        )}
                      </td>
                      {/* Col 4: Component Type */}
                      <td className="border border-zinc-300 p-1 text-center">
                        <Select
                          value={row.componentTypeCode}
                          onValueChange={(v) => {
                            const ct = componentTypes.find((c) => c.code === v);
                            updateRow(idx, {
                              componentTypeCode: v,
                              componentTypeId: ct?.id ?? null,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {componentTypes.map((c) => (
                              <SelectItem key={c.id} value={c.code}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {/* Col 5: Point No */}
                      <td className="border border-zinc-300 p-1 text-center">
                        <Input
                          className="h-8 text-xs text-center font-mono"
                          value={row.pointNo}
                          onChange={(e) => updateRow(idx, { pointNo: e.target.value })}
                        />
                      </td>
                      {/* Col 6-9: clock-position measurements */}
                      {(["north", "east", "south", "west"] as const).map((dir) => {
                        const mmKey = `${dir}Mm` as keyof MeasurementRow;
                        const stKey = `${dir}Status` as keyof MeasurementRow;
                        return (
                          <td key={dir} className="border border-zinc-300 p-1">
                            <div className="flex flex-col gap-1">
                              <Input
                                type="number"
                                step="any"
                                className={`h-8 text-xs text-center ${row[stKey] === "Measured" ? "" : "bg-zinc-100"}`}
                                value={row[mmKey] as string}
                                onChange={(e) => updateRow(idx, { [mmKey]: e.target.value } as Partial<MeasurementRow>)}
                                disabled={row[stKey] !== "Measured"}
                              />
                              <Select
                                value={row[stKey] as string}
                                onValueChange={(v) => updateRow(idx, { [stKey]: v } as Partial<MeasurementRow>)}
                              >
                                <SelectTrigger className="h-6 text-[10px] py-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s.value} value={s.value} className="text-xs">
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </td>
                        );
                      })}
                      {/* Col 10: Observed Minimum */}
                      <td className="border border-zinc-300 p-1 text-center tabular-nums font-semibold bg-emerald-50">
                        {row.observedMinimumMm !== null ? row.observedMinimumMm.toFixed(2) : "—"}
                      </td>
                      {/* Col 11: Findings / Comments */}
                      <td className="border border-zinc-300 p-1">
                        <Textarea
                          rows={1}
                          className="text-xs min-h-[32px] py-1"
                          value={row.findingsComments}
                          onChange={(e) => updateRow(idx, { findingsComments: e.target.value })}
                          placeholder="Observations at this point"
                        />
                      </td>
                      <td className="border border-zinc-300 p-1">
                        <div className="flex flex-col gap-1">
                          <div className="flex gap-0.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => moveRow(idx, -1)}
                              disabled={idx === 0}
                              title="Move up"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => moveRow(idx, 1)}
                              disabled={idx === rows.length - 1}
                              title="Move down"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex gap-0.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => saveRow(idx)}
                              disabled={saving}
                              title="Save row"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => deleteRowApi(idx)}
                              title="Delete row"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-50">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <div><strong>Column order:</strong> Dia mm (inch) | Pipe Schedule | Nominal Thickness (mm) | Component Type | Point No | 12 o'clock / North (mm) | 3 o'clock / East (mm) | 6 o'clock / South (mm) | 9 o'clock / West (mm) | Observed Minimum Thickness (mm) | Findings / Comments</div>
          <div><strong>Nominal Thickness</strong> is auto-populated from ASME B36.10M / B36.19M reference data based on the selected size and schedule. Unsupported combinations display an UNSUPPORTED badge — add the missing combination to the Pipe Standards table (admin) before recording measurements.</div>
          <div><strong>Observed Minimum</strong> is computed from valid (Measured) readings only. Missing / NotMeasured / NotApplicable values are excluded and never converted to zero. If no valid measurements exist, the column shows a dash.</div>
          <div><strong>Findings / Comments</strong> are preserved per row and saved independently of measurement values.</div>
        </CardContent>
      </Card>
    </div>
  );
}
