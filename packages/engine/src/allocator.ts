// Auto Δv allocation. Spec §6.3.
//
// Given a stack (bottom→top order) and a total Δv budget, find the per-stage
// split {Δv_i} that minimises GLOW, subject to Σ Δv_i = Δv_total and every
// stage satisfying the §6.2 feasibility condition.
//
// Parameterization: for a stack of N stages we search over N−1 free logits
// z ∈ R^(N−1). We form fractions via softmax over z (with z_N = 0 pinned),
// then Δv_i = f_i · Δv_total. This makes the sum-constraint automatic and
// leaves the search space unconstrained — a good fit for Nelder–Mead.
//
// Feasibility handling: infeasible allocations return +∞ GLOW rather than
// throwing. Nelder–Mead handles the resulting discontinuity gracefully
// (PLAN.md §7 risk callout).

import type { CatalogModule } from './types.js';
import { sizeStage } from './sizing.js';
import { nelderMead } from './nelderMead.js';

export interface StackModule {
  module: CatalogModule;
  // Isp mode is set by orchestrator: stage 1 = 'stage1', others = 'upper'.
  ispMode: 'stage1' | 'upper';
  // Optional per-stage structural-fraction override (PLAN §6 Q2 tech-level
  // slider). Falls back to the archetype's `structural_fraction`.
  structuralFractionOverride?: number;
}

export interface AllocationSuccess {
  ok: true;
  allocation_m_s: number[];
  glow_kg: number;
  stagesBottomUp: Array<{ mp_kg: number; ms_kg: number }>;
}

export interface AllocationFailure {
  ok: false;
  reason: string;
}

export type AllocationResult = AllocationSuccess | AllocationFailure;

const INFEASIBLE_PENALTY = Number.POSITIVE_INFINITY;

/**
 * Compute GLOW for a given per-stage Δv allocation.
 * Sizes top-down: mp_N, mp_(N-1), ..., mp_1. Returns +∞ if any stage infeasible.
 * `stack` is bottom→top; `alloc` is bottom→top.
 */
export function glowForAllocation(
  stack: StackModule[],
  alloc_m_s: number[],
  payload_kg: number,
): { glow_kg: number; stagesBottomUp: Array<{ mp_kg: number; ms_kg: number }> } {
  let mAbove = payload_kg;
  const results = new Array<{ mp_kg: number; ms_kg: number }>(stack.length);
  // Top-down: index N-1 down to 0.
  for (let i = stack.length - 1; i >= 0; i--) {
    const { module, ispMode, structuralFractionOverride } = stack[i]!;
    const dv = alloc_m_s[i]!;
    const s = sizeStage(module, dv, mAbove, ispMode, structuralFractionOverride);
    if (!s.feasible) {
      return { glow_kg: INFEASIBLE_PENALTY, stagesBottomUp: results };
    }
    results[i] = { mp_kg: s.mp_kg, ms_kg: s.ms_kg };
    mAbove = s.m_above_below_kg;
  }
  return { glow_kg: mAbove, stagesBottomUp: results };
}

function softmaxWithPin(z: number[]): number[] {
  // Return probabilities for [z_0, z_1, ..., z_{n-1}, 0] (N = n+1 items).
  const logits = [...z, 0];
  const maxL = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxL));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Initial guess: allocate Δv proportional to each stage's effective exhaust
 * velocity Ve. Spec §6.3 explicitly calls for this Saturn-V heuristic.
 */
function initialLogits(stack: StackModule[]): number[] {
  const veList = stack.map(({ module, ispMode }) => {
    // Use the mode-appropriate Isp (matches sizing.ts:ispForMode).
    const sl = module.isp_sl_s ?? module.isp_vac_s;
    const isp = ispMode === 'stage1' ? 0.85 * sl + 0.15 * module.isp_vac_s : module.isp_vac_s;
    return isp * 9.80665;
  });
  const total = veList.reduce((a, b) => a + b, 0);
  const fractions = veList.map((v) => v / total);
  // Convert fractions to logits with the last one pinned to 0:
  // f_i / f_N = exp(z_i)  ⇒  z_i = log(f_i / f_N)
  const fN = fractions[fractions.length - 1]!;
  return fractions.slice(0, -1).map((f) => Math.log(f / fN));
}

export function autoAllocate(
  stack: StackModule[],
  deltaVTotal_m_s: number,
  payload_kg: number,
): AllocationResult {
  const N = stack.length;
  if (N === 0) return { ok: false, reason: 'No stages to allocate.' };

  // 1-stage: entire Δv on the only stage. Skip optimization.
  if (N === 1) {
    const result = glowForAllocation(stack, [deltaVTotal_m_s], payload_kg);
    if (!isFinite(result.glow_kg)) {
      return {
        ok: false,
        reason: `Single stage cannot deliver the required ${Math.round(deltaVTotal_m_s)} m/s.`,
      };
    }
    return {
      ok: true,
      allocation_m_s: [deltaVTotal_m_s],
      glow_kg: result.glow_kg,
      stagesBottomUp: result.stagesBottomUp,
    };
  }

  const objective = (z: number[]): number => {
    const fractions = softmaxWithPin(z);
    const alloc = fractions.map((f) => f * deltaVTotal_m_s);
    return glowForAllocation(stack, alloc, payload_kg).glow_kg;
  };

  const z0 = initialLogits(stack);
  const nm = nelderMead(objective, z0, { maxIter: 200, tolFx: 1e-3, tolX: 1e-4 });

  if (!isFinite(nm.fx)) {
    return {
      ok: false,
      reason:
        `No feasible Δv split found for this stack — every combination hits a ` +
        `tank-growth spiral. Try a higher-Isp stage or split the mission across more stages.`,
    };
  }

  const fractions = softmaxWithPin(nm.x);
  const alloc = fractions.map((f) => f * deltaVTotal_m_s);
  const result = glowForAllocation(stack, alloc, payload_kg);

  return {
    ok: true,
    allocation_m_s: alloc,
    glow_kg: result.glow_kg,
    stagesBottomUp: result.stagesBottomUp,
  };
}
