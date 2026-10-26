"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Plus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import {
  EQUIPMENT_CATEGORIES,
  DIMENSION_FIELD_META,
  ORIENTATIONS,
  DIMENSION_SOURCES,
  VERIFICATION_STATUSES,
  findCategoryByKey,
  type DimensionField,
  type CategoryDefinition,
} from "@/lib/domain/equipment-catalog";

interface ClientItem {
  id: string;
  name: string;
  plants: Array<{ id: string; name: string }>;
}

interface EquipmentResponse {
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
  clientId: string;
  plantId: string;
  tagNumber: string | null;
  dimensionSource: string | null;
  verificationStatus: "Verified" | "Unverified";
  notes: string | null;
}

interface FormState {
  equipmentId: string;
  name: string;
  category: string;
  type: string;
  orientation: string;
  diameter: string;
  height: string;
  length: string;
  width: string;
  capacity: string;
  wallThickness: string;
  nominalDiameter: string;
  outsideDiameter: string;
  tubeLength: string;
  shellDiameter: string;
  material: string;
  manufacturer: string;
  serialNumber: string;
  clientId: string;
  plantId: string;
  tagNumber: string;
  dimensionSource: string;
  verificationStatus: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  equipmentId: "",
  name: "",
  category: "",
  type: "",
  orientation: "",
  diameter: "",
  height: "",
  length: "",
  width: "",
  capacity: "",
  wallThickness: "",
  nominalDiameter: "",
  outsideDiameter: "",
  tubeLength: "",
  shellDiameter: "",
  material: "",
  manufacturer: "",
  serialNumber: "",
  clientId: "",
  plantId: "",
  tagNumber: "",
  dimensionSource: "",
  verificationStatus: "Unverified",
  notes: "",
};

const DIM_FIELDS_ALL: DimensionField[] = [
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
];

