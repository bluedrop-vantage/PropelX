// S-3: hypergolics anywhere → suggest methalox swap when crewed or high flight rate.
// We flag any hypergolic use (spec: "anywhere, crewed or high flight-rate mission").

import type { Catalog, DesignDoc } from '@propelx/engine';
import { cloneDesign, evaluateCounterfactual, impactOf } from '../counterfactual.js';
import type { Suggestion, SuggestionContext } from '../types.js';

export function evalS3(ctx: SuggestionContext, catalog: Catalog): Suggestion | null {
  const { design, solve, cost, assumptions } = ctx;
  if (!solve.valid) return null;
  const hypergolicIndices: number[] = [];
  design.stack.forEach((s, i) => {
    if (s.module_id === 'hypergolic') hypergolicIndices.push(i);
  });
  if (hypergolicIndices.length === 0) return null;

  // Swap all hypergolic stages to methalox (a modern storable-ish alternative).
  const alt: DesignDoc = cloneDesign(design);
  for (const i of hypergolicIndices) alt.stack[i]!.module_id = 'methalox';
  const cf = evaluateCounterfactual(alt, catalog, assumptions);
  if (!cf.solve.valid) return null;

  const impact = impactOf({ solve, cost }, cf);
  const context = design.mission.crewed ? 'near crew' : 'across the vehicle';
  return {
    ruleId: 'S-3',
    title: 'Retire hypergolics',
    body:
      `NTO/UDMH is reliable but toxic ${context}. Replacing hypergolic stages with methalox ` +
      `improves ops complexity (SCAPE suits go away). ` +
      `Cost-per-kg-to-orbit ${impact.costPerKgChangePct >= 0 ? '+' : ''}${impact.costPerKgChangePct.toFixed(1)}%.`,
    impact,
    counterfactual: cf.design,
  };
}
