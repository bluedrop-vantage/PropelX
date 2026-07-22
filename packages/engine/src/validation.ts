// Validation rules V-1 … V-8 per spec §6.4.
// Split into pre-sizing (structural checks that don't need solve output)
// and post-sizing (TWR + tank-growth checks that need per-stage results).

import type {
  Catalog,
  CatalogModule,
  DesignDoc,
  Violation,
  Warning,
} from './types.js';
import {
  ASSIST_ACCEL_MAX_CREWED_G,
  ASSIST_ACCEL_MAX_UNCREWED_G,
  ASSIST_EXIT_VELOCITY_AGGRESSIVE_M_S,
  ASSIST_EXIT_VELOCITY_MAX_M_S,
  ASSIST_EXIT_VELOCITY_MIN_M_S,
  ASSIST_TRACK_ANGLE_MAX_DEG,
  LIFTOFF_TWR_MIN,
  PAYLOAD_MAX_KG,
  PAYLOAD_MIN_KG,
  STAGE_COUNT_MAX,
  STAGE_COUNT_MIN,
  UPPER_STAGE_TWR_FAIL,
  UPPER_STAGE_TWR_WARN,
} from './constants.js';
import { G0 } from './constants.js';

export interface ValidationOutcome {
  violations: Violation[];
  warnings: Warning[];
}

export interface SizedStageForValidation {
  position: number;
  module: CatalogModule;
  mp_kg: number;
  ms_kg: number;
  massAboveIncl_kg: number; // mass sitting on top of + including this stage
  feasible: boolean;
  feasibilityReason?: string;
  // The max TWR the stage can actually deliver — archetype default unless
  // the user set a per-stage override in the drawer. V-4/V-6 use this.
  effectiveMaxTwr?: number;
}

export interface PreSizingContext {
  design: DesignDoc;
  catalog: Catalog;
}

export interface PostSizingContext extends PreSizingContext {
  stages: SizedStageForValidation[];
  glow_kg: number;
  // True when the first sizedStage entry is a virtual booster stage rather
  // than a user-authored stack entry. Used by V-6 to shift the "upper stages
  // start at" index so Stage 1 isn't wrongly treated as an upper stage.
  boostersActive?: boolean;
}

// -------------------- pre-sizing rules --------------------

/** V-1: At least one stage. */
export function ruleV1(ctx: PreSizingContext): Violation | null {
  const n = ctx.design.stack.length;
  if (n < STAGE_COUNT_MIN) {
    return { rule: 'V-1', message: 'Add a propulsion stage to begin.' };
  }
  if (n > STAGE_COUNT_MAX) {
    return {
      rule: 'V-1',
      message: `Stack has ${n} stages; real vehicles rarely exceed ${STAGE_COUNT_MAX}. Each staging event adds failure risk and dead mass.`,
    };
  }
  return null;
}

/** V-2: Payload within bounds. */
export function ruleV2(ctx: PreSizingContext): Violation | null {
  const p = ctx.design.mission.payload_kg;
  if (!Number.isFinite(p) || p < PAYLOAD_MIN_KG || p > PAYLOAD_MAX_KG) {
    return {
      rule: 'V-2',
      message: `Payload must be between ${PAYLOAD_MIN_KG} and ${PAYLOAD_MAX_KG.toLocaleString()} kg.`,
    };
  }
  return null;
}

/** V-3: Stage 1 must be lift-capable. */
export function ruleV3(ctx: PreSizingContext): Violation | null {
  const s1 = ctx.design.stack[0];
  if (!s1) return null; // V-1 will catch empty stack
  const mod = ctx.catalog.byId(s1.module_id);
  if (!mod.lift_capable) {
    if (mod.id === 'ion') {
      return {
        rule: 'V-3',
        stage: 1,
        message:
          'Ion engines produce millinewtons of thrust — superb in space, useless against gravity. Move it to the top stage or remove it.',
      };
    }
    return {
      rule: 'V-3',
      stage: 1,
      message: `${mod.name} cannot lift a vehicle off the pad. Use it only as an in-space upper stage.`,
    };
  }
  return null;
}

