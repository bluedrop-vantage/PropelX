// Counterfactual: mutate a design, re-solve, re-cost, report delta impact.
// Used by every suggestion rule that wants "what would happen if…" numbers.
// PLAN M10 requires impact numbers be computed, not canned.

import { solve, type Catalog, type DesignDoc, type SolveResult } from '@propelx/engine';
import { estimateCost } from './economics.js';
import type { CostAssumptions, CostBreakdown, SuggestionImpact } from './types.js';

export interface Counterfactual {
  design: DesignDoc;
  solve: SolveResult;
  cost: CostBreakdown;
}

export function evaluateCounterfactual(
  design: DesignDoc,
  catalog: Catalog,
  assumptions: CostAssumptions,
): Counterfactual {
  const s = solve(design, catalog);
  const c = estimateCost(design, s, assumptions, catalog);
  return { design, solve: s, cost: c };
}

export function impactOf(base: { solve: SolveResult; cost: CostBreakdown }, alt: Counterfactual): SuggestionImpact {
  const glowChangePct = base.solve.glow_kg > 0 ? ((alt.solve.glow_kg - base.solve.glow_kg) / base.solve.glow_kg) * 100 : 0;
  const costPerKgChangePct = base.cost.costPerKgOrbitUsd > 0
    ? ((alt.cost.costPerKgOrbitUsd - base.cost.costPerKgOrbitUsd) / base.cost.costPerKgOrbitUsd) * 100
    : 0;
  const costPerFlightChangePct = base.cost.costPerFlightUsd > 0
    ? ((alt.cost.costPerFlightUsd - base.cost.costPerFlightUsd) / base.cost.costPerFlightUsd) * 100
    : 0;
  return { glowChangePct, costPerKgChangePct, costPerFlightChangePct };
}

/** Deep-clone a design so mutations don't leak. */
export function cloneDesign(d: DesignDoc): DesignDoc {
  return JSON.parse(JSON.stringify(d)) as DesignDoc;
}
