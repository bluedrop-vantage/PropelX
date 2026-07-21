// Zustand store for Phase 2 economics: assumptions + derived cost + suggestions.
// Kept separate from designStore so recomputing suggestions doesn't cascade
// through the whole Phase 1 render tree.

import { create } from 'zustand';
import {
  DEFAULT_ASSUMPTIONS,
  estimateCost,
  runSuggestions,
  type CostAssumptions,
  type CostBreakdown,
  type Suggestion,
} from '@propelx/suggestions';
import type { DesignDoc, SolveResult } from '@propelx/engine';
import { useDesignStore } from './designStore.js';

interface EconomicsState {
  assumptions: CostAssumptions;
  cost: CostBreakdown;
  suggestions: Suggestion[];
  economicsTabOpen: boolean;

  setAssumptions(next: Partial<CostAssumptions>): void;
  setReuse(next: Partial<CostAssumptions['reuse']>): void;
  resetAssumptions(): void;
  setEconomicsTabOpen(open: boolean): void;

  // Called by App.tsx after wiring.
  recompute(): void;
}

function computeAll(assumptions: CostAssumptions) {
  const { catalog, design, solveResult } = useDesignStore.getState();
  const cost = estimateCost(design, solveResult, assumptions, catalog);
  // Only run suggestions when the economics tab is visible (perf per PLAN M10).
  const suggestions =
    useEconomicsStore.getState().economicsTabOpen
      ? runSuggestions({ design, solve: solveResult, cost, assumptions }, catalog)
      : [];
  return { cost, suggestions };
}

export const useEconomicsStore = create<EconomicsState>()((set, get) => ({
  assumptions: DEFAULT_ASSUMPTIONS,
  cost: {
    propellantUsd: 0,
    hardwareUsd: 0,
    vehicleUsd: 0,
    costPerFlightUsd: 0,
    costPerKgOrbitUsd: 0,
    opsComplexity: 1,
    toxicityScore: 0,
    reuseSuitability: 1,
    perStage: [],
  },
  suggestions: [],
  economicsTabOpen: false,

  setAssumptions(next) {
    const merged = { ...get().assumptions, ...next };
    const { cost, suggestions } = computeAll(merged);
    set({ assumptions: merged, cost, suggestions });
  },

  setReuse(next) {
    const merged: CostAssumptions = {
      ...get().assumptions,
      reuse: { ...get().assumptions.reuse, ...next },
    };
    const { cost, suggestions } = computeAll(merged);
    set({ assumptions: merged, cost, suggestions });
  },

  resetAssumptions() {
    const { cost, suggestions } = computeAll(DEFAULT_ASSUMPTIONS);
    set({ assumptions: DEFAULT_ASSUMPTIONS, cost, suggestions });
  },

  setEconomicsTabOpen(open) {
    set({ economicsTabOpen: open });
    // Recompute suggestions if we just opened the tab.
    if (open) {
      const { cost, suggestions } = computeAll(get().assumptions);
      set({ cost, suggestions });
    }
  },

  recompute() {
    const { cost, suggestions } = computeAll(get().assumptions);
    set({ cost, suggestions });
  },
}));

// Auto-recompute economics whenever the design solve changes.
useDesignStore.subscribe(
  (s) => s.solveResult,
  () => {
    useEconomicsStore.getState().recompute();
  },
);

// Apply a suggestion's counterfactual to the design store.
export function applySuggestion(design: DesignDoc, _solve: SolveResult): void {
  useDesignStore.getState().hydrateDesign(design);
}
