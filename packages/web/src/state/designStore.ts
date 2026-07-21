// Zustand store holding the user's DesignDoc + derived solve result.
// Live re-solve is debounced 300 ms per spec §5.2 / §6.6.

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  loadCatalog,
  solve,
  DESTINATION_DELTA_V_M_S,
  type Catalog,
  type DesignDoc,
  type DestinationId,
  type LaunchAssistConfig,
  type MissionType,
  type ModuleId,
  type SolveResult,
  type StackEntry,
  type AllocationMode,
} from '@propelx/engine';

const catalog: Catalog = loadCatalog();

function initialDesign(): DesignDoc {
  return {
    schema_version: '1.0',
    mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 3_500, crewed: false },
    stack: [],
    allocation_mode: 'auto',
    manual_allocation_m_s: null,
  };
}

function reindex(stack: StackEntry[]): StackEntry[] {
  return stack.map((s, i) => ({ ...s, position: i + 1 }));
}

export interface DesignState {
  catalog: Catalog;
  design: DesignDoc;
  solveResult: SolveResult;

  // mission actions
  setMissionType(type: MissionType): void;
  setDestination(dest: DestinationId, customDv?: number): void;
  setPayload(kg: number): void;
  setCrewed(crewed: boolean): void;

  // stack actions
  insertStage(module_id: ModuleId, atIndex?: number): void;
  removeStage(atIndex: number): void;
  moveStage(fromIndex: number, toIndex: number): void;

  // boosters (§3.2)
  setStage1BoosterCount(count: 0 | 2 | 4): void;

  // tech-level slider (PLAN §6 Q2). Pass undefined to reset to archetype default.
  setStageStructuralFraction(index: number, eps: number | undefined): void;

  // Electro-magnetic launch assist (add-on).
  setLaunchAssistEnabled(enabled: boolean): void;
  updateLaunchAssist(patch: Partial<LaunchAssistConfig>): void;

  // allocation actions
  setAllocationMode(mode: AllocationMode): void;
  setManualAllocation(dv: number[] | null): void;

  // UI state — which stage's detail drawer is open (null = closed)
  drawerStageIndex: number | null;
  openStageDrawer(index: number): void;
  closeStageDrawer(): void;

  // hydration (URL restore)
  hydrateDesign(design: DesignDoc): void;

  // Reset the design back to a fresh state — empty stack, LEO/3.5t comsat,
  // no launch assist, auto allocation. Also closes any open stage drawer
  // and clears the URL hash so a page reload starts truly fresh.
  resetDesign(): void;
}

function recompute(design: DesignDoc): SolveResult {
  return solve(design, catalog);
}