/** V-7: Crewed missions — no solid-only stack; warning on any hypergolic. */
export function ruleV7(ctx: PreSizingContext): Array<Violation | Warning> {
  if (!ctx.design.mission.crewed) return [];
  const out: Array<Violation | Warning> = [];
  const modules = ctx.design.stack.map((s) => ctx.catalog.byId(s.module_id));
  if (modules.length > 0 && modules.every((m) => m.id === 'solid')) {
    out.push({
      rule: 'V-7',
      message:
        'Crewed all-solid stack: solids cannot shut down, so a launch abort has no way to stop the ride. Add a liquid stage or remove the crew designation.',
    });
  }
  modules.forEach((m, i) => {
    if (m.id === 'hypergolic') {
      out.push({
        rule: 'V-7',
        stage: i + 1,
        message:
          'Hypergolic propellants (NTO/UDMH) near crew are a toxicity hazard. Consider a storable-methalox swap or accept the reliability-for-toxicity trade with eyes open.',
      });
    }
  });
  return out;
}

/** V-8: Cold gas anywhere in the lift path → fail. */
export function ruleV8(ctx: PreSizingContext): Violation | null {
  for (let i = 0; i < ctx.design.stack.length; i++) {
    const mod = ctx.catalog.byId(ctx.design.stack[i]!.module_id);
    if (mod.id === 'coldgas') {
      // "Lift path" = every stage below the top for a launch mission.
      // Cold gas as the top-most in-space stage is acceptable in principle
      // (§3.1 note), but for a launch profile the tank mass never closes.
      return {
        rule: 'V-8',
        stage: i + 1,
        message:
          'Cold-gas thrusters trade tank mass for propellant so aggressively that a launch stage never closes. Fine as a satellite RCS system; not fine as a lift stage.',
      };
    }
  }
  return null;
}

/** V-9: Launch-assist configuration sanity + human-factors checks. */
export function ruleV9(ctx: PreSizingContext): Array<Violation | Warning> {
  const cfg = ctx.design.launch_assist;
  if (!cfg || !cfg.enabled) return [];
  const out: Array<Violation | Warning> = [];
  const crewed = ctx.design.mission.crewed;

  // Exit velocity bounds.
  if (
    cfg.exit_velocity_m_s < ASSIST_EXIT_VELOCITY_MIN_M_S ||
    cfg.exit_velocity_m_s > ASSIST_EXIT_VELOCITY_MAX_M_S
  ) {
    out.push({
      rule: 'V-9',
      message: `Launch-assist exit velocity must be between ${ASSIST_EXIT_VELOCITY_MIN_M_S} and ${ASSIST_EXIT_VELOCITY_MAX_M_S.toLocaleString()} m/s.`,
    });
  } else if (cfg.exit_velocity_m_s > ASSIST_EXIT_VELOCITY_AGGRESSIVE_M_S) {
    out.push({
      rule: 'V-9',
      message: `Launch-assist exit velocity above ${ASSIST_EXIT_VELOCITY_AGGRESSIVE_M_S.toLocaleString()} m/s pushes rail current and coil heating into regimes with no operational precedent — treat this as speculative.`,
    });
  }

  // Track angle bounds.
  if (cfg.track_angle_deg < 0 || cfg.track_angle_deg > ASSIST_TRACK_ANGLE_MAX_DEG) {
    out.push({
      rule: 'V-9',
      message: `Track angle must be between 0° and ${ASSIST_TRACK_ANGLE_MAX_DEG}° (extreme inclines make the gravity term dominate).`,
    });
  }

  // Peak acceleration limits.
  if (cfg.peak_acceleration_g > ASSIST_ACCEL_MAX_UNCREWED_G) {
    out.push({
      rule: 'V-9',
      message: `Peak acceleration ${cfg.peak_acceleration_g.toFixed(1)}g exceeds the ${ASSIST_ACCEL_MAX_UNCREWED_G}g structural cap for even ruggedised payloads.`,
    });
  } else if (crewed && cfg.peak_acceleration_g > ASSIST_ACCEL_MAX_CREWED_G) {
    // Crewed → hard fail (NASA/ESA cap ≈ 4g sustained on launch).
    out.push({
      rule: 'V-9',
      message: `Crewed launch: peak acceleration ${cfg.peak_acceleration_g.toFixed(1)}g exceeds the ${ASSIST_ACCEL_MAX_CREWED_G}g human-tolerance limit. Reduce a_max or drop the crew designation.`,
    });
  } else if (crewed && cfg.peak_acceleration_g > 3) {
    // Warning band: > 3g but ≤ 4g is uncomfortable but survivable.
    out.push({
      rule: 'V-9',
      message: `Crewed peak acceleration ${cfg.peak_acceleration_g.toFixed(1)}g is above 3g. Sustainable for the short track-length duration but expect crew training constraints.`,
    });
  }

  // Efficiency sanity.
  if (cfg.drive_efficiency <= 0 || cfg.drive_efficiency > 1) {
    out.push({
      rule: 'V-9',
      message: 'Drive efficiency must be in (0, 1]. Typical linear-motor systems land near 0.85.',
    });
  }
  return out;
}

