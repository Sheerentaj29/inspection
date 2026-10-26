"use client";

import { useEffect, useState } from "react";
import {
  ScrollText,
  Loader2,
  User as UserIcon,
  Calendar,
  ShieldCheck,
  Activity,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface AuditItem {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: "border-emerald-500 text-emerald-700",
  UPDATE: "border-blue-500 text-blue-700",
  DELETE: "border-red-500 text-red-700",
  LOGIN: "border-zinc-400 text-zinc-600",
  LOGOUT: "border-zinc-400 text-zinc-600",
  IMPORT: "border-amber-500 text-amber-700",
  EXPORT: "border-amber-500 text-amber-700",
};

export function AuditLogView() {
  const { refreshKey } = useAppStore();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void apiFetch<{ items: AuditItem[]; total: number }>("/api/audit-logs?pageSize=100")
      .then((r) => {
        if (!mounted) return;
        setItems(r.items);
        setTotal(r.total);
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          All create / update / delete / login events on equipment, clients, plants,
          and inspections. Newest first.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4" /> Audit Entries
          </CardTitle>
          <CardDescription>
            {total} total entries · Showing the most recent 100.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center gap-2 p-8 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading audit log...
            </div>
          )}
          {!loading && items.length === 0 && (
            <p className="p-8 text-center text-muted-foreground text-sm">
              No audit entries recorded.
            </p>
          )}
          {!loading && items.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(a.createdAt).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ACTION_COLOR[a.action] ?? ""}>
                          {a.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5">
                          {a.entity === "User" ? (
                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Activity className="h-3 w-3 text-muted-foreground" />
                          )}
                          {a.entity}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{a.userName ?? "system"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.details ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Audit coverage:</strong> All
            create / update / delete operations on equipment, clients, plants,
            and inspections are recorded with the actor identity, timestamp, and
            a human-readable summary. CSV imports, exports, and login events
            are also tracked. Inspection <em>creation</em> is logged; inspection{" "}
            <em>deletion</em> (via equipment cascade) is implicit and not
            individually recorded in this prototype.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
