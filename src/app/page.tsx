"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { apiFetch, registerUnauthorizedHandler } from "@/lib/api-client";
import { LoginScreen } from "@/components/login-screen";
import { AppSidebar } from "@/components/layout/sidebar";
import { DashboardView } from "@/components/views/dashboard-view";
import { EquipmentListView } from "@/components/views/equipment-list-view";
import { EquipmentFormView } from "@/components/views/equipment-form-view";
import { EquipmentDetailView } from "@/components/views/equipment-detail-view";
import { ClientsView } from "@/components/views/clients-view";
import { ImportView } from "@/components/views/import-view";
import { InspectionsView } from "@/components/views/inspections-view";
import { AuditLogView } from "@/components/views/audit-log-view";
import { PipelineReportsListView } from "@/components/views/pipeline-reports-list-view";
import { PipelineReportFormView } from "@/components/views/pipeline-report-form-view";
import { PipelineReportDetailView } from "@/components/views/pipeline-report-detail-view";
import { PipeStandardsView } from "@/components/views/pipe-standards-view";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "INSPECTOR" | "APPROVER";
}

export default function Home() {
  const { user, setUser, setView, view } = useAppStore();
  const [bootChecked, setBootChecked] = useState(false);
  // When true, login screen shows a "your session has expired" banner
  // instead of the default greeting.
  const [sessionExpired, setSessionExpired] = useState(false);
  // Avoid re-entrant logout — if multiple API calls return 401 at the
  // same time, we only want to log out once.
  const loggingOutRef = useRef(false);

  // Register a single global handler that fires whenever any API request
  // returns 401. This causes the user state to clear and the LoginScreen
  // to show with a "session expired" banner, instead of letting each
  // individual view show its own "Failed to load: Unauthorized" error.
  useEffect(() => {
    const unregister = registerUnauthorizedHandler(() => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      // Clear the user state — this triggers re-render → LoginScreen shows
      setUser(null);
      setView("dashboard");
      setSessionExpired(true);
      // Also call DELETE /api/auth to clear the cookie server-side,
      // so the next login attempt starts fresh.
      void fetch("/api/auth", { method: "DELETE", credentials: "include" })
        .catch(() => {})
        .finally(() => {
          loggingOutRef.current = false;
        });
    });
    return unregister;
  }, [setUser, setView]);

  // Re-hydrate session on first render
  useEffect(() => {
    apiFetch<{ user: SessionUser | null }>("/api/auth")
      .then((r) => {
        if (r.user) setUser(r.user);
      })
      .catch(() => {})
      .finally(() => setBootChecked(true));
  }, [setUser]);

  if (!bootChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen sessionExpired={sessionExpired} onDismissExpired={() => setSessionExpired(false)} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {view === "dashboard" && <DashboardView />}
          {view === "equipment" && <EquipmentListView />}
          {view === "equipment-detail" && <EquipmentDetailView />}
          {view === "equipment-form" && <EquipmentFormView />}
          {view === "inspections" && <InspectionsView />}
          {view === "clients" && <ClientsView />}
          {view === "import" && <ImportView />}
          {view === "audit-logs" && <AuditLogView />}
          {view === "pipeline-reports" && <PipelineReportsListView />}
          {view === "pipeline-report-form" && <PipelineReportFormView />}
          {view === "pipeline-report-detail" && <PipelineReportDetailView />}
          {view === "pipe-standards" && <PipeStandardsView />}
        </div>
      </main>
    </div>
  );
}
