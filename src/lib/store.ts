// Global app state for the Equipment Master UI.
// Tracks current session, navigation target, and refresh counters
// so list views can re-fetch after mutations.

import { create } from "zustand";

export type ViewKey =
  | "dashboard"
  | "equipment"
  | "equipment-detail"
  | "equipment-form"
  | "inspections"
  | "clients"
  | "import"
  | "audit-logs"
  | "pipeline-reports"
  | "pipeline-report-form"
  | "pipeline-report-detail"
  | "pipe-standards";

interface AppState {
  view: ViewKey;
  // For equipment-detail view: the equipment ID to show
  selectedEquipmentId: string | null;
  // For equipment-form view: null = create mode; ID = edit mode
  editingEquipmentId: string | null;
  // For inspection entry, pre-selected client (filter)
  inspectionClientId: string | null;
  // For pipeline-report-detail: the report ID to show
  selectedPipelineReportId: string | null;
  // For pipeline-report-form: null = create mode; ID = edit mode
  editingPipelineReportId: string | null;
  // Bump this counter to force re-fetches after mutations
  refreshKey: number;
  // Session
  user: { id: string; email: string; name: string; role: "ADMIN" | "INSPECTOR" | "APPROVER" } | null;
  setView: (v: ViewKey) => void;
  openEquipment: (id: string) => void;
  openNewEquipment: () => void;
  openEditEquipment: (id: string) => void;
  openPipelineReport: (id: string) => void;
  openNewPipelineReport: () => void;
  openEditPipelineReport: (id: string) => void;
  setUser: (u: AppState["user"]) => void;
  refresh: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "dashboard",
  selectedEquipmentId: null,
  editingEquipmentId: null,
  inspectionClientId: null,
  selectedPipelineReportId: null,
  editingPipelineReportId: null,
  refreshKey: 0,
  user: null,
  setView: (v) => set({ view: v }),
  openEquipment: (id) => set({ view: "equipment-detail", selectedEquipmentId: id }),
  openNewEquipment: () =>
    set({ view: "equipment-form", editingEquipmentId: null }),
  openEditEquipment: (id) =>
    set({ view: "equipment-form", editingEquipmentId: id }),
  openPipelineReport: (id) =>
    set({ view: "pipeline-report-detail", selectedPipelineReportId: id }),
  openNewPipelineReport: () =>
    set({ view: "pipeline-report-form", editingPipelineReportId: null }),
  openEditPipelineReport: (id) =>
    set({ view: "pipeline-report-form", editingPipelineReportId: id }),
  setUser: (u) => set({ user: u }),
  refresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
