// S-4: payload margin > 40 % — rocket is oversized for the mission.

import type { Catalog } from '@propelx/engine';
import type { Suggestion, SuggestionContext } from '../types.js';

export function evalS4(ctx: SuggestionContext, _catalog: Catalog): Suggestion | null {
  const { design, solve } = ctx;
  if (!solve.valid || solve.max_payload_kg === null) return null;
  const cap = solve.max_payload_kg;
  const cur = design.mission.payload_kg;
  if (cap <= 0 || cur <= 0) return null;
  const marginPct = ((cap - cur) / cur) * 100;
  if (marginPct <= 40) return null;
  return {
    ruleId: 'S-4',
    title: 'Oversized for the mission',
    body:
      `Your stack can lift ${(cap / 1000).toFixed(1)} t but the payload is ${(cur / 1000).toFixed(1)} t — ` +
      `${marginPct.toFixed(0)}% margin over spec. Shrink the vehicle, split the mission, ` +
      `or fly rideshare and share the cost with someone else.`,
  };
}