export const useDesignStore = create<DesignState>()(
  subscribeWithSelector((set, get) => {
    const initial = initialDesign();
    return {
      catalog,
      design: initial,
      solveResult: recompute(initial),
      drawerStageIndex: null,

      setMissionType(type) {
        const design = { ...get().design };
        design.mission = { ...design.mission, type };
        // Snap the destination to a sensible default for the chosen mode so
        // the user isn't left with, e.g., "LEO" while in in-space mode.
        const defaultDest = type === 'in-space' ? 'LEO_TO_GTO' : 'LEO';
        design.mission = {
          ...design.mission,
          destination: defaultDest,
          delta_v_m_s: DESTINATION_DELTA_V_M_S[defaultDest as Exclude<DestinationId, 'CUSTOM'>],
        };
        set({ design, solveResult: recompute(design) });
      },

      setDestination(dest, customDv) {
        const design = { ...get().design };
        const dv =
          dest === 'CUSTOM'
            ? (customDv ?? design.mission.delta_v_m_s)
            : DESTINATION_DELTA_V_M_S[dest as Exclude<DestinationId, 'CUSTOM'>];
        design.mission = { ...design.mission, destination: dest, delta_v_m_s: dv };
        set({ design, solveResult: recompute(design) });
      },

      setPayload(kg) {
        const design = { ...get().design };
        design.mission = { ...design.mission, payload_kg: kg };
        set({ design, solveResult: recompute(design) });
      },

      setCrewed(crewed) {
        const design = { ...get().design };
        design.mission = { ...design.mission, crewed };
        set({ design, solveResult: recompute(design) });
      },

      insertStage(module_id, atIndex) {
        const { design } = get();
        const stack = design.stack.slice();
        const idx = atIndex ?? stack.length;
        const clamped = Math.max(0, Math.min(idx, stack.length));
        stack.splice(clamped, 0, { position: 0, module_id });
        const next: DesignDoc = { ...design, stack: reindex(stack) };
        set({ design: next, solveResult: recompute(next) });
      },

      removeStage(atIndex) {
        const { design } = get();
        const stack = design.stack.slice();
        if (atIndex < 0 || atIndex >= stack.length) return;
        stack.splice(atIndex, 1);
        const next: DesignDoc = { ...design, stack: reindex(stack) };
        set({ design: next, solveResult: recompute(next) });
      },

      moveStage(fromIndex, toIndex) {
        const { design } = get();
        if (fromIndex === toIndex) return;
        const stack = design.stack.slice();
        if (fromIndex < 0 || fromIndex >= stack.length) return;
        if (toIndex < 0 || toIndex >= stack.length) return;
        const [entry] = stack.splice(fromIndex, 1);
        if (!entry) return;
        stack.splice(toIndex, 0, entry);
        const next: DesignDoc = { ...design, stack: reindex(stack) };
        set({ design: next, solveResult: recompute(next) });
      },

      setStage1BoosterCount(count) {
        const { design } = get();
        if (design.stack.length === 0) return;
        const stack = design.stack.slice();
        const s1 = { ...stack[0]! };
        if (count === 0) {
          delete s1.boosters;
        } else {
          s1.boosters = { module_id: 'solid', count };
        }
        stack[0] = s1;
        const next: DesignDoc = { ...design, stack };
        set({ design: next, solveResult: recompute(next) });
      },

      setLaunchAssistEnabled(enabled) {
        const { design } = get();
        const existing = design.launch_assist;
        const defaults: LaunchAssistConfig = {
          enabled,
          system_type: 'linear_motor',
          exit_velocity_m_s: 500,
          track_angle_deg: 10,
          base_elevation_km: 3,
          peak_acceleration_g: 3,
          vehicle_cross_section_m2: 5,
          drag_coefficient: 0.3,
          partial_vacuum: false,
          drive_efficiency: 0.85,
        };
        const next: DesignDoc = {
          ...design,
          launch_assist: existing ? { ...existing, enabled } : defaults,
        };
        set({ design: next, solveResult: recompute(next) });
      },

      updateLaunchAssist(patch) {
        const { design } = get();
        if (!design.launch_assist) return;
        const next: DesignDoc = {
          ...design,
          launch_assist: { ...design.launch_assist, ...patch },
        };
        set({ design: next, solveResult: recompute(next) });
      },

      setStageStructuralFraction(index, eps) {
        const { design } = get();
        if (index < 0 || index >= design.stack.length) return;
        const stack = design.stack.slice();
        const entry = { ...stack[index]! };
        if (eps === undefined) {
          delete entry.structural_fraction_override;
        } else {
          entry.structural_fraction_override = eps;
        }
        stack[index] = entry;
        const next: DesignDoc = { ...design, stack };
        set({ design: next, solveResult: recompute(next) });
      },

      setAllocationMode(mode) {
        const design = { ...get().design, allocation_mode: mode };
        set({ design, solveResult: recompute(design) });
      },

      openStageDrawer(index) {
        set({ drawerStageIndex: index });
      },
      closeStageDrawer() {
        set({ drawerStageIndex: null });
      },

      setManualAllocation(dv) {
        const design = { ...get().design, manual_allocation_m_s: dv };
        set({ design, solveResult: recompute(design) });
      },

      hydrateDesign(design) {
        const clean: DesignDoc = { ...design, stack: reindex(design.stack) };
        set({ design: clean, solveResult: recompute(clean) });
      },

      resetDesign() {
        const fresh = initialDesign();
        // Clear the URL hash so a reload doesn't rehydrate the old design.
        if (typeof window !== 'undefined') {
          try {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          } catch {
            // ignore — hash clearing is a nicety, not required
          }
        }
        set({
          design: fresh,
          solveResult: recompute(fresh),
          drawerStageIndex: null,
        });
      },
    };
  }),
);