export function runPreSizingRules(ctx: PreSizingContext): ValidationOutcome {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const push = (r: Violation | null) => {
    if (r) violations.push(r);
  };
  const isInSpace = ctx.design.mission.type === 'in-space';
  push(ruleV1(ctx));
  push(ruleV2(ctx));
  // V-3 (lift-capable) and V-8 (cold gas in lift path) only apply to launch
  // missions. In space, ion / cold-gas / hydrolox are legitimate choices —
  // that's the whole point of the mode toggle (PLAN §6 Q3).
  if (!isInSpace) {
    push(ruleV3(ctx));
    push(ruleV8(ctx));
  }
  for (const r of ruleV7(ctx)) {
    if (r.message.startsWith('Crewed all-solid')) violations.push(r);
    else warnings.push(r);
  }
  // V-9: Launch-assist safety. Hard fails: crewed-over-limit, uncrewed
  // above the structural cap, or explicit bounds violations. Aggressive
  // but survivable settings become warnings.
  for (const r of ruleV9(ctx)) {
    const isHardFail =
      /Crewed launch:/.test(r.message) ||
      /structural cap/.test(r.message) ||
      /must be between|must be in \(0, 1]/.test(r.message);
    if (isHardFail) violations.push(r);
    else warnings.push(r);
  }
  return { violations, warnings };
}

// -------------------- post-sizing rules --------------------

/**
 * V-4: Liftoff TWR ≥ 1.2. We use the archetype's max_twr_at_liftoff as the
 * upper bound the vehicle *could* achieve given a well-sized engine cluster
 * on Stage 1. If that ceiling is already below 1.2, no engine cluster on
 * that propellant can lift this GLOW — fail. Hydrolox Stage 1 without
 * boosters is emitted as a Warning (spec §6.4 special case).
 */
export function ruleV4(ctx: PostSizingContext): Array<Violation | Warning> {
  const s1 = ctx.stages[0];
  if (!s1) return [];
  const mod = s1.module;
  const effectiveMaxTwr = s1.effectiveMaxTwr ?? mod.max_twr_at_liftoff;
  const out: Array<Violation | Warning> = [];
  if (effectiveMaxTwr < LIFTOFF_TWR_MIN) {
    out.push({
      rule: 'V-4',
      stage: 1,
      message: `${mod.name} first stage cannot reach the ${LIFTOFF_TWR_MIN} liftoff TWR minimum — add strap-on boosters or pick a higher-thrust propellant.`,
    });
    return out;
  }
  // Hydrolox first-stage warning (spec §6.4). Skip when the user has
  // manually raised the max TWR override past the "thrust-poor" band.
  const hasBoosters = (ctx.design.stack[0]?.boosters?.count ?? 0) > 0;
  const userOverrode = ctx.design.stack[0]?.max_twr_override !== undefined;
  if (mod.id === 'hydrolox' && !hasBoosters && !userOverrode) {
    out.push({
      rule: 'V-4',
      stage: 1,
      message:
        'Hydrogen first stage is thrust-poor. Real vehicles like Delta IV accept this; most add solid boosters to help off the pad.',
    });
  }
  return out;
}

