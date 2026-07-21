// S-5: stage count > 3 → reliability note + cost comparison against a 2-stage design.

import type { Catalog } from '@propelx/engine';
import { cloneDesign, evaluateCounterfactual, impactOf } from '../counterfactual.js';
import type { Suggestion, SuggestionContext } from '../types.js';

export function evalS5(ctx: SuggestionContext, catalog: Catalog): Suggestion | null {
  const { design, solve, cost, assumptions } = ctx;
  if (!solve.valid || design.stack.length <= 3) return null;

  // Counterfactual: collapse to a 2-stage version by keeping S1 and the
  // best-Isp upper. This is a heuristic reduction, not a hard equivalence.
  const s1 = design.stack[0]!;
  const upperCandidates = design.stack.slice(1);
  upperCandidates.sort((a, b) => catalog.byId(b.module_id).isp_vac_s - catalog.byId(a.module_id).isp_vac_s);
  const bestUpper = upperCandidates[0];
  if (!bestUpper) return null;

  const alt = cloneDesign(design);
  alt.stack = [
    { ...s1, position: 1 },
    { ...bestUpper, position: 2 },
  ];
  const cf = evaluateCounterfactual(alt, catalog, assumptions);
  if (!cf.solve.valid) return null;

  const impact = impactOf({ solve, cost }, cf);
  return {
    ruleId: 'S-5',
    title: `Every staging event is a failure mode`,
    body:
      `A ${design.stack.length}-stage vehicle has ${design.stack.length - 1} separation events. ` +
      `A 2-stage variant might reach the same target with less coupling risk. ` +
      `GLOW ${impact.glowChangePct >= 0 ? '+' : ''}${impact.glowChangePct.toFixed(1)}%, ` +
      `cost-per-kg ${impact.costPerKgChangePct >= 0 ? '+' : ''}${impact.costPerKgChangePct.toFixed(1)}%.`,
    impact,
    counterfactual: cf.design,
  };
}
