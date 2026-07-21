// Solve orchestrator: validate → allocate → size → validate → assemble result.
// Spec §8.3 defines the output contract. Determinism is enforced (spec §9.8).

import type {
  BoosterResult,
  Catalog,
  CatalogModule,
  DesignDoc,
  LaunchAssistResult,
  ModuleId,
  SolveResult,
  StageResult,
} from './types.js';
import { autoAllocate, glowForAllocation, type StackModule } from './allocator.js';
import { maxPayload } from './bisection.js';
import { sizeStage } from './sizing.js';
import {
  runPostSizingRules,
  runPreSizingRules,
  type SizedStageForValidation,
} from './validation.js';
import { G0 } from './constants.js';
import { effectiveParallelIsp, expandBoosters } from './boosters.js';
import { assistDeltaVReduction, computeLaunchAssist } from './launchAssist.js';

/**
 * Isp mode selection for a stack index in the (possibly expanded) sizing stack.
 * - In-space missions never see sea-level pressure, so every stage uses vacuum Isp.
 * - Launch, no boosters: index 0 = Stage 1 = 'stage1'; others = 'upper'.
 * - Launch with boosters: index 0 = booster, index 1 = core Stage 1 — both burn
 *   from liftoff so both use 'stage1' blended Isp; indices 2+ = 'upper'.
 */
function ispModeForIndex(
  index: number,
  boostersActive: boolean,
  isInSpace: boolean,
): 'stage1' | 'upper' {
  if (isInSpace) return 'upper';
  if (!boostersActive) return index === 0 ? 'stage1' : 'upper';
  return index <= 1 ? 'stage1' : 'upper';
}

function stackModulesFromEntries(
  entries: Array<{ module_id: ModuleId; structural_fraction_override?: number }>,
  catalog: Catalog,
  boostersActive: boolean,
  isInSpace: boolean,
): StackModule[] {
  return entries.map((s, i) => {
    const sm: StackModule = {
      module: catalog.byId(s.module_id),
      ispMode: ispModeForIndex(i, boostersActive, isInSpace),
    };
    if (s.structural_fraction_override !== undefined) {
      sm.structuralFractionOverride = s.structural_fraction_override;
    }
    return sm;
  });
}

function tankVolumeM3(mod: CatalogModule, fuel_kg: number, oxidizer_kg: number): number {
  const fuelDen = mod.densities_kg_m3.fuel;
  const oxDen = mod.densities_kg_m3.oxidizer;
  let volume = 0;
  if (fuelDen && fuelDen > 0) volume += fuel_kg / fuelDen;
  if (oxDen && oxDen > 0) volume += oxidizer_kg / oxDen;
  return volume;
}

function emptySolveResult(
  _design: DesignDoc,
  violations: SolveResult['violations'],
  warnings: SolveResult['warnings'],
): SolveResult {
  return {
    valid: false,
    violations,
    warnings,
    feasible_for_payload: false,
    max_payload_kg: null,
    glow_kg: 0,
    payload_fraction: 0,
    stages: [],
  };
}

