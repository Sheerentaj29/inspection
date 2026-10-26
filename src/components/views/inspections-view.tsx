"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  Calendar,
  User as UserIcon,
  Camera,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api-client";

interface InspectionItem {
  id: string;
  inspectionDate: string;
  inspectionType: string;
  status: string;
  summary: string | null;
  photoCount: number;
  reportPath: string | null;
  equipment: {
    id: string;
    equipmentId: string;
    name: string;
    tagNumber: string | null;
    type: string;
    client: { id: string; name: string };
    plant: { id: string; name: string; location: string | null };
  };
  inspector: { id: string; name: string; email: string };
}

const STATUS_COLOR: Record<string, string> = {
  Completed: "border-emerald-500 text-emerald-700",
  "In-Progress": "border-blue-500 text-blue-700",
  Scheduled: "border-zinc-400 text-zinc-600",
  Failed: "border-red-500 text-red-700",
};

export function InspectionsView() {
  const { refreshKey, openEquipment } = useAppStore();
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void apiFetch<{ items: InspectionItem[] }>("/api/inspections")
      .then((r) => {
        if (!mounted) return;
        setItems(r.items);
      })
      .catch(() => {})
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  const filtered = items.filter((i) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      i.equipment.equipmentId.toLowerCase().includes(needle) ||
      i.equipment.name.toLowerCase().includes(needle) ||
      i.equipment.tagNumber?.toLowerCase().includes(needle) ||
      i.equipment.client.name.toLowerCase().includes(needle) ||
      i.inspectionType.toLowerCase().includes(needle) ||
      i.inspector.name.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inspections</h1>
          <p className="text-sm text-muted-foreground">
            All inspection records across equipment, newest first.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by equipment, client, type..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Recent Inspections
          </CardTitle>
          <CardDescription>
            Showing up to 200 most recent inspections.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center gap-2 p-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading inspections...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="p-8 text-center text-muted-foreground text-sm">
              No inspections recorded yet.
            </p>
          )}
          {!loading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Client / Plant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead className="text-center">Photos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((insp) => (
                    <TableRow
                      key={insp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEquipment(insp.equipment.id)}
                    >
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(insp.inspectionDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{insp.equipment.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {insp.equipment.equipmentId}
                          {insp.equipment.tagNumber ? ` · ${insp.equipment.tagNumber}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">{insp.equipment.client.name}</div>
                        <div className="text-xs text-muted-foreground">{insp.equipment.plant.name}</div>
                      </TableCell>
                      <TableCell className="text-sm">{insp.inspectionType}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLOR[insp.status] ?? ""}>
                          {insp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3 text-muted-foreground" />
                          {insp.inspector.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Camera className="h-3 w-3 text-muted-foreground" />
                          {insp.photoCount}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">Prototype note:</strong> Clicking an
          inspection opens the parent equipment detail where the inspection is
          listed in its history. Photo upload, signed PDF generation, and
          scheduled-inspection workflows are <em>not</em> implemented in this
          build — they are stubbed as <code>photoCount</code> and <code>reportPath</code>{" "}
          text fields. Use the in-equipment “New Inspection” button to record
          visual findings and free-form measurements.
        </CardContent>
      </Card>
    </div>
  );
}
