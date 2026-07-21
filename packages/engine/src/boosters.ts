// Strap-on booster model — spec §3.2.
//
// Approach: the sandbox represents boosters attached to Stage 1 as a virtual
// "Stage 0" that the auto-allocator and sizer treat as an additional bottom
// stage. This is a serial-staging approximation of what is physically a
// parallel burn, and it captures the important trades honestly:
//   - Adds Δv capacity to the lift path (positive: more payload).
//   - Adds an extra separation event and dry mass (negative).
//   - Uses solid archetype properties (max TWR 2.5) so V-4 passes even when
//     the core stage alone would be thrust-poor (hydrolox first stages).
//
// The spec's "combined effective Isp weighted by mass flow" is preserved as
// a computed metric on the BoosterResult so the UI can display the effective
// Isp during the parallel phase, even though the sizer itself uses a serial
// approximation. This is a stated simplification per the model-simplifications
// callout in the About modal.

import type { CatalogModule, DesignDoc, StackEntry } from './types.js';

export interface ExpandedStack {
  entries: StackEntry[];
  boostersActive: boolean;
  boosterModule: CatalogModule | null;
  boosterCount: number;
}

/**
 * Expand a DesignDoc's Stage-1 boosters into a virtual Stage-0 entry so
 * downstream sizing/allocation code can treat them uniformly.
 * The virtual entry gets position 0 (booster stage identity).
 */
export function expandBoosters(
  design: DesignDoc,
  catalog: { byId: (id: CatalogModule['id']) => CatalogModule },
): ExpandedStack {
  const s1 = design.stack[0];
  const boosterCfg = s1?.boosters;
  if (!s1 || !boosterCfg || boosterCfg.count === 0) {
    return {
      entries: design.stack,
      boostersActive: false,
      boosterModule: null,
      boosterCount: 0,
    };
  }
  const boosterModule = catalog.byId(boosterCfg.module_id);
  // Virtual booster entry sits below Stage 1 in the stack array so
  // "bottom = index 0" continues to hold for sizing.
  const virtual: StackEntry = { position: 0, module_id: boosterCfg.module_id };
  return {
    entries: [virtual, ...design.stack],
    boostersActive: true,
    boosterModule,
    boosterCount: boosterCfg.count,
  };
}

/**
 * Combined effective Isp during the parallel burn phase, weighted by mass
 * flow. Displayed as a diagnostic — the sizer uses serial-stage Isp values.
 *
 *   Isp_eff = (ṁ_boost × Isp_boost + ṁ_core × Isp_core) / (ṁ_boost + ṁ_core)
 *
 * With no thrust model available in the sandbox, we approximate mass flow as
 * proportional to propellant mass over an equal reference burn time. That
 * reduces to a propellant-mass-weighted average of Isp.
 */
export function effectiveParallelIsp(
  boosterModule: CatalogModule,
  boosterCount: number,
  boosterPropellantEach_kg: number,
  coreModule: CatalogModule,
  corePropellantParallelPhase_kg: number,
): number {
  const totalBoosterProp = boosterCount * boosterPropellantEach_kg;
  const boosterIsp = boosterModule.isp_sl_s ?? boosterModule.isp_vac_s;
  const coreIsp = coreModule.isp_sl_s ?? coreModule.isp_vac_s;
  const num = totalBoosterProp * boosterIsp + corePropellantParallelPhase_kg * coreIsp;
  const den = totalBoosterProp + corePropellantParallelPhase_kg;
  if (den <= 0) return coreIsp;
  return num / den;
}

/**
 * Composite liftoff TWR for V-4 when boosters are present. Uses the higher
 * of the booster archetype's max TWR (solids ~2.5) and the core's.
 * This is a conservative "given a proper engine cluster" model — matches how
 * spec §6.4 treats archetype max TWR as an upper bound.
 */
export function compositeLiftoffMaxTwr(
  boosterModule: CatalogModule | null,
  coreModule: CatalogModule,
): number {
  if (!boosterModule) return coreModule.max_twr_at_liftoff;
  return Math.max(boosterModule.max_twr_at_liftoff, coreModule.max_twr_at_liftoff);
}
