// Reconstructs the step-by-step math the engine used for the current design.
// The output is a plain-data structure the ExplainModal renders — this file
// stays free of JSX so future formats (PDF export, share-as-text) can reuse it.
//
// Every number here comes from the engine's own primitives (`sizeStage`,
// `ispForMode`, `assistDeltaVReduction`) so the walkthrough is guaranteed to
// match the SolveResult the panel is showing.

import {
  G0,
  STAGE1_ISP_SL_WEIGHT,
  STAGE1_ISP_VAC_WEIGHT,
  assistDeltaVReduction,
  ispForMode,
  sizeStage,
  type Catalog,
  type CatalogModule,
  type DesignDoc,
  type SolveResult,
} from '@propelx/engine';

export interface StageMath {
  position: number;
  moduleName: string;
  moduleId: string;
  epsUsed: number;
  epsOverride: number | undefined;
  ispModeLabel: string;
  ispUsed_s: number;
  ispOverride: number | undefined;
  ispBlend?: { sl_s: number; vac_s: number };
  ve_m_s: number;
  deltaV_m_s: number;
  R: number;
  k: number;
  denominator: number;
  feasible: boolean;
  reason?: string;
  mp_kg: number;
  ms_kg: number;
  massAbove_kg: number;
  massBelow_kg: number;
}

export interface Explanation {
  hasDesign: boolean;
  hasSolved: boolean;
  mission: {
    destination: string;
    deltaVTarget_m_s: number;
    payload_kg: number;
    crewed: boolean;
    type: 'launch' | 'in-space';
  };
  launchAssist?: {
    enabled: boolean;
    exitVelocity_m_s: number;
    baseElevation_km: number;
    exitSavings_m_s: number;
    altitudeSavings_m_s: number;
    totalReduction_m_s: number;
    effectiveRocketDeltaV_m_s: number;
  };
  boosters?: {
    count: 2 | 4;
    moduleName: string;
    note: string;
  };
  allocation: {
    mode: 'auto' | 'manual';
    entries: Array<{ label: string; deltaV_m_s: number }>;
    total_m_s: number;
    target_m_s: number;
  };
  // Stage math in the order the engine sized them (top-down: last entry sized first).
  stages: StageMath[];
  final: {
    valid: boolean;
    glow_kg: number;
    payloadFraction: number;
    maxPayload_kg: number | null;
    firstViolation?: string;
  };
}

function ispModeFor(index: number, boostersActive: boolean, isInSpace: boolean): 'stage1' | 'upper' {
  if (isInSpace) return 'upper';
  if (!boostersActive) return index === 0 ? 'stage1' : 'upper';
  return index <= 1 ? 'stage1' : 'upper';
}

function ispModeLabel(mode: 'stage1' | 'upper', mod: CatalogModule): string {
  if (mode === 'upper') return 'vacuum Isp (upper stage)';
  const sl = mod.isp_sl_s;
  if (sl === null) return 'vacuum Isp (no sea-level rating)';
  return `stage-1 blend: ${STAGE1_ISP_SL_WEIGHT.toFixed(2)}·Isp_sl + ${STAGE1_ISP_VAC_WEIGHT.toFixed(2)}·Isp_vac`;
}

