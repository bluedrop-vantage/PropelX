// Evaluate a challenge against the current solve + cost + suggestions.

import type { DesignDoc, SolveResult } from '@propelx/engine';
import type { CostBreakdown, Suggestion } from '@propelx/suggestions';
import type { Challenge, ChallengeStatus, CriterionResult } from './types.js';

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}

function fmtMass(kg: number): string {
  return kg >= 1_000 ? `${(kg / 1_000).toFixed(1)} t` : `${Math.round(kg)} kg`;
}

export function evaluateChallenge(
  challenge: Challenge,
  design: DesignDoc,
  solve: SolveResult,
  cost: CostBreakdown,
  suggestions: Suggestion[],
): ChallengeStatus {
  const results: CriterionResult[] = challenge.successCriteria.map((c) => {
    switch (c.kind) {
      case 'valid':
        return {
          criterion: c,
          met: solve.valid,
          actual: solve.valid ? 'valid' : 'invalid',
          target: 'design must be valid',
        };
      case 'glowLtKg':
        return {
          criterion: c,
          met: solve.valid && solve.glow_kg > 0 && solve.glow_kg < c.value,
          actual: solve.valid ? `GLOW ${fmtMass(solve.glow_kg)}` : '—',
          target: `GLOW < ${fmtMass(c.value)}`,
        };
      case 'payloadFractionGt':
        return {
          criterion: c,
          met: solve.valid && solve.payload_fraction > c.value,
          actual: solve.valid ? `${(solve.payload_fraction * 100).toFixed(2)}%` : '—',
          target: `payload fraction > ${(c.value * 100).toFixed(1)}%`,
        };
      case 'costPerFlightLtUsd':
        return {
          criterion: c,
          met: cost.costPerFlightUsd > 0 && cost.costPerFlightUsd < c.value,
          actual: cost.costPerFlightUsd > 0 ? fmtUsd(cost.costPerFlightUsd) : '—',
          target: `cost/flight < ${fmtUsd(c.value)}`,
        };
      case 'costPerKgOrbitLtUsd':
        return {
          criterion: c,
          met: cost.costPerKgOrbitUsd > 0 && cost.costPerKgOrbitUsd < c.value,
          actual: cost.costPerKgOrbitUsd > 0 ? fmtUsd(cost.costPerKgOrbitUsd) : '—',
          target: `cost/kg to orbit < ${fmtUsd(c.value)}`,
        };
      case 'stageCountLte':
        return {
          criterion: c,
          met: design.stack.length > 0 && design.stack.length <= c.value,
          actual: `${design.stack.length} stages`,
          target: `≤ ${c.value} stages`,
        };
      case 'noBoosters':
        return {
          criterion: c,
          met: !design.stack.some((s) => s.boosters && s.boosters.count > 0),
          actual: design.stack.some((s) => s.boosters && s.boosters.count > 0) ? 'boosters attached' : 'no boosters',
          target: 'no strap-on boosters',
        };
      case 'requireSuggestionCleared':
        // Passes when S-1 (commonality) no longer fires — used by
        // "Commonality award". A more general form could take a rule ID.
        return {
          criterion: c,
          met: !suggestions.some((s) => s.ruleId === 'S-1'),
          actual: suggestions.some((s) => s.ruleId === 'S-1') ? 'S-1 still fires' : 'S-1 cleared',
          target: 'unify propellant family (S-1 cleared)',
        };
    }
  });

  const bannedUsed = challenge.bannedModules
    ? design.stack.find((s) => challenge.bannedModules!.includes(s.module_id))?.module_id ?? null
    : null;

  const firstStageOk =
    !challenge.requiredFirstStage ||
    (design.stack[0] != null && challenge.requiredFirstStage.includes(design.stack[0].module_id));

  const allMet = results.every((r) => r.met) && bannedUsed === null && firstStageOk;

  return {
    challenge,
    results,
    allMet,
    bannedModuleUsed: bannedUsed,
    firstStageOk,
  };
}
