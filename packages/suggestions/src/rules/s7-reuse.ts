// S-7: reuse off + high modeled flight rate → run reuse counterfactual + report
// the break-even flight count (§10.4 test 2).

import type { Catalog } from '@propelx/engine';
import { evaluateCounterfactual, impactOf } from '../counterfactual.js';
import type { Suggestion, SuggestionContext } from '../types.js';

const HIGH_FLIGHT_RATE_THRESHOLD = 5;

export function evalS7(ctx: SuggestionContext, catalog: Catalog): Suggestion | null {
  const { design, solve, cost, assumptions } = ctx;
  if (!solve.valid) return null;
  if (assumptions.reuse.enabled) return null;
  if (assumptions.reuse.flightsAmortized < HIGH_FLIGHT_RATE_THRESHOLD) return null;

  // Reuse counterfactual: same design, reuse toggle ON.
  const altAssumptions = {
    ...assumptions,
    reuse: { ...assumptions.reuse, enabled: true },
  };
  const cf = evaluateCounterfactual(design, catalog, altAssumptions);
  if (!cf.solve.valid) return null;

  // Break-even flight count: how many flights until reuse hardware amortization
  // matches expendable single-flight cost? Approximated as:
  //   N = stage1_hardware / (expendable_cost - upper_stages_hardware - propellant)
  // Guard: if reuse never wins, don't fire.
  const stage1Hardware = cost.perStage[0]?.hardwareUsd ?? 0;
  const upperHardware = cost.perStage.slice(1).reduce((a, s) => a + s.hardwareUsd, 0);
  const denom = cost.costPerFlightUsd - upperHardware - cost.propellantUsd;
  const breakEven = denom > 0 ? Math.max(1, Math.ceil(stage1Hardware / denom)) : Infinity;
  if (!isFinite(breakEven)) return null;

  const impact = impactOf({ solve, cost }, cf);
  return {
    ruleId: 'S-7',
    title: `Reuse becomes cheaper around flight ${breakEven}`,
    body:
      `Reuse costs ~30 % of Stage-1 payload capacity as landing propellant + hardware. ` +
      `At the ${assumptions.reuse.flightsAmortized}-flight amortization already set, ` +
      `cost-per-kg-to-orbit shifts ${impact.costPerKgChangePct >= 0 ? '+' : ''}${impact.costPerKgChangePct.toFixed(1)}%. ` +
      `Break-even at ~${breakEven} flights.`,
    impact,
    // Deliberately no `counterfactual`: the Apply action for reuse is a
    // toggle in the Assumptions Drawer, not a design mutation. Impact
    // numbers above come from a reuse-on counterfactual.
  };
}
