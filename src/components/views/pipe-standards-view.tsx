"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Ruler,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface PipeStandardItem {
  id: string;
  standard: string;
  edition: string;
  nominalSizeInch: string;
  nominalSizeMm: number;
  dn: string;
  schedule: string;
  wallThicknessMm: number;
  oD_mm: number | null;
  isVerified: boolean;
  verifiedAt: string | null;
  notes: string | null;
  verifiedBy?: { id: string; name: string } | null;
}

export function PipeStandardsView() {
  const { user, refreshKey, refresh } = useAppStore();
  const isAdmin = user?.role === "ADMIN";

  const [items, setItems] = useState<PipeStandardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [standardFilter, setStandardFilter] = useState("");
  const [editionFilter, setEditionFilter] = useState("");

  // Edit dialog
  const [editing, setEditing] = useState<PipeStandardItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    standard: "ASME B36.10M", edition: "2018",
    nominalSizeInch: "", nominalSizeMm: "",
    dn: "", schedule: "", wallThicknessMm: "", oD_mm: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ search: q });
    if (standardFilter) params.set("standard", standardFilter);
    if (editionFilter) params.set("edition", editionFilter);
    apiFetch<{ items: PipeStandardItem[] }>(`/api/pipe-standards?${params.toString()}`)
      .then((r) => setItems(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [q, standardFilter, editionFilter]);

  useEffect(() => { load(); }, [load, refreshKey]);

  function openNew() {
    setEditing(null);
    setForm({
      standard: "ASME B36.10M", edition: "2018",
      nominalSizeInch: "", nominalSizeMm: "",
      dn: "", schedule: "", wallThicknessMm: "", oD_mm: "", notes: "",
    });
    setDialogOpen(true);
  }

  function openEdit(it: PipeStandardItem) {
    setEditing(it);
    setForm({
      standard: it.standard, edition: it.edition,
      nominalSizeInch: it.nominalSizeInch, nominalSizeMm: String(it.nominalSizeMm),
      dn: it.dn, schedule: it.schedule, wallThicknessMm: String(it.wallThicknessMm),
      oD_mm: it.oD_mm ? String(it.oD_mm) : "", notes: it.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.nominalSizeInch.trim() || !form.schedule.trim() || !form.wallThicknessMm) {
      toast.error("Nominal size, schedule, and wall thickness are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        standard: form.standard,
        edition: form.edition,
        nominalSizeInch: form.nominalSizeInch.trim(),
        nominalSizeMm: parseFloat(form.nominalSizeMm) || 0,
        dn: form.dn.trim() || undefined,
        schedule: form.schedule.trim(),
        wallThicknessMm: parseFloat(form.wallThicknessMm),
        oD_mm: form.oD_mm ? parseFloat(form.oD_mm) : null,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await apiFetch(`/api/pipe-standards/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Updated. Row reset to UNVERIFIED — re-verify against the licensed standard.");
      } else {
        await apiFetch("/api/pipe-standards", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Created. Marked UNVERIFIED — verify against licensed standard.");
      }
      setDialogOpen(false);
      refresh();
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(it: PipeStandardItem) {
    try {
      await apiFetch(`/api/pipe-standards/${it.id}`, { method: "DELETE" });
      toast.success(`Deleted ${it.standard} ${it.nominalSizeInch}" ${it.schedule}`);
      refresh();
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Delete failed");
    }
  }

  async function verify(it: PipeStandardItem) {
    setVerifying(it.id);
    try {
      await apiFetch(`/api/pipe-standards/${it.id}`, {
        method: "POST",
        body: JSON.stringify({ confirmationNote: "Verified against licensed ASME standard edition by authorized administrator." }),
      });
      toast.success("Marked verified");
      refresh();
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Verify failed");
    } finally {
      setVerifying(null);
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access required</CardTitle>
          <CardDescription>
            Only administrators can manage the pipe standards reference table.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const verifiedCount = items.filter((i) => i.isVerified).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Ruler className="h-6 w-6 text-amber-600" /> Pipe Standards Reference
          </h1>
          <p className="text-sm text-muted-foreground">
            ASME B36.10M (carbon steel) and ASME B36.19M (stainless steel)
            nominal wall thickness reference data. Used to auto-populate the
            Nominal Thickness column on pipeline thickness reports.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> New Row
        </Button>
      </div>

      <Alert className="border-amber-300 bg-amber-50">
        <ShieldAlert className="h-4 w-4 text-amber-700" />
        <AlertTitle className="text-amber-900">Verification required</AlertTitle>
        <AlertDescription className="text-amber-900">
          Wall thickness values are seeded from publicly published ASME
          reference tables and marked <strong>UNVERIFIED</strong>. An authorized
          administrator must verify each row against the licensed / official
          ASME standard edition before production use. Editing a row resets
          its verification status — re-verify after every change.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Size, schedule, DN..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Standard</Label>
              <Select value={standardFilter || "ALL"} onValueChange={(v) => setStandardFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All standards</SelectItem>
                  <SelectItem value="ASME B36.10M">ASME B36.10M (CS)</SelectItem>
                  <SelectItem value="ASME B36.19M">ASME B36.19M (SS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Edition</Label>
              <Select value={editionFilter || "ALL"} onValueChange={(v) => setEditionFilter(v === "ALL" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All editions</SelectItem>
                  <SelectItem value="2018">2018</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Reference rows ({items.length})
            <Badge variant="outline" className="border-emerald-500 text-emerald-700">
              <ShieldCheck className="mr-1 h-3 w-3" /> {verifiedCount} verified
            </Badge>
            <Badge variant="outline" className="border-amber-500 text-amber-700">
              <ShieldAlert className="mr-1 h-3 w-3" /> {items.length - verifiedCount} unverified
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center gap-2 p-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          )}
          {!loading && (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead>Standard</TableHead>
                    <TableHead>Edition</TableHead>
                    <TableHead>Nominal Size (inch)</TableHead>
                    <TableHead>OD (mm)</TableHead>
                    <TableHead>DN</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Wall Thickness (mm)</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="text-xs font-mono">{it.standard}</TableCell>
                      <TableCell className="text-xs">{it.edition}</TableCell>
                      <TableCell className="text-xs font-mono">{it.nominalSizeInch}"</TableCell>
                      <TableCell className="text-xs tabular-nums">{it.nominalSizeMm.toFixed(1)}</TableCell>
                      <TableCell className="text-xs font-mono">{it.dn}</TableCell>
                      <TableCell className="text-xs font-mono">{it.schedule}</TableCell>
                      <TableCell className="text-xs tabular-nums font-semibold">{it.wallThicknessMm.toFixed(2)}</TableCell>
                      <TableCell>
                        {it.isVerified ? (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-700">
                            <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-700">
                            <ShieldAlert className="mr-1 h-3 w-3" /> Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!it.isVerified && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => verify(it)}
                              disabled={verifying === it.id}
                            >
                              {verifying === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(it)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this row?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {it.standard} {it.nominalSizeInch}" {it.schedule} = {it.wallThicknessMm}mm.
                                  Existing measurement rows that reference this standard will keep their
                                  snapshot, but new rows referencing this combination will be rejected.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(it)} className="bg-red-600 hover:bg-red-700">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Why is verification required?</strong>{" "}
            The ASME B36.10M / B36.19M standards are licensed standards. The
            values seeded here come from publicly available excerpts and
            engineering references. Before any production inspection decision
            relies on a Nominal Thickness value, the responsible engineer /
            administrator must confirm the value against the licensed ASME
            edition purchased by their organisation. The "Verify" action
            records the verifier identity and timestamp in the audit log.
            Editing any row resets the verification flag — re-verify after
            every edit.
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Reference Row" : "New Reference Row"}</DialogTitle>
            <DialogDescription>
              All new and edited rows are marked UNVERIFIED until an
              administrator confirms them against the licensed ASME standard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Standard</Label>
              <Select value={form.standard} onValueChange={(v) => setForm((f) => ({ ...f, standard: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASME B36.10M">ASME B36.10M (CS)</SelectItem>
                  <SelectItem value="ASME B36.19M">ASME B36.19M (SS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Edition</Label>
              <Select value={form.edition} onValueChange={(v) => setForm((f) => ({ ...f, edition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2018">2018</SelectItem>
                  <SelectItem value="2021">2021</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nominal Size (inch)</Label>
              <Input value={form.nominalSizeInch} onChange={(e) => setForm((f) => ({ ...f, nominalSizeInch: e.target.value }))} placeholder='e.g. 2 or 1 1/2' />
            </div>
            <div className="space-y-2">
              <Label>Outside Diameter (mm)</Label>
              <Input type="number" step="any" value={form.nominalSizeMm} onChange={(e) => setForm((f) => ({ ...f, nominalSizeMm: e.target.value }))} placeholder="e.g. 60.3" />
            </div>
            <div className="space-y-2">
              <Label>DN</Label>
              <Input value={form.dn} onChange={(e) => setForm((f) => ({ ...f, dn: e.target.value }))} placeholder="e.g. DN50" />
            </div>
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Input value={form.schedule} onChange={(e) => setForm((f) => ({ ...f, schedule: e.target.value }))} placeholder="e.g. SCH 40 / STD / XS" />
            </div>
            <div className="space-y-2">
              <Label>Wall Thickness (mm)</Label>
              <Input type="number" step="any" value={form.wallThicknessMm} onChange={(e) => setForm((f) => ({ ...f, wallThicknessMm: e.target.value }))} placeholder="e.g. 3.93" />
            </div>
            <div className="space-y-2">
              <Label>OD (mm) [optional]</Label>
              <Input type="number" step="any" value={form.oD_mm} onChange={(e) => setForm((f) => ({ ...f, oD_mm: e.target.value }))} placeholder="Leave blank if same as nominal" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
