"use client";

import {
  LayoutDashboard,
  Database,
  FileText,
  Building2,
  Upload,
  ScrollText,
  ShieldCheck,
  LogOut,
  HardHat,
  Gauge,
  Ruler,
} from "lucide-react";
import { useAppStore, type ViewKey } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV: Array<{ key: ViewKey; label: string; icon: React.ElementType; adminOnly?: boolean; roles?: string[] }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "equipment", label: "Equipment Master", icon: Database },
  { key: "pipeline-reports", label: "Pipeline Reports", icon: Gauge, roles: ["ADMIN", "INSPECTOR", "APPROVER"] },
  { key: "inspections", label: "Inspections", icon: FileText },
  { key: "clients", label: "Clients & Plants", icon: Building2, adminOnly: true },
  { key: "pipe-standards", label: "Pipe Standards", icon: Ruler, adminOnly: true },
  { key: "import", label: "CSV Import / Export", icon: Upload, adminOnly: true },
  { key: "audit-logs", label: "Audit Log", icon: ScrollText, adminOnly: true },
];

export function AppSidebar() {
  const { view, setView, user, setUser } = useAppStore();
  if (!user) return null;
  const visibleNav = NAV.filter((n) => {
    if (n.adminOnly) return user.role === "ADMIN";
    if (n.roles && !n.roles.includes(user.role)) return false;
    return true;
  });

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <HardHat className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight leading-tight">
            Inspection Report
          </span>
          <span className="text-xs text-sidebar-foreground/70 leading-tight">
            Automation System
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = view === item.key;
            return (
              <li key={item.key}>
                <button
                  onClick={() => setView(item.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-bold uppercase">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">
              {user.name}
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] uppercase border-sidebar-primary/50 text-sidebar-primary"
              >
                {user.role === "ADMIN" ? "Administrator" : user.role === "APPROVER" ? "Approver" : "Inspector"}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          onClick={async () => {
            await fetch("/api/auth", { method: "DELETE", credentials: "include" });
            setUser(null);
            setView("dashboard");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
        <div className="mt-3 flex items-center gap-1.5 px-1 text-[10px] text-sidebar-foreground/60">
          <ShieldCheck className="h-3 w-3" />
          <span>DEMO BUILD · Use for evaluation only</span>
        </div>
      </div>
    </aside>
  );
}
