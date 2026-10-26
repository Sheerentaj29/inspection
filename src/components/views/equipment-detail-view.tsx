"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Building2,
  Factory,
  Ruler,
  Wrench,
  FileText,
  Plus,
  Calendar,
  User as UserIcon,
  Camera,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  DIMENSION_FIELD_META,
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
} from "@/lib/domain/equipment-catalog";

const CATEGORY_LABEL: Record<string, string> = {
  STORAGE: "Storage Equipment",
  PRESSURE: "Pressure and Process Equipment",
  SEPARATION: "Separation and Thermal Equipment",
  UTILITY: "Utility Equipment",
  PIPE: "Pipes",
  VALVE: "Valves",
  PUMP: "Pumps",
  OTHER: "Other Equipment",
};

interface EquipmentFull {
  id: string;
  equipmentId: string;
  name: string;
  category: string;
  type: string;
  orientation: string | null;
  diameter: number | null;
  height: number | null;
  length: number | null;
  width: number | null;
  capacity: number | null;
  wallThickness: number | null;
  nominalDiameter: number | null;
  outsideDiameter: number | null;
  tubeLength: number | null;
  shellDiameter: number | null;
  material: string | null;
  manufacturer: string | null;
  serialNumber: string | null;
  tagNumber: string | null;
  dimensionSource: string | null;
  verificationStatus: "Verified" | "Unverified";
  isDemo: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string };
  plant: { id: string; name: string; location: string | null; address: string | null };
  createdBy: { id: string; name: string };
  inspections: InspectionRow[];
}

interface InspectionRow {
  id: string;
  inspectionDate: string;
  inspectionType: string;
  status: string;
  summary: string | null;
  observations: string | null;
  measurements: string | null;
  photoCount: number;
  reportPath: string | null;
  inspector: { id: string; name: string; email: string };
}

interface Measurement {
  label: string;
  value: number;
  unit: string;
  notes?: string;
}

interface InspectionFormState {
  inspectionDate: string;
  inspectionType: string;
  status: string;
  summary: string;
  observations: string;
  photoCount: string;
  reportPath: string;
  measurements: Measurement[];
}

const EMPTY_INSP: InspectionFormState = {
  inspectionDate: new Date().toISOString().slice(0, 10),
  inspectionType: "Visual Inspection",
  status: "Completed",
  summary: "",
  observations: "",
  photoCount: "0",
  reportPath: "",
  measurements: [],
};