export function EquipmentFormView() {
  const { user, editingEquipmentId, setView, openEquipment, refresh } = useAppStore();
  const isAdmin = user?.role === "ADMIN";
  const isEdit = !!editingEquipmentId;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch clients
  useEffect(() => {
    apiFetch<{ items: ClientItem[] }>("/api/clients")
      .then((r) => setClients(r.items))
      .catch(() => toast.error("Failed to load clients"));
  }, []);

  // Load existing equipment for edit
  useEffect(() => {
    if (!editingEquipmentId) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    void apiFetch<EquipmentResponse>(`/api/equipment/${editingEquipmentId}`)
      .then((e) => {
        if (!mounted) return;
        setForm({
          equipmentId: e.equipmentId,
          name: e.name,
          category: e.category,
          type: e.type,
          orientation: e.orientation ?? "",
          diameter: e.diameter?.toString() ?? "",
          height: e.height?.toString() ?? "",
          length: e.length?.toString() ?? "",
          width: e.width?.toString() ?? "",
          capacity: e.capacity?.toString() ?? "",
          wallThickness: e.wallThickness?.toString() ?? "",
          nominalDiameter: e.nominalDiameter?.toString() ?? "",
          outsideDiameter: e.outsideDiameter?.toString() ?? "",
          tubeLength: e.tubeLength?.toString() ?? "",
          shellDiameter: e.shellDiameter?.toString() ?? "",
          material: e.material ?? "",
          manufacturer: e.manufacturer ?? "",
          serialNumber: e.serialNumber ?? "",
          clientId: e.clientId,
          plantId: e.plantId,
          tagNumber: e.tagNumber ?? "",
          dimensionSource: e.dimensionSource ?? "",
          verificationStatus: e.verificationStatus,
          notes: e.notes ?? "",
        });
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [editingEquipmentId]);

  // Selected category definition
  const categoryDef: CategoryDefinition | undefined = useMemo(
    () => (form.category ? findCategoryByKey(form.category) : undefined),
    [form.category],
  );

  // Plants filtered by selected client
  const plantsForClient = useMemo(() => {
    if (!form.clientId) return [];
    return clients.find((c) => c.id === form.clientId)?.plants ?? [];
  }, [clients, form.clientId]);

  // Auto-select first plant if cleared
  useEffect(() => {
    if (form.clientId && plantsForClient.length > 0 && !plantsForClient.find((p) => p.id === form.plantId)) {
      setForm((f) => ({ ...f, plantId: plantsForClient[0].id }));
    }
  }, [plantsForClient, form.clientId, form.plantId]);

  // When type changes: pick sensible default orientation if empty
  useEffect(() => {
    if (!categoryDef) return;
    if (!form.orientation || !categoryDef.orientations.includes(form.orientation as never)) {
      setForm((f) => ({ ...f, orientation: categoryDef.defaultOrientation ?? "" }));
    }
  }, [categoryDef, form.orientation]);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onCategoryChange(catKey: string) {
    const def = findCategoryByKey(catKey);
    setForm((f) => ({
      ...f,
      category: catKey,
      type: def && def.types[0] ? def.types[0] : "",
      orientation: def?.defaultOrientation ?? "",
    }));
  }

  function onTypeChange(type: string) {
    const def = EQUIPMENT_CATEGORIES.find((c) => c.types.includes(type));
    if (!def) return;
    setForm((f) => ({
      ...f,
      type,
      category: def.key,
      orientation: def.defaultOrientation ?? f.orientation,
    }));
  }

  // Validate numeric dimension fields (positive number or empty)
  function validate(): string[] {
    const errs: string[] = [];
    if (!form.equipmentId.trim()) errs.push("Equipment ID is required");
    if (!form.name.trim()) errs.push("Equipment name is required");
    if (!form.category) errs.push("Category is required");
    if (!form.type) errs.push("Type is required");
    if (!form.clientId) errs.push("Client is required");
    if (!form.plantId) errs.push("Plant is required");

    // For each visible dimension field, ensure value is a number >= 0 if filled
    for (const f of categoryDef?.dimensions ?? []) {
      const v = form[f];
      if (v && v.length > 0) {
        const n = Number(v);
        if (Number.isNaN(n) || n < 0) {
          errs.push(`${DIMENSION_FIELD_META[f].label} must be a positive number`);
        }
      }
    }
    return errs;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only administrators can create or edit equipment");
      return;
    }
    const errs = validate();
    if (errs.length > 0) {
      setError(errs.join(" · "));
      toast.error("Please fix validation errors");
      return;
    }
    setError(null);
    setSaving(true);

    // Build payload — only include dimension fields visible for this category.
    const dimPayload: Record<string, string | null> = {};
    const allFields = new Set<DimensionField>(categoryDef?.dimensions ?? []);
    for (const f of DIM_FIELDS_ALL) {
      if (allFields.has(f)) {
        const v = form[f];
        dimPayload[f] = v && v.length > 0 ? v : null;
      } else {
        dimPayload[f] = null; // explicitly clear non-applicable fields
      }
    }

    const payload = {
      equipmentId: form.equipmentId.trim(),
      name: form.name.trim(),
      category: form.category,
      type: form.type,
      orientation: form.orientation || null,
      ...dimPayload,
      material: form.material.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
      clientId: form.clientId,
      plantId: form.plantId,
      tagNumber: form.tagNumber.trim() || null,
      dimensionSource: form.dimensionSource || null,
      verificationStatus: form.verificationStatus,
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit && editingEquipmentId) {
        const updated = await apiFetch<EquipmentResponse>(
          `/api/equipment/${editingEquipmentId}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        );
        toast.success(`Updated ${updated.equipmentId}`);
        refresh();
        openEquipment(updated.id);
      } else {
        const created = await apiFetch<EquipmentResponse>("/api/equipment", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(`Created ${created.equipmentId}`);
        refresh();
        openEquipment(created.id);
      }
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message ?? "Save failed");
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading equipment...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Forbidden</AlertTitle>
        <AlertDescription>
          Only administrators can create or edit equipment records.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setView("equipment")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
          </Button>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Equipment" : "Add New Equipment"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Dimensions that do not apply to the selected type may be left blank.
            Empty fields will be stored as <code>null</code>, never as zero.
          </p>
        </div>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <ShieldAlert className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-amber-900">Important</AlertTitle>
        <AlertDescription className="text-amber-900">
          Only record dimensions that have been verified from approved
          engineering drawings, manufacturer drawings, equipment nameplates,
          or verified field measurements. Mark any uncertain record as{" "}
          <strong>Unverified</strong> until confirmation.
        </AlertDescription>
      </Alert>

      <form onSubmit={submit} className="space-y-4">
        {/* Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identification</CardTitle>
            <CardDescription>Unique equipment ID and human-readable name.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="equipmentId">Equipment ID *</Label>
              <Input
                id="equipmentId"
                value={form.equipmentId}
                onChange={(e) => update("equipmentId", e.target.value.toUpperCase())}
                placeholder="e.g. AC-VAPI-001"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Must be unique within the selected client scope.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Equipment Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="e.g. Sulphuric Acid Storage Tank T-101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagNumber">Tag Number</Label>
              <Input
                id="tagNumber"
                value={form.tagNumber}
                onChange={(e) => update("tagNumber", e.target.value)}
                placeholder="e.g. T-101"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={form.serialNumber}
                onChange={(e) => update("serialNumber", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Classification</CardTitle>
            <CardDescription>
              Pick category and type. Available dimension fields adjust automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={onCategoryChange}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipment Type *</Label>
              <Select
                value={form.type}
                onValueChange={onTypeChange}
                disabled={!form.category}
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {categoryDef?.types.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Orientation</Label>
              <Select
                value={form.orientation || "Not Applicable"}
                onValueChange={(v) => update("orientation", v)}
                disabled={!categoryDef}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(categoryDef?.orientations ?? ORIENTATIONS).map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material of Construction</Label>
              <Input
                value={form.material}
                onChange={(e) => update("material", e.target.value)}
                placeholder="e.g. Carbon Steel SA516 Gr70"
              />
            </div>
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input
                value={form.manufacturer}
                onChange={(e) => update("manufacturer", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dimensions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dimensions</CardTitle>
            <CardDescription>
              Only fields relevant to the selected equipment type are shown.
              Units are explicit and stored alongside the value.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryDef ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryDef.dimensions.map((field) => {
                  const meta = DIMENSION_FIELD_META[field];
                  return (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={field} className="flex items-center justify-between">
                        <span>{meta.label}</span>
                        <Badge variant="outline" className="ml-2 font-mono text-xs">
                          {meta.unit}
                        </Badge>
                      </Label>
                      <Input
                        id={field}
                        type="number"
                        step="any"
                        min="0"
                        value={form[field]}
                        onChange={(e) => update(field, e.target.value)}
                        placeholder="Leave blank if not applicable"
                      />
                      {meta.hint && (
                        <p className="text-xs text-muted-foreground">{meta.hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a category to see applicable dimension fields.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Dimension Source</Label>
                <Select
                  value={form.dimensionSource || "NONE"}
                  onValueChange={(v) =>
                    update("dimensionSource", v === "NONE" ? "" : v)
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Not specified" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Not specified</SelectItem>
                    {DIMENSION_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Verification Status *</Label>
                <Select
                  value={form.verificationStatus}
                  onValueChange={(v) => update("verificationStatus", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VERIFICATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client / Plant */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client &amp; Plant Assignment</CardTitle>
            <CardDescription>
              Each equipment record belongs to one plant within one client.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => update("clientId", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plant *</Label>
              <Select
                value={form.plantId}
                onValueChange={(v) => update("plantId", v)}
                disabled={!form.clientId}
              >
                <SelectTrigger><SelectValue placeholder="Select plant" /></SelectTrigger>
                <SelectContent>
                  {plantsForClient.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
            <CardDescription>
              Optional remarks — used by inspectors or administrators only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Add any contextual notes (e.g. drawing revision, lining type, coating reference)."
            />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setView("equipment")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : isEdit ? (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> Create Equipment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
