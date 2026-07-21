// S-2: hydrolox on Stage 1 → suggest methalox/kerolox first stage.

import type { Catalog, DesignDoc, ModuleId } from '@propelx/engine';
import { cloneDesign, evaluateCounterfactual, impactOf } from '../counterfactual.js';
import type { Suggestion, SuggestionContext } from '../types.js';

export function evalS2(ctx: SuggestionContext, catalog: Catalog): Suggestion | null {
  const { design, solve, cost, assumptions } = ctx;
  if (!solve.valid || design.stack.length === 0) return null;
  if (design.stack[0]!.module_id !== 'hydrolox') return null;

  const swaps: ModuleId[] = ['methalox', 'kerolox'];
  const evaluated = swaps
    .map((id) => {
      const alt = cloneDesign(design);
      alt.stack[0]!.module_id = id;
      return evaluateCounterfactual(alt, catalog, assumptions);
    })
    .filter((c) => c.solve.valid)
    .sort((a, b) => a.cost.costPerKgOrbitUsd - b.cost.costPerKgOrbitUsd);
  if (evaluated.length === 0) return null;

  const chosen = evaluated[0]!;
  const impact = impactOf({ solve, cost }, chosen);
  const chosenModId = chosen.design.stack[0]!.module_id;
  return {
    ruleId: 'S-2',
    title: 'Move hydrogen off Stage 1',
    body:
      `Hydrogen is bulky and thrust-poor in the drag regime — it buys little down low. ` +
      `A ${catalog.byId(chosenModId).name} first stage keeps hydrogen where it shines (upper stages). ` +
      `Cost-per-kg-to-orbit ${impact.costPerKgChangePct >= 0 ? '+' : ''}${impact.costPerKgChangePct.toFixed(1)}%.`,
    impact,
    counterfactual: chosen.design,
  };
}