export function EquipmentDetailView() {
  const {
    user,
    selectedEquipmentId,
    setView,
    openEditEquipment,
    refresh,
    refreshKey,
  } = useAppStore();
  const isAdmin = user?.role === "ADMIN";

  const [eq, setEq] = useState<EquipmentFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspOpen, setInspOpen] = useState(false);
  const [inspForm, setInspForm] = useState<InspectionFormState>(EMPTY_INSP);
  const [savingInsp, setSavingInsp] = useState(false);
  const [expandedInspId, setExpandedInspId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!selectedEquipmentId) return;
    setLoading(true);
    apiFetch<EquipmentFull>(`/api/equipment/${selectedEquipmentId}`)
      .then((e) => setEq(e))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedEquipmentId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function updateInsp<K extends keyof InspectionFormState>(k: K, v: InspectionFormState[K]) {
    setInspForm((f) => ({ ...f, [k]: v }));
  }

  function addMeasurement() {
    setInspForm((f) => ({
      ...f,
      measurements: [
        ...f.measurements,
        { label: "", value: 0, unit: "mm", notes: "" },
      ],
    }));
  }

  function updateMeasurement(idx: number, field: keyof Measurement, value: string | number) {
    setInspForm((f) => {
      const copy = [...f.measurements];
      (copy[idx] as Record<string, unknown>)[field] = value;
      return { ...f, measurements: copy };
    });
  }

  function removeMeasurement(idx: number) {
    setInspForm((f) => ({
      ...f,
      measurements: f.measurements.filter((_, i) => i !== idx),
    }));
  }

  async function submitInspection() {
    if (!eq) return;
    if (!inspForm.inspectionDate) {
      toast.error("Inspection date is required");
      return;
    }
    if (!inspForm.inspectionType) {
      toast.error("Inspection type is required");
      return;
    }
    setSavingInsp(true);
    try {
      await apiFetch(`/api/equipment/${eq.id}/inspections`, {
        method: "POST",
        body: JSON.stringify({
          inspectionDate: inspForm.inspectionDate,
          inspectionType: inspForm.inspectionType,
          status: inspForm.status,
          summary: inspForm.summary || null,
          observations: inspForm.observations || null,
          measurements: inspForm.measurements,
          photoCount: inspForm.photoCount || 0,
          reportPath: inspForm.reportPath || null,
        }),
      });
      toast.success("Inspection recorded");
      setInspForm(EMPTY_INSP);
      setInspOpen(false);
      refresh();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Failed to save inspection");
    } finally {
      setSavingInsp(false);
    }
  }

  async function deleteEquipment() {
    if (!eq) return;
    try {
      await apiFetch(`/api/equipment/${eq.id}`, { method: "DELETE" });
      toast.success(`Deleted ${eq.equipmentId}`);
      refresh();
      setView("equipment");
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading equipment details...
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
  if (!eq) {
    return <p className="p-8 text-muted-foreground">No equipment selected.</p>;
  }

  // Dimension rows to display — only non-null values
  const dimEntries = (
    [
      "diameter",
      "height",
      "length",
      "width",
      "capacity",
      "wallThickness",
      "nominalDiameter",
      "outsideDiameter",
      "tubeLength",
      "shellDiameter",
    ] as Array<keyof typeof DIMENSION_FIELD_META>
  )
    .map((f) => ({ field: f, value: eq[f] as number | null }))
    .filter((x) => x.value !== null && x.value !== undefined);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => setView("equipment")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
        </Button>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{eq.name}</h1>
              {eq.verificationStatus === "Verified" ? (
                <Badge variant="outline" className="border-emerald-500 text-emerald-700">
                  <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-700">
                  <ShieldAlert className="mr-1 h-3 w-3" /> Unverified
                </Badge>
              )}
              {eq.isDemo && (
                <Badge variant="outline" className="border-zinc-400 text-zinc-500">
                  DEMO DATA
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono">{eq.equipmentId}</span>
              {eq.tagNumber && <> · Tag <span className="font-mono">{eq.tagNumber}</span></>}
              {" · "}
              {CATEGORY_LABEL[eq.category] ?? eq.category} — {eq.type}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openEditEquipment(eq.id)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this equipment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{eq.equipmentId}</strong> and all
                      associated inspections. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteEquipment} className="bg-red-600 hover:bg-red-700">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      {eq.verificationStatus === "Unverified" && (
        <Alert className="border-amber-300 bg-amber-50">
          <ShieldAlert className="h-4 w-4 text-amber-700" />
          <AlertTitle className="text-amber-900">Unverified specifications</AlertTitle>
          <AlertDescription className="text-amber-900">
            Dimensions below are marked UNVERIFIED. They must be confirmed from approved
            drawings, manufacturer records, nameplate data, or verified field measurements
            before use as engineering design, safety, or inspection acceptance values.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Specs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="h-4 w-4" /> Registered Specifications
            </CardTitle>
            <CardDescription>
              Master specifications preserved on this equipment. Inspectors may record
              new measurements during inspections without modifying these values.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Identification */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Identification
              </h3>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <SpecRow label="Equipment ID" value={eq.equipmentId} mono />
                <SpecRow label="Tag Number" value={eq.tagNumber} mono />
                <SpecRow label="Serial Number" value={eq.serialNumber} mono />
                <SpecRow label="Manufacturer" value={eq.manufacturer} />
                <SpecRow label="Material" value={eq.material} />
                <SpecRow label="Orientation" value={eq.orientation} />
                <SpecRow label="Dimension Source" value={eq.dimensionSource} />
              </dl>
            </div>
            <Separator />
            {/* Dimensions */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Dimensions
              </h3>
              {dimEntries.length > 0 ? (
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {dimEntries.map(({ field, value }) => {
                    const meta = DIMENSION_FIELD_META[field];
                    return (
                      <div key={field} className="flex flex-col">
                        <dt className="text-xs text-muted-foreground">{meta.label}</dt>
                        <dd className="text-base font-semibold tabular-nums">
                          {value} <span className="text-xs font-normal text-muted-foreground">{meta.unit}</span>
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No dimensional data recorded. Empty dimensions are stored as{" "}
                  <code>null</code>, not as zero, so they remain visibly distinct from
                  measured zero values.
                </p>
              )}
            </div>
            {eq.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Notes
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{eq.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: Client / Plant / Audit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" /> Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Client Company</div>
              <div className="font-medium">{eq.client.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Factory className="h-3 w-3" /> Plant
              </div>
              <div className="font-medium">{eq.plant.name}</div>
              {eq.plant.location && (
                <div className="text-xs text-muted-foreground">{eq.plant.location}</div>
              )}
            </div>
            <Separator />
            <div>
              <div className="text-xs text-muted-foreground">Created by</div>
              <div className="text-sm">{eq.createdBy.name}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(eq.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last updated</div>
              <div className="text-xs">
                {new Date(eq.updatedAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspection History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Inspection History
              </CardTitle>
              <CardDescription>
                Each row links photos, observations, measurements, and PDF reports
                to a single inspection event.
              </CardDescription>
            </div>
            <Dialog open={inspOpen} onOpenChange={setInspOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> New Inspection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record New Inspection</DialogTitle>
                  <DialogDescription>
                    Equipment specifications are preserved separately; measurements
                    recorded here will not modify the master record.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Inspection Date *</Label>
                      <Input
                        type="date"
                        value={inspForm.inspectionDate}
                        onChange={(e) => updateInsp("inspectionDate", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Inspection Type *</Label>
                      <Select
                        value={inspForm.inspectionType}
                        onValueChange={(v) => updateInsp("inspectionType", v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INSPECTION_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={inspForm.status}
                        onValueChange={(v) => updateInsp("status", v)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {INSPECTION_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Photo Count</Label>
                      <Input
                        type="number"
                        min="0"
                        value={inspForm.photoCount}
                        onChange={(e) => updateInsp("photoCount", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Summary</Label>
                    <Input
                      value={inspForm.summary}
                      onChange={(e) => updateInsp("summary", e.target.value)}
                      placeholder="Brief headline summary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Observations</Label>
                    <Textarea
                      rows={3}
                      value={inspForm.observations}
                      onChange={(e) => updateInsp("observations", e.target.value)}
                      placeholder="Detailed field observations"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Measurements (optional)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addMeasurement}>
                        <Plus className="mr-1 h-3 w-3" /> Add measurement
                      </Button>
                    </div>
                    {inspForm.measurements.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No measurements recorded. Master equipment dimensions remain
                        visible above; new field measurements are recorded separately.
                      </p>
                    )}
                    {inspForm.measurements.length > 0 && (
                      <div className="space-y-2">
                        {inspForm.measurements.map((m, idx) => (
                          <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                            <Input
                              placeholder="Label (e.g. UT-1)"
                              value={m.label}
                              onChange={(e) => updateMeasurement(idx, "label", e.target.value)}
                            />
                            <Input
                              type="number"
                              step="any"
                              placeholder="Value"
                              value={m.value}
                              onChange={(e) => updateMeasurement(idx, "value", e.target.value)}
                            />
                            <Input
                              placeholder="Unit"
                              value={m.unit}
                              onChange={(e) => updateMeasurement(idx, "unit", e.target.value)}
                            />
                            <Input
                              placeholder="Notes"
                              value={m.notes ?? ""}
                              onChange={(e) => updateMeasurement(idx, "notes", e.target.value)}
                              className="sm:col-span-1"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => removeMeasurement(idx)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Report Path (optional)</Label>
                    <Input
                      value={inspForm.reportPath}
                      onChange={(e) => updateInsp("reportPath", e.target.value)}
                      placeholder="/reports/...pdf"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setInspOpen(false)} disabled={savingInsp}>
                    Cancel
                  </Button>
                  <Button onClick={submitInspection} disabled={savingInsp}>
                    {savingIns ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Inspection"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {eq.inspections.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No inspections recorded for this equipment yet.
            </p>
          ) : (
            <div className="divide-y">
              {eq.inspections.map((insp) => {
                const expanded = expandedInspId === insp.id;
                let measurements: Measurement[] = [];
                try {
                  measurements = insp.measurements ? JSON.parse(insp.measurements) : [];
                } catch {
                  // ignore parse errors
                }
                return (
                  <div key={insp.id} className="py-3">
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedInsId(expanded ? null : insp.id)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{insp.inspectionType}</span>
                            <Badge variant="outline" className="text-xs">{insp.status}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(insp.inspectionDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {insp.inspector.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Camera className="h-3 w-3" />
                              {insp.photoCount} photos
                            </span>
                            {insp.reportPath && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {insp.reportPath}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {insp.summary && (
                        <p className="mt-1 text-sm">{insp.summary}</p>
                      )}
                    </button>
                    {expanded && (
                      <div className="mt-2 space-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                        {insp.observations && (
                          <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground">Observations</div>
                            <p className="whitespace-pre-wrap">{insp.observations}</p>
                          </div>
                        )}
                        {measurements.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground">Measurements</div>
                            <div className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                              {measurements.map((m, i) => (
                                <div key={i} className="flex items-baseline justify-between rounded bg-background px-2 py-1 text-xs">
                                  <span className="font-mono">{m.label || `M-${i + 1}`}</span>
                                  <span className="tabular-nums">
                                    {m.value} <span className="text-muted-foreground">{m.unit}</span>
                                  </span>
                                  {m.notes && (
                                    <span className="ml-2 text-muted-foreground">— {m.notes}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration hint */}
      <Card className="bg-muted/30">
        <CardContent className="flex items-start gap-3 p-4">
          <Wrench className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Inspection Workflow Integration:</strong> When
            an inspector selects this component during inspection entry, the system will
            auto-populate equipment ID, name, type, orientation, registered dimensions,
            material, and location. New inspection measurements are stored separately
            from these master specifications. Multiple inspections are supported over
            time; photos, observations, and generated PDF reports link to the
            selected inspection record.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SpecRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-sm" : "text-sm"}>
        {value ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}
