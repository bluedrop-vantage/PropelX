// S-6: all-solid stack for an uncrewed mission — validate the niche.
// Spec §10.2: "suggestions can also *validate*." This rule fires positively.

import type { Catalog } from '@propelx/engine';
import type { Suggestion, SuggestionContext } from '../types.js';

export function evalS6(ctx: SuggestionContext, _catalog: Catalog): Suggestion | null {
  const { design, solve } = ctx;
  if (!solve.valid) return null;
  if (design.mission.crewed) return null;
  if (design.stack.length === 0) return null;
  if (!design.stack.every((s) => s.module_id === 'solid')) return null;
  return {
    ruleId: 'S-6',
    title: 'Solids are the right pick here',
    body:
      `An all-solid uncrewed stack is a fine choice for small launchers and ` +
      `responsive-launch applications: simple, dense, minimal ground handling. ` +
      `Not every design needs restart capability.`,
  };
}