/** V-5: Every stage satisfies the tank-growth feasibility condition. */
export function ruleV5(ctx: PostSizingContext): Violation[] {
  const out: Violation[] = [];
  for (const s of ctx.stages) {
    if (!s.feasible) {
      out.push({
        rule: 'V-5',
        stage: s.position,
        message:
          s.feasibilityReason ??
          `Stage ${s.position} (${s.module.name}) cannot close: adding propellant grows tank mass faster than performance.`,
      });
    }
  }
  return out;
}

/**
 * V-6: Upper stages need ignition TWR ≥ 0.4 (fail) with a warning below 0.7.
 * We approximate ignition thrust as (max_twr_at_liftoff × mass_above_including_stage × g0).
 * For upper stages the archetype's max_twr_at_liftoff is still the ceiling.
 */
export function ruleV6(ctx: PostSizingContext): Array<Violation | Warning> {
  const out: Array<Violation | Warning> = [];
  // With boosters, sizedStages[0] is the virtual booster and sizedStages[1]
  // is the core Stage 1. Upper stages therefore start at index 2. Without
  // boosters, upper stages start at index 1.
  const firstUpperIdx = ctx.boostersActive ? 2 : 1;
  for (let i = firstUpperIdx; i < ctx.stages.length; i++) {
    const s = ctx.stages[i]!;
    const effectiveMaxTwr = s.effectiveMaxTwr ?? s.module.max_twr_at_liftoff;
    const maxThrust_N = effectiveMaxTwr * s.massAboveIncl_kg * G0;
    const twr = maxThrust_N / (s.massAboveIncl_kg * G0);
    // Simplifies to effectiveMaxTwr — realistically upper-stage engines
    // are lower thrust than first-stage clusters, but archetypes in this
    // catalog capture that (hydrolox 1.3, ion 1e-4, etc.). Per-stage
    // max_twr_override lets the user model bespoke engine clusters.
    if (twr < UPPER_STAGE_TWR_FAIL) {
      out.push({
        rule: 'V-6',
        stage: s.position,
        message: `Stage ${s.position} ignition TWR ${twr.toFixed(2)} is below ${UPPER_STAGE_TWR_FAIL} — gravity losses will eat the mission.`,
      });
    } else if (twr < UPPER_STAGE_TWR_WARN) {
      out.push({
        rule: 'V-6',
        stage: s.position,
        message: `Stage ${s.position} ignition TWR ${twr.toFixed(2)} is under ${UPPER_STAGE_TWR_WARN}; gravity losses may exceed the fixed budget.`,
      });
    }
  }
  return out;
}

export function runPostSizingRules(ctx: PostSizingContext): ValidationOutcome {
  const violations: Violation[] = [];
  const warnings: Warning[] = [];
  const push = (rs: Array<Violation | Warning>) => {
    for (const r of rs) {
      // V-4 hydrolox-thrust-poor and V-6 TWR-warning are warnings; the rest are violations.
      if (
        (r.rule === 'V-4' && /thrust-poor|Delta IV/.test(r.message)) ||
        (r.rule === 'V-6' && /may exceed/.test(r.message))
      ) {
        warnings.push(r);
      } else {
        violations.push(r);
      }
    }
  };
  const isInSpace = ctx.design.mission.type === 'in-space';
  // V-4 (liftoff TWR) and V-6 (upper-stage gravity-loss TWR) both concern
  // fighting gravity from the pad. In space, TWR is irrelevant to whether
  // the mission closes; skip both.
  if (!isInSpace) push(ruleV4(ctx));
  for (const v of ruleV5(ctx)) violations.push(v);
  if (!isInSpace) push(ruleV6(ctx));
  return { violations, warnings };
}
