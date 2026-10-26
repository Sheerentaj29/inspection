"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search,
  Plus,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { apiFetch } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface EquipmentListItem {
  id: string;
  equipmentId: string;
  name: string;
  category: string;
  type: string;
  orientation: string | null;
  tagNumber: string | null;
  material: string | null;
  verificationStatus: "Verified" | "Unverified";
  isDemo: boolean;
  client: { id: string; name: string };
  plant: { id: string; name: string; location: string | null };
  _count: { inspections: number };
  createdAt: string;
}

interface EquipmentResponse {
  items: EquipmentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ClientItem {
  id: string;
  name: string;
  plants: Array<{ id: string; name: string; location: string | null; isDemo: boolean }>;
}

const CATEGORY_LABEL: Record<string, string> = {
  STORAGE: "Storage",
  PRESSURE: "Pressure & Process",
  SEPARATION: "Separation & Thermal",
  UTILITY: "Utility",
  PIPE: "Pipes",
  VALVE: "Valves",
  PUMP: "Pumps",
  OTHER: "Other",
};

const SORT_FIELDS: Array<{ key: string; label: string }> = [
  { key: "equipmentId", label: "Equipment ID" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "type", label: "Type" },
  { key: "tagNumber", label: "Tag #" },
  { key: "createdAt", label: "Created" },
];

export function EquipmentListView() {
  const { user, openEquipment, openNewEquipment, refreshKey, setView } = useAppStore();
  const isAdmin = user?.role === "ADMIN";

  // Filter state
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [plantId, setPlantId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [verified, setVerified] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  // Data
  const [data, setData] = useState<EquipmentResponse | null>(null);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQ, clientId, plantId, category, verified, pageSize]);

  // Fetch clients once
  useEffect(() => {
    apiFetch<{ items: ClientItem[] }>("/api/clients")
      .then((r) => setClients(r.items))
      .catch(() => toast.error("Failed to load clients"));
  }, []);

  // Fetch equipment list
  const fetchList = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      q: debouncedQ,
      page: String(page),
      pageSize: String(pageSize),
      sort,
      order,
    });
    if (clientId) params.set("clientId", clientId);
    if (plantId) params.set("plantId", plantId);
    if (category) params.set("category", category);
    if (verified) params.set("verified", verified);
    apiFetch<EquipmentResponse>(`/api/equipment?${params.toString()}`)
      .then((r) => setData(r))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [debouncedQ, page, pageSize, sort, order, clientId, plantId, category, verified]);

  useEffect(() => {
    fetchList();
  }, [fetchList, refreshKey]);

  // Plants filtered by selected client
  const plantsForClient = useMemo(() => {
    if (!clientId) return [];
    return clients.find((c) => c.id === clientId)?.plants ?? [];
  }, [clients, clientId]);

  // Reset plant when client changes
  useEffect(() => {
    setPlantId("");
  }, [clientId]);

  function toggleSort(field: string) {
    if (sort === field) {
      setOrder(order === "asc" ? "desc" : "asc");
    } else {
      setSort(field);
      setOrder("asc");
    }
  }

  function exportCsv() {
    setExporting(true);
    const url = clientId ? `/api/import-export/export?clientId=${clientId}` : `/api/import-export/export`;
    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Export failed");
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        const objUrl = URL.createObjectURL(blob);
        a.href = objUrl;
        a.download = `equipment-master-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objUrl);
        toast.success("CSV export downloaded");
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setExporting(false));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipment Master</h1>
          <p className="text-sm text-muted-foreground">
            Registered industrial equipment across all client plants.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={() => openNewEquipment()}>
              <Plus className="mr-2 h-4 w-4" /> Add Equipment
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Label htmlFor="q" className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="q"
                  className="pl-9"
                  placeholder="Name, ID, tag, type, serial..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Client</Label>
              <Select value={clientId || "ALL"} onValueChange={(v) => setClientId(v === "ALL" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All clients</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Plant</Label>
              <Select value={plantId || "ALL"} onValueChange={(v) => setPlantId(v === "ALL" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All plants" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All plants</SelectItem>
                  {plantsForClient.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Verification</Label>
              <Select value={verified || "ALL"} onValueChange={(v) => setVerified(v === "ALL" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="Verified">Verified only</SelectItem>
                  <SelectItem value="Unverified">Unverified only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-8">
            <div className="lg:col-span-2">
              <Label className="text-xs">Category</Label>
              <Select value={category || "ALL"} onValueChange={(v) => setCategory(v === "ALL" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="lg:col-span-2">
              <Label className="text-xs">Sort by</Label>
              <Select value={sort} onValueChange={(v) => setSort(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_FIELDS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Order</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setOrder(order === "asc" ? "desc" : "asc")}
              >
                {order === "asc" ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />}
                {order === "asc" ? "Ascending" : "Descending"}
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQ("");
                  setClientId("");
                  setPlantId("");
                  setCategory("");
                  setVerified("");
                  setSort("createdAt");
                  setOrder("desc");
                }}
              >
                <Filter className="mr-2 h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("equipmentId")}
                    >
                      Eq. ID <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[260px]">
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("name")}
                    >
                      Name <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Client / Plant</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("category")}
                    >
                      Category <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center gap-1 hover:text-foreground"
                      onClick={() => toggleSort("tagNumber")}
                    >
                      Tag # <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Inspections</TableHead>
                  <TableHead>Verified</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      Loading equipment...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && error && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-red-600 py-6">
                      Error: {error}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && !error && data && data.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No equipment matches the current filters.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && !error && data && data.items.map((eq) => (
                  <TableRow
                    key={eq.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEquipment(eq.id)}
                  >
                    <TableCell className="font-mono text-xs">
                      {eq.equipmentId}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium leading-tight">{eq.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {eq.type}{eq.orientation && ` · ${eq.orientation}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm leading-tight">{eq.client.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {eq.plant.name}{eq.plant.location ? ` · ${eq.plant.location}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {CATEGORY_LABEL[eq.category] ?? eq.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {eq.tagNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {eq.material ?? "—"}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {eq._count.inspections}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
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
                          <Badge variant="outline" className="border-zinc-300 text-zinc-500">
                            DEMO
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && (
            <div className="flex flex-col gap-2 border-t bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Showing <strong>{data.items.length}</strong> of <strong>{data.total}</strong> records · Page <strong>{data.page}</strong> of <strong>{data.totalPages || 1}</strong>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Click any row to open the equipment detail page with full specifications and inspection history.
      </p>
    </div>
  );
}
