// Per-stage sizing — closed form.
// Spec §6.2. Given (module, Δv, mass-above), compute propellant mass, dry mass,
// and the mass sitting below (= above + this stage's dry + propellant).

import type { CatalogModule } from './types.js';
import { G0, STAGE1_ISP_SL_WEIGHT, STAGE1_ISP_VAC_WEIGHT } from './constants.js';

export type IspMode = 'stage1' | 'upper';

export interface StageSizing {
  feasible: boolean;
  reason?: string;
  ve_m_s: number;
  isp_used_s: number;
  mass_ratio: number;
  mp_kg: number;
  ms_kg: number;
  m_above_below_kg: number;
}

/**
 * Isp selection rule (spec §3.1): Stage 1 (bottom) and boosters use trajectory-averaged
 * 0.85·Isp_sl + 0.15·Isp_vac; upper stages use vacuum Isp.
 */
export function ispForMode(mod: CatalogModule, mode: IspMode): number {
  if (mode === 'upper') return mod.isp_vac_s;
  // Stage 1: prefer sea-level; if none defined (in-space-only archetype), fall back to vac.
  const sl = mod.isp_sl_s ?? mod.isp_vac_s;
  return STAGE1_ISP_SL_WEIGHT * sl + STAGE1_ISP_VAC_WEIGHT * mod.isp_vac_s;
}

/**
 * Closed-form stage sizing per spec §6.2:
 *   k   = ε / (1 − ε)                    (dry-mass per unit propellant)
 *   R   = exp(Δv / Ve)
 *   mp  = (R − 1) × m_above / (1 − (R − 1) × k)
 *   ms  = k × mp
 *
 * Feasibility: denominator must be > 0. Otherwise adding propellant grows
 * tank mass faster than performance — the "tank-growth spiral" from §6.2.
 */
export function sizeStage(
  mod: CatalogModule,
  deltaV_m_s: number,
  mAbove_kg: number,
  mode: IspMode,
  structuralFractionOverride?: number,
): StageSizing {
  const isp = ispForMode(mod, mode);
  const ve = isp * G0;
  const eps = structuralFractionOverride ?? mod.structural_fraction;
  const k = eps / (1 - eps);
  const R = Math.exp(deltaV_m_s / ve);
  const denom = 1 - (R - 1) * k;

  if (denom <= 0) {
    return {
      feasible: false,
      reason:
        `A ${mod.name} stage physically cannot deliver ${Math.round(deltaV_m_s)} m/s alone — ` +
        `its tanks outgrow its propellant. This is why rockets stage.`,
      ve_m_s: ve,
      isp_used_s: isp,
      mass_ratio: R,
      mp_kg: 0,
      ms_kg: 0,
      m_above_below_kg: mAbove_kg,
    };
  }

  const mp = ((R - 1) * mAbove_kg) / denom;
  const ms = k * mp;

  return {
    feasible: true,
    ve_m_s: ve,
    isp_used_s: isp,
    mass_ratio: R,
    mp_kg: mp,
    ms_kg: ms,
    m_above_below_kg: mAbove_kg + mp + ms,
  };
}
