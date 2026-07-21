// Phase 2 economics + suggestions types.
// Cost model per spec §10.1; suggestions per §10.2.

import type { DesignDoc, SolveResult } from '@propelx/engine';

/**
 * Editable cost assumptions surfaced in the Assumptions Drawer (§10.1).
 * All values are illustrative 2020s figures; the UI is required to label
 * them as rough estimates the user can edit.
 */
export interface CostAssumptions {
  propellant_usd_per_kg: {
    solid_grain: number;
    kerolox_fuel: number;
    kerolox_ox: number;
    methalox_fuel: number;
    methalox_ox: number;
    hydrolox_fuel: number;
    hydrolox_ox: number;
    hypergolic_fuel: number;
    hypergolic_ox: number;
  };
  hardware_usd_per_kg_dry: {
    solid: number;
    kerolox: number;
    methalox: number;
    hydrolox: number;
    hypergolic: number;
    coldgas: number;
    ion: number;
  };
  // Reuse-toggle inputs (§10.1 stretch).
  reuse: {
    enabled: boolean;
    flightsAmortized: number; // hardware cost / N flights
    // Effective performance penalty on Stage 1 (Δv tax modeled at solve time).
    stage1PenaltyFraction: number; // e.g. 0.30 per spec
  };
}

export interface CostBreakdown {
  propellantUsd: number;
  hardwareUsd: number;
  vehicleUsd: number; // propellant + hardware (single flight, expendable view)
  costPerFlightUsd: number; // with reuse amortization applied
  costPerKgOrbitUsd: number;
  opsComplexity: number; // 1–10 (from archetype ops multipliers folded together)
  toxicityScore: number; // 0–5 max across stages
  reuseSuitability: number; // 1–5 average
  perStage: Array<{
    position: number;
    propellantUsd: number;
    hardwareUsd: number;
    opsComplexity: number;
  }>;
}

export interface SuggestionImpact {
  glowChangePct: number;
  costPerKgChangePct: number;
  costPerFlightChangePct: number;
}

export interface Suggestion {
  ruleId: SuggestionRuleId;
  title: string;
  body: string;
  impact?: SuggestionImpact;
  // If the suggestion is applicable, holds the mutated design to apply.
  counterfactual?: DesignDoc;
}

export type SuggestionRuleId = 'S-1' | 'S-2' | 'S-3' | 'S-4' | 'S-5' | 'S-6' | 'S-7';

export interface SuggestionContext {
  design: DesignDoc;
  solve: SolveResult;
  cost: CostBreakdown;
  assumptions: CostAssumptions;
}