export function solve(design: DesignDoc, catalog: Catalog): SolveResult {
  // ---- pre-sizing validation --------------------------------------------
  const pre = runPreSizingRules({ design, catalog });
  if (pre.violations.length > 0) {
    return emptySolveResult(design, pre.violations, pre.warnings);
  }

  // ---- booster expansion ------------------------------------------------
  // If Stage 1 has boosters attached, prepend a virtual Stage-0 entry so the
  // allocator and sizer treat it uniformly. This is a serial-staging
  // approximation of what is physically a parallel burn (spec §3.2).
  const isInSpace = design.mission.type === 'in-space';
  // Boosters only make sense for launch missions; ignore any attached to an
  // in-space design (rare edge case, e.g., changing mission type on a stack).
  const expanded = isInSpace
    ? {
        entries: design.stack,
        boostersActive: false,
        boosterModule: null,
        boosterCount: 0,
      }
    : expandBoosters(design, catalog);
  const sizingEntries = expanded.entries;
  const N = sizingEntries.length;

  const stackModules = stackModulesFromEntries(
    sizingEntries,
    catalog,
    expanded.boostersActive,
    isInSpace,
  );
  // Launch-assist gift: the rocket only needs to cover the difference
  // between the mission Δv target and the assist's Δv contribution.
  const assistDvReduction =
    design.launch_assist?.enabled
      ? assistDeltaVReduction(
          design.launch_assist.exit_velocity_m_s,
          design.launch_assist.base_elevation_km * 1_000,
        ).total_m_s
      : 0;
  const totalDv = Math.max(0, design.mission.delta_v_m_s - assistDvReduction);
  const payload = design.mission.payload_kg;

  // ---- allocation (auto or manual) --------------------------------------
  let allocation_m_s: number[];
  let glow_kg: number;
  if (design.allocation_mode === 'manual' && design.manual_allocation_m_s) {
    // Manual allocation is authored against the user-visible stack (no booster).
    // Prepend a booster Δv guess derived from the auto allocator so a manual
    // change to core stages doesn't force the user to also allocate Δv to a
    // virtual entry they never see. If no boosters, this is a no-op.
    if (expanded.boostersActive) {
      const autoForBoost = autoAllocate(stackModules, totalDv, payload);
      const boosterDv = autoForBoost.ok ? autoForBoost.allocation_m_s[0]! : 0;
      const coreDvBudget = totalDv - boosterDv;
      // Scale user-provided allocation to fit the core Δv budget.
      const userSum = design.manual_allocation_m_s.reduce((a, b) => a + b, 0);
      const scale = userSum > 0 ? coreDvBudget / userSum : 0;
      allocation_m_s = [boosterDv, ...design.manual_allocation_m_s.map((dv) => dv * scale)];
    } else {
      allocation_m_s = design.manual_allocation_m_s;
    }
    const g = glowForAllocation(stackModules, allocation_m_s, payload);
    glow_kg = g.glow_kg;
  } else {
    const alloc = autoAllocate(stackModules, totalDv, payload);
    if (!alloc.ok) {
      return emptySolveResult(design, [{ rule: 'V-5', message: alloc.reason }], pre.warnings);
    }
    allocation_m_s = alloc.allocation_m_s;
    glow_kg = alloc.glow_kg;
  }

  // ---- top-down sizing ---------------------------------------------------
  const sizedStages: SizedStageForValidation[] = new Array(N);
  const perStageForOutput: StageResult[] = [];
  let mAbove = payload;
  for (let i = N - 1; i >= 0; i--) {
    const entry = sizingEntries[i]!;
    const mod = catalog.byId(entry.module_id);
    const mode = ispModeForIndex(i, expanded.boostersActive, isInSpace);
    // Booster virtual entry has no user-visible override; only design.stack
    // entries carry structural_fraction_override.
    const isVirtualBooster = expanded.boostersActive && i === 0;
    const userEntry = isVirtualBooster ? null : design.stack[expanded.boostersActive ? i - 1 : i];
    const epsOverride = userEntry?.structural_fraction_override;
    const s = sizeStage(mod, allocation_m_s[i]!, mAbove, mode, epsOverride);
    // For the booster virtual entry, sizing gives mp/ms for the *total* booster
    // parallel stage (all N boosters combined). We keep it in sizedStages for
    // validation but split it back into per-booster figures for the UI.
    const positionForValidation = expanded.boostersActive && i === 0 ? 0 : entry.position;
    const sized: SizedStageForValidation = {
      position: positionForValidation,
      module: mod,
      mp_kg: s.mp_kg,
      ms_kg: s.ms_kg,
      massAboveIncl_kg: s.m_above_below_kg,
      feasible: s.feasible,
    };
    if (s.reason !== undefined) sized.feasibilityReason = s.reason;
    sizedStages[i] = sized;

    // Only include user-visible stages in the results array; the booster
    // virtual entry is surfaced via SolveResult.booster instead.
    if (!(expanded.boostersActive && i === 0)) {
      const fuel_kg =
        mod.mixture_ratio_ox_to_fuel !== null
          ? s.mp_kg / (1 + mod.mixture_ratio_ox_to_fuel)
          : s.mp_kg;
      const oxidizer_kg = mod.mixture_ratio_ox_to_fuel !== null ? s.mp_kg - fuel_kg : 0;
      perStageForOutput.unshift({
        position: entry.position,
        delta_v_m_s: allocation_m_s[i]!,
        isp_used_s: s.isp_used_s,
        mass_ratio: s.mass_ratio,
        propellant_kg: s.mp_kg,
        fuel_kg,
        oxidizer_kg,
        dry_kg: s.ms_kg,
        tank_volume_m3: tankVolumeM3(mod, fuel_kg, oxidizer_kg),
        twr_ignition: mod.max_twr_at_liftoff,
      });
    }
    mAbove = s.m_above_below_kg;
  }
  // perStageForOutput was built via unshift as we walked top→bottom, so it
  // ends up in position order (1..N). Sanity check: sort by position anyway.
  perStageForOutput.sort((a, b) => a.position - b.position);

  // ---- post-sizing validation -------------------------------------------
  const post = runPostSizingRules({
    design,
    catalog,
    stages: sizedStages,
    glow_kg,
    boostersActive: expanded.boostersActive,
  });

  const violations = [...pre.violations, ...post.violations];
  const warnings = [...pre.warnings, ...post.warnings];
  const valid = violations.length === 0;

  // ---- booster result summary -------------------------------------------
  let boosterResult: BoosterResult | undefined;
  if (expanded.boostersActive && valid && expanded.boosterModule) {
    const virtualSized = sizedStages[0]!;
    const coreSized = sizedStages[1]!;
    const perBoosterProp = virtualSized.mp_kg / expanded.boosterCount;
    const perBoosterDry = virtualSized.ms_kg / expanded.boosterCount;
    const effIsp = effectiveParallelIsp(
      expanded.boosterModule,
      expanded.boosterCount,
      perBoosterProp,
      coreSized.module,
      coreSized.mp_kg, // conservative: assume the full core mp burns in parallel
    );
    boosterResult = {
      module_id: expanded.boosterModule.id,
      count: expanded.boosterCount as 2 | 4,
      delta_v_m_s: allocation_m_s[0]!,
      propellant_kg_each: perBoosterProp,
      propellant_kg_total: virtualSized.mp_kg,
      dry_kg_each: perBoosterDry,
      dry_kg_total: virtualSized.ms_kg,
      effective_parallel_isp_s: effIsp,
      composite_liftoff_max_twr: Math.max(
        expanded.boosterModule.max_twr_at_liftoff,
        coreSized.module.max_twr_at_liftoff,
      ),
    };
  }

  // ---- max-payload bisection --------------------------------------------
  const bisection = valid
    ? maxPayload(stackModules, totalDv)
    : { payload_kg: null, capped: false };
  const feasible_for_payload =
    valid && bisection.payload_kg !== null && payload <= bisection.payload_kg;

  // ---- launch-assist result ---------------------------------------------
  let launchAssistResult: LaunchAssistResult | undefined;
  if (design.launch_assist?.enabled && valid && glow_kg > 0) {
    launchAssistResult = computeLaunchAssist(design.launch_assist, glow_kg);
  }

  const result: SolveResult = {
    valid,
    violations,
    warnings,
    feasible_for_payload,
    max_payload_kg: bisection.payload_kg,
    glow_kg: valid ? glow_kg : 0,
    payload_fraction: valid && glow_kg > 0 ? payload / glow_kg : 0,
    stages: valid ? perStageForOutput : [],
  };
  if (boosterResult) result.booster = boosterResult;
  if (launchAssistResult) result.launch_assist = launchAssistResult;
  if (design.launch_assist?.enabled) result.effective_rocket_delta_v_m_s = totalDv;
  return result;
}

// Convenience: expose g0 for downstream UI without importing constants.
export const ENGINE_G0 = G0;
