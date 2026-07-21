// S-1: propellant commonality across stages 1 and 2.
// Trigger: stages 1 and 2 use different propellants AND the common-propellant
// variant loses less than 10 % payload capacity vs. the mixed design.
// Suggestion: consolidate on one family for infrastructure + engine reuse.

import type { Catalog, DesignDoc } from '@propelx/engine';
import { cloneDesign, evaluateCounterfactual, impactOf } from '../counterfactual.js';
import type { Suggestion, SuggestionContext } from '../types.js';

export function evalS1(ctx: SuggestionContext, catalog: Catalog): Suggestion | null {
  const { design, solve, cost, assumptions } = ctx;
  if (!solve.valid || design.stack.length < 2) return null;
  const s1Id = design.stack[0]!.module_id;
  const s2Id = design.stack[1]!.module_id;
  if (s1Id === s2Id) return null;

  // Candidate 1: unify on stage-1's propellant (upper stages copy S1).
  const altToS1: DesignDoc = cloneDesign(design);
  for (let i = 1; i < altToS1.stack.length; i++) altToS1.stack[i]!.module_id = s1Id;

  // Candidate 2: unify on stage-2's propellant (only if it's lift-capable).
  const s2Mod = catalog.byId(s2Id);
  const candidates: DesignDoc[] = [altToS1];
  if (s2Mod.lift_capable) {
    const altToS2: DesignDoc = cloneDesign(design);
    for (const s of altToS2.stack) s.module_id = s2Id;
    candidates.push(altToS2);
  }

  const evaluated = candidates
    .map((d) => evaluateCounterfactual(d, catalog, assumptions))
    .filter((c) => c.solve.valid);
  if (evaluated.length === 0) return null;

  // Choose the counterfactual with the lower cost-per-kg-to-orbit.
  const chosen = evaluated.sort((a, b) => a.cost.costPerKgOrbitUsd - b.cost.costPerKgOrbitUsd)[0]!;

  const basePf = solve.payload_fraction;
  const altPf = chosen.solve.payload_fraction;
  const payloadLossPct = basePf > 0 ? ((basePf - altPf) / basePf) * 100 : 0;
  if (payloadLossPct >= 10) return null;

  const impact = impactOf({ solve, cost }, chosen);
  const chosenModId = chosen.design.stack[0]!.module_id;
  return {
    ruleId: 'S-1',
    title: 'Consolidate to a single propellant family',
    body:
      `A ${catalog.byId(chosenModId).name} stack cuts engine and pad infrastructure. ` +
      `Payload fraction drops ${payloadLossPct.toFixed(1)}%; ` +
      `cost-per-kg-to-orbit changes ${impact.costPerKgChangePct >= 0 ? '+' : ''}${impact.costPerKgChangePct.toFixed(1)}%.`,
    impact,
    counterfactual: chosen.design,
  };
}
