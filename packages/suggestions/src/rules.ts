// Suggestion pipeline. Runs each rule against the current design + solve + cost,
// collects non-null Suggestions, and ranks by cost-per-kg impact magnitude.

import type { Catalog } from '@propelx/engine';
import type { Suggestion, SuggestionContext } from './types.js';
import { evalS1 } from './rules/s1-commonality.js';
import { evalS2 } from './rules/s2-hydrolox-first.js';
import { evalS3 } from './rules/s3-hypergolic.js';
import { evalS4 } from './rules/s4-oversized.js';
import { evalS5 } from './rules/s5-stage-count.js';
import { evalS6 } from './rules/s6-all-solid.js';
import { evalS7 } from './rules/s7-reuse.js';

type RuleFn = (ctx: SuggestionContext, catalog: Catalog) => Suggestion | null;

const RULES: RuleFn[] = [evalS1, evalS2, evalS3, evalS4, evalS5, evalS6, evalS7];

export function runSuggestions(ctx: SuggestionContext, catalog: Catalog): Suggestion[] {
  const out: Suggestion[] = [];
  for (const rule of RULES) {
    const s = rule(ctx, catalog);
    if (s) out.push(s);
  }
  // Rank: negative cost-per-kg change (i.e. saves money) first.
  // Validators (no impact) sit at the bottom.
  return out.sort((a, b) => {
    const ai = a.impact?.costPerKgChangePct ?? Number.POSITIVE_INFINITY;
    const bi = b.impact?.costPerKgChangePct ?? Number.POSITIVE_INFINITY;
    return ai - bi;
  });
}
