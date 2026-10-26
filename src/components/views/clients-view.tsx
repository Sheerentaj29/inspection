"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Factory,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Database,
  Mail,
  Phone,
  MapPin,
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
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

interface PlantItem {
  id: string;
  name: string;
  location: string | null;
  address: string | null;
  isDemo: boolean;
}

interface ClientItem {
  id: string;
  name: string;
  industry: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  isDemo: boolean;
  plants: PlantItem[];
  _count: { equipment: number };
}

interface ClientForm {
  id?: string;
  name: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  notes: string;
}

interface PlantForm {
  id?: string;
  clientId: string;
  name: string;
  location: string;
  address: string;
  notes: string;
}

const EMPTY_CLIENT: ClientForm = {
  name: "",
  industry: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  notes: "",
};

const EMPTY_PLANT: PlantForm = {
  clientId: "",
  name: "",
  location: "",
  address: "",
  notes: "",
};

export function ClientsView() {
  const { user, refreshKey, refresh } = useAppStore();
  const isAdmin = user?.role === "ADMIN";

  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Client dialog
  const [clientOpen, setClientOpen] = useState(false);
  const [clientForm, setClientForm] = useState<ClientForm>(EMPTY_CLIENT);
  const [savingClient, setSavingClient] = useState(false);

  // Plant dialog
  const [plantOpen, setPlantOpen] = useState(false);
  const [plantForm, setPlantForm] = useState<PlantForm>(EMPTY_PLANT);
  const [savingPlant, setSavingPlant] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<{ items: ClientItem[] }>("/api/clients")
      .then((r) => {
        setClients(r.items);
        // auto-expand the first client
        if (r.items.length > 0 && expanded.size === 0) {
          setExpanded(new Set([r.items[0].id]));
        }
      })
      .catch(() => toast.error("Failed to load clients"))
      .finally(() => setLoading(false));
  }, [expanded.size]);

  useEffect(() => {
    load();
  }, [refreshKey]);

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---------- Client handlers ----------
  function openNewClient() {
    setClientForm(EMPTY_CLIENT);
    setClientOpen(true);
  }
  function openEditClient(c: ClientItem) {
    setClientForm({
      id: c.id,
      name: c.name,
      industry: c.industry ?? "",
      contactName: c.contactName ?? "",
      contactEmail: c.contactEmail ?? "",
      contactPhone: c.contactPhone ?? "",
      address: c.address ?? "",
      notes: c.notes ?? "",
    });
    setClientOpen(true);
  }
  async function saveClient() {
    if (!clientForm.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    setSavingClient(true);
    try {
      if (clientForm.id) {
        await apiFetch(`/api/clients/${clientForm.id}`, {
          method: "PUT",
          body: JSON.stringify(clientForm),
        });
        toast.success("Client updated");
      } else {
        await apiFetch("/api/clients", {
          method: "POST",
          body: JSON.stringify(clientForm),
        });
        toast.success("Client created");
      }
      setClientOpen(false);
      refresh();
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Save failed");
    } finally {
      setSavingClient(false);
    }
  }
  async function deleteClient(c: ClientItem) {
    try {
      await apiFetch(`/api/clients/${c.id}`, { method: "DELETE" });
      toast.success(`Deleted ${c.name}`);
      refresh();
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Delete failed");
    }
  }

  // ---------- Plant handlers ----------
  function openNewPlant(clientId: string) {
    setPlantForm({ ...EMPTY_PLANT, clientId });
    setPlantOpen(true);
  }
  async function savePlant() {
    if (!plantForm.clientId) {
      toast.error("Client is required");
      return;
    }
    if (!plantForm.name.trim()) {
      toast.error("Plant name is required");
      return;
    }
    setSavingPlant(true);
    try {
      await apiFetch("/api/plants", {
        method: "POST",
        body: JSON.stringify(plantForm),
      });
      toast.success("Plant created");
      setPlantOpen(false);
      refresh();
      load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message ?? "Save failed");
    } finally {
      setSavingPlant(false);
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access required</CardTitle>
          <CardDescription>
            Only administrators can manage clients and plants.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients &amp; Plants</h1>
          <p className="text-sm text-muted-foreground">
            Manage client companies and the plants where inspections are performed.
          </p>
        </div>
        <Button onClick={openNewClient}>
          <Plus className="mr-2 h-4 w-4" /> New Client
        </Button>
      </div>

      {loading && (
        <div className="p-8 text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </div>
      )}

      {!loading && clients.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No clients registered. Click “New Client” to begin.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {clients.map((c) => {
          const isOpen = expanded.has(c.id);
          return (
            <Card key={c.id}>
              <Collapsible open={isOpen} onOpenChange={() => toggle(c.id)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 text-left">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{c.name}</CardTitle>
                            {c.isDemo && (
                              <Badge variant="outline" className="border-zinc-300 text-zinc-500 text-[10px]">DEMO</Badge>
                            )}
                          </div>
                          <CardDescription className="text-xs">
                            {c.industry ?? "Industry not specified"}
                            {" · "}
                            {c._count.equipment} equipment
                            {" · "}
                            {c.plants.length} plants
                          </CardDescription>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditClient(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the client and all its plants,
                              equipment, and inspections. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteClient(c)} className="bg-red-600 hover:bg-red-700">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    {/* Contact info */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <InfoItem icon={MapPin} label="Address" value={c.address} />
                      <InfoItem icon={Mail} label="Email" value={c.contactEmail} />
                      <InfoItem icon={Phone} label="Phone" value={c.contactPhone} />
                    </div>
                    {c.notes && (
                      <div className="rounded-md border bg-muted/40 p-3 text-xs">
                        <div className="mb-1 font-semibold text-muted-foreground">Notes</div>
                        {c.notes}
                      </div>
                    )}
                    <Separator />
                    {/* Plants */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          <Factory className="h-4 w-4" /> Plants
                        </div>
                        <Button size="sm" variant="outline" onClick={() => openNewPlant(c.id)}>
                          <Plus className="mr-1 h-3 w-3" /> Add Plant
                        </Button>
                      </div>
                      {c.plants.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3">
                          No plants registered.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {c.plants.map((p) => (
                            <div key={p.id} className="rounded-md border bg-background p-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <Factory className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">{p.name}</span>
                                    {p.isDemo && (
                                      <Badge variant="outline" className="text-[10px]">DEMO</Badge>
                                    )}
                                  </div>
                                  {p.location && (
                                    <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3" /> {p.location}
                                    </div>
                                  )}
                                  {p.address && (
                                    <div className="mt-0.5 text-xs text-muted-foreground">{p.address}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Client dialog */}
      <Dialog open={clientOpen} onOpenChange={setClientOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{clientForm.id ? "Edit Client" : "New Client"}</DialogTitle>
            <DialogDescription>
              Register a client company. Each client can have multiple plants.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label>Client Name *</Label>
              <Input value={clientForm.name} onChange={(e) => setClientForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input value={clientForm.industry} onChange={(e) => setClientForm((f) => ({ ...f, industry: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Primary Contact</Label>
              <Input value={clientForm.contactName} onChange={(e) => setClientForm((f) => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={clientForm.contactEmail} onChange={(e) => setClientForm((f) => ({ ...f, contactEmail: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={clientForm.contactPhone} onChange={(e) => setClientForm((f) => ({ ...f, contactPhone: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Address</Label>
              <Textarea rows={2} value={clientForm.address} onChange={(e) => setClientForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={clientForm.notes} onChange={(e) => setClientForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClientOpen(false)}>Cancel</Button>
            <Button onClick={saveClient} disabled={savingClient}>
              {savingClient ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {clientForm.id ? "Save Changes" : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plant dialog */}
      <Dialog open={plantOpen} onOpenChange={setPlantOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Plant</DialogTitle>
            <DialogDescription>
              Add a plant under the selected client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Plant Name *</Label>
              <Input value={plantForm.name} onChange={(e) => setPlantForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={plantForm.location} onChange={(e) => setPlantForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Vapi, Gujarat" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea rows={2} value={plantForm.address} onChange={(e) => setPlantForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPlantOpen(false)}>Cancel</Button>
            <Button onClick={savePlant} disabled={savingPlant}>
              {savingPlant ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Plant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-xs">{value ?? "—"}</div>
      </div>
    </div>
  );
}

const _ = Database; // (kept import to avoid tree-shake warning)
export { _ };