export function explainSolve(
  design: DesignDoc,
  solveResult: SolveResult,
  catalog: Catalog,
): Explanation {
  const emptyStack = design.stack.length === 0;
  const isInSpace = design.mission.type === 'in-space';

  const mission = {
    destination: design.mission.destination,
    deltaVTarget_m_s: design.mission.delta_v_m_s,
    payload_kg: design.mission.payload_kg,
    crewed: design.mission.crewed,
    type: (design.mission.type ?? 'launch') as 'launch' | 'in-space',
  };

  // Launch-assist Δv reduction (drives the effective rocket target).
  let launchAssist: Explanation['launchAssist'];
  let effectiveDvTarget = mission.deltaVTarget_m_s;
  if (design.launch_assist?.enabled) {
    const cfg = design.launch_assist;
    const red = assistDeltaVReduction(cfg.exit_velocity_m_s, cfg.base_elevation_km * 1_000);
    effectiveDvTarget = Math.max(0, mission.deltaVTarget_m_s - red.total_m_s);
    launchAssist = {
      enabled: true,
      exitVelocity_m_s: cfg.exit_velocity_m_s,
      baseElevation_km: cfg.base_elevation_km,
      exitSavings_m_s: red.exit_savings_m_s,
      altitudeSavings_m_s: red.altitude_savings_m_s,
      totalReduction_m_s: red.total_m_s,
      effectiveRocketDeltaV_m_s: effectiveDvTarget,
    };
  }

  // Booster expansion (informational — the engine uses this same virtual stage).
  let boosters: Explanation['boosters'];
  const boosterCfg = !isInSpace && design.stack[0]?.boosters;
  if (boosterCfg && boosterCfg.count > 0) {
    const bMod = catalog.byId(boosterCfg.module_id);
    boosters = {
      count: boosterCfg.count as 2 | 4,
      moduleName: bMod.name,
      note:
        `${boosterCfg.count} × ${bMod.name} strap-ons expanded into a virtual "Stage 0" ` +
        `that the sizer treats as an additional bottom stage.`,
    };
  }

  // Recover per-stage Δv from the solve result. The solve result excludes
  // the virtual booster from `stages` and surfaces it separately on
  // `solveResult.booster`. Build the entries with correct labels — S0 only
  // exists when boosters are present; single-stage designs should show S1.
  const allocationEntries: Array<{ label: string; deltaV_m_s: number }> = [];
  if (solveResult.booster) {
    allocationEntries.push({
      label: 'S0 · boosters',
      deltaV_m_s: solveResult.booster.delta_v_m_s,
    });
  }
  solveResult.stages.forEach((s) => {
    allocationEntries.push({ label: `S${s.position}`, deltaV_m_s: s.delta_v_m_s });
  });
  const totalAlloc = allocationEntries.reduce((a, e) => a + e.deltaV_m_s, 0);

  const allocation: Explanation['allocation'] = {
    mode: design.allocation_mode,
    entries: allocationEntries,
    total_m_s: totalAlloc,
    target_m_s: effectiveDvTarget,
  };

  // Per-stage sizing walkthrough (top-down): rebuild using the same
  // primitives the engine used. Include the virtual booster entry if active.
  const stagesMath: StageMath[] = [];
  if (!emptyStack && solveResult.valid && solveResult.stages.length > 0) {
    const boostersActive = Boolean(solveResult.booster);
    const sizingEntries: Array<{
      mod: CatalogModule;
      dv: number;
      epsOverride?: number;
      ispOverride_s?: number;
      position: number;
    }> = [];
    if (boostersActive && solveResult.booster) {
      sizingEntries.push({
        mod: catalog.byId(solveResult.booster.module_id),
        dv: solveResult.booster.delta_v_m_s,
        position: 0,
      });
    }
    solveResult.stages.forEach((s, i) => {
      const entry = design.stack[i]!;
      const epsOverride = entry.structural_fraction_override;
      const ispOverride_s = entry.isp_override_s;
      sizingEntries.push({
        mod: catalog.byId(entry.module_id),
        dv: s.delta_v_m_s,
        ...(epsOverride !== undefined ? { epsOverride } : {}),
        ...(ispOverride_s !== undefined ? { ispOverride_s } : {}),
        position: s.position,
      });
    });

    // Size top-down starting from payload.
    let mAbove = mission.payload_kg;
    for (let i = sizingEntries.length - 1; i >= 0; i--) {
      const e = sizingEntries[i]!;
      const mode = ispModeFor(i, boostersActive, isInSpace);
      const isp = e.ispOverride_s ?? ispForMode(e.mod, mode);
      const eps = e.epsOverride ?? e.mod.structural_fraction;
      const k = eps / (1 - eps);
      const ve = isp * G0;
      const R = Math.exp(e.dv / ve);
      const denominator = 1 - (R - 1) * k;
      const s = sizeStage(e.mod, e.dv, mAbove, mode, e.epsOverride, e.ispOverride_s);
      const entry: StageMath = {
        position: e.position,
        moduleName:
          e.mod.name + (e.position === 0 ? ` (${boosterCfg && boosterCfg.count} × combined)` : ''),
        moduleId: e.mod.id,
        epsUsed: eps,
        epsOverride: e.epsOverride,
        ispModeLabel: ispModeLabel(mode, e.mod),
        ispUsed_s: isp,
        ispOverride: e.ispOverride_s,
        ve_m_s: ve,
        deltaV_m_s: e.dv,
        R,
        k,
        denominator,
        feasible: s.feasible,
        mp_kg: s.mp_kg,
        ms_kg: s.ms_kg,
        massAbove_kg: mAbove,
        massBelow_kg: s.m_above_below_kg,
      };
      // Only show the SL/vac blend when the archetype default is in play;
      // if the user set an override the blend is bypassed.
      if (
        mode === 'stage1' &&
        e.mod.isp_sl_s !== null &&
        e.ispOverride_s === undefined
      ) {
        entry.ispBlend = { sl_s: e.mod.isp_sl_s, vac_s: e.mod.isp_vac_s };
      }
      if (s.reason) entry.reason = s.reason;
      stagesMath.push(entry);
      if (!s.feasible) break;
      mAbove = s.m_above_below_kg;
    }
  }

  const final = {
    valid: solveResult.valid,
    glow_kg: solveResult.glow_kg,
    payloadFraction: solveResult.payload_fraction,
    maxPayload_kg: solveResult.max_payload_kg,
    ...(solveResult.violations[0]
      ? { firstViolation: `${solveResult.violations[0].rule}: ${solveResult.violations[0].message}` }
      : {}),
  };

  return {
    hasDesign: !emptyStack,
    hasSolved: solveResult.valid,
    mission,
    ...(launchAssist ? { launchAssist } : {}),
    ...(boosters ? { boosters } : {}),
    allocation,
    stages: stagesMath,
    final,
  };
}
