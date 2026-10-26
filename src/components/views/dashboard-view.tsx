"use client";

import { useEffect, useState } from "react";
import {
  Database,
  Building2,
  Factory,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { apiFetch } from "@/lib/api-client";

interface DashboardStats {
  totalEquipment: number;
  totalClients: number;
  totalPlants: number;
  totalInspections: number;
  verifiedCount: number;
  unverifiedCount: number;
  demoCount: number;
  byCategory: Array<{ category: string; count: number }>;
  inspectionsByCategory: Record<string, number>;
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

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setView, refreshKey } = useAppStore();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiFetch<DashboardStats>("/api/dashboard")
      .then((s) => mounted && setStats(s))
      .catch((e) => mounted && setError(e.message))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  if (loading) return <div className="p-8 text-zinc-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading dashboard...</div>;
  if (error) return <div className="p-8 text-red-600">Failed to load: {error}</div>;
  if (!stats) return null;

  const cards = [
    { label: "Equipment records", value: stats.totalEquipment, icon: Database, sub: `${stats.demoCount} demo` },
    { label: "Clients", value: stats.totalClients, icon: Building2, sub: "Active clients" },
    { label: "Plants", value: stats.totalPlants, icon: Factory, sub: "Across all clients" },
    { label: "Inspections", value: stats.totalInspections, icon: FileText, sub: "All-time records" },
  ];

  const verifiedPct =
    stats.totalEquipment > 0
      ? Math.round((stats.verifiedCount / stats.totalEquipment) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipment Master Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Operational overview of registered equipment, plants and inspection history.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="default" onClick={() => setView("equipment")}>
            <Database className="mr-2 h-4 w-4" /> Open Equipment List
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {c.label}
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{c.value}</div>
                  <div className="text-xs text-muted-foreground">{c.sub}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Verification Status
            </CardTitle>
            <CardDescription>
              Equipment specifications flagged Verified vs. Unverified.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Verified</span>
              <span className="text-lg font-semibold tabular-nums text-emerald-700">
                {stats.verifiedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Unverified</span>
              <span className="text-lg font-semibold tabular-nums text-amber-700">
                {stats.unverifiedCount}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Verified share</span>
                <span className="font-semibold">{verifiedPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${verifiedPct}%` }}
                />
              </div>
            </div>
            <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
              <AlertTriangle className="mb-1 inline h-3 w-3" /> Unverified dimensions must
              not be used as engineering or inspection acceptance values.
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="h-4 w-4" /> Equipment by Category
            </CardTitle>
            <CardDescription>
              Distribution of registered equipment across industrial categories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byCategory
                .sort((a, b) => b.count - a.count)
                .map((row) => {
                  const max = Math.max(...stats.byCategory.map((c) => c.count));
                  const pct = max > 0 ? (row.count / max) * 100 : 0;
                  return (
                    <div key={row.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {CATEGORY_LABEL[row.category] ?? row.category}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {row.count}
                          <span className="ml-3 text-xs">
                            · {stats.inspectionsByCategory[row.category] ?? 0} inspections
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full bg-zinc-800 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setView("equipment")}>
                View full list <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="flex items-start gap-3 p-4">
          <Badge variant="outline" className="border-amber-500 text-amber-800 bg-white">
            DEMO
          </Badge>
          <p className="text-xs text-amber-900">
            This environment contains demo data labeled with the{" "}
            <code className="rounded bg-amber-100 px-1">DEMO</code> suffix on client
            names and the{" "}
            <code className="rounded bg-amber-100 px-1">UNVERIFIED</code> flag on
            equipment specifications whose dimensions have not been confirmed
            from approved drawings, manufacturer records, nameplates or verified
            field measurements. Treat all dimensions marked Unverified as
            illustrative only — they must never be used as actual plant
            specifications, engineering design values, safety limits, or
            inspection acceptance criteria.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
