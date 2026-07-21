// Electro-magnetic launch-assist tests. Verifies the physics of
// launchAssist.ts against hand-computed anchor values, plus the solve
// orchestrator and V-9 validation.

import { describe, it, expect } from 'vitest';
import {
  airDensityAtAltitude,
  assistDeltaVReduction,
  computeLaunchAssist,
  loadCatalog,
  solve,
  type DesignDoc,
  type LaunchAssistConfig,
} from '../src/index.js';

const catalog = loadCatalog();

function baseConfig(overrides: Partial<LaunchAssistConfig> = {}): LaunchAssistConfig {
  return {
    enabled: true,
    system_type: 'linear_motor',
    exit_velocity_m_s: 500,
    track_angle_deg: 10,
    base_elevation_km: 5,
    peak_acceleration_g: 3,
    vehicle_cross_section_m2: 5,
    drag_coefficient: 0.3,
    partial_vacuum: false,
    drive_efficiency: 0.85,
    ...overrides,
  };
}

function baseDesign(overrides: Partial<DesignDoc> = {}): DesignDoc {
  return {
    schema_version: '1.0',
    mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 15_000, crewed: false },
    stack: [
      { position: 1, module_id: 'kerolox' },
      { position: 2, module_id: 'hydrolox' },
    ],
    allocation_mode: 'auto',
    manual_allocation_m_s: null,
    ...overrides,
  };
}

describe('airDensityAtAltitude — ISA exponential', () => {
  it('returns sea-level density at h = 0', () => {
    expect(airDensityAtAltitude(0)).toBeCloseTo(1.225, 3);
  });

  it('at 5 km altitude density is ~0.68 kg/m³ (matches the theory doc within 5 %)', () => {
    // ρ(5km) = 1.225 · exp(-5000/8500) ≈ 0.680
    expect(airDensityAtAltitude(5_000)).toBeCloseTo(0.680, 2);
  });

  it('at 10 km altitude density is ~0.378 kg/m³ (spot-check vs ISA table)', () => {
    // The theory doc says "~25 %"; ISA is ~31 % — we match ISA.
    expect(airDensityAtAltitude(10_000)).toBeCloseTo(0.378, 2);
  });

  it('at 20 km altitude density is ~0.116 kg/m³', () => {
    expect(airDensityAtAltitude(20_000)).toBeCloseTo(0.116, 2);
  });
});

describe('assistDeltaVReduction', () => {
  it('sea level: only the exit-velocity gift counts', () => {
    const r = assistDeltaVReduction(500, 0);
    expect(r.exit_savings_m_s).toBe(500);
    expect(r.altitude_savings_m_s).toBeCloseTo(0, 3);
    expect(r.total_m_s).toBe(500);
  });

  it('5 km base elevation adds ~550 m/s of loss savings', () => {
    const r = assistDeltaVReduction(0, 5_000);
    // 1600·(1 − exp(-5/12)) ≈ 1600·0.3413 ≈ 546
    expect(r.altitude_savings_m_s).toBeGreaterThan(500);
    expect(r.altitude_savings_m_s).toBeLessThan(600);
  });

  it('saturates below the total loss budget even at absurdly high altitude', () => {
    const r = assistDeltaVReduction(0, 100_000);
    expect(r.altitude_savings_m_s).toBeLessThan(1_600);
  });
});

describe('computeLaunchAssist — anchor scenarios', () => {
  it('500 t vehicle, 500 m/s exit, 3g accel, 10° incline, 5 km base', () => {
    const r = computeLaunchAssist(baseConfig(), 500_000);
    // F_EM = m·(a + g·sinθ) + F_drag
    //   a = 3g = 29.42 m/s², g·sin(10°) = 9.807·0.1736 = 1.702
    //   F_accel = 500_000 · 29.42 = 14.71 MN
    //   F_gravity = 500_000 · 1.702 = 851 kN
    //   F_drag = ½·0.680·0.3·5·500² = 127.5 kN
    // Total ≈ 15.69 MN
    expect(r.peak_thrust_N).toBeGreaterThan(15_000_000);
    expect(r.peak_thrust_N).toBeLessThan(16_500_000);
    // Track length L = v²/(2a) = 500²/(2·29.42) ≈ 4.25 km
    expect(r.track_length_m).toBeGreaterThan(4_000);
    expect(r.track_length_m).toBeLessThan(4_500);
    // Duration = v/a = 500/29.42 ≈ 17 s
    expect(r.duration_s).toBeCloseTo(17.0, 0);
    // Peak mechanical power ≈ 15.7 MN · 500 m/s ≈ 7.85 GW.
    // With η = 0.85, electrical power ≈ 9.24 GW.
    expect(r.peak_power_W).toBeGreaterThan(9e9);
    expect(r.peak_power_W).toBeLessThan(10e9);
    // Δv gift: 500 (exit) + ~546 (altitude) = ~1046 m/s
    expect(r.delta_v_reduction_m_s).toBeGreaterThan(1_000);
    expect(r.delta_v_reduction_m_s).toBeLessThan(1_100);
  });

  it('partial vacuum → drag drops to zero', () => {
    const r = computeLaunchAssist(baseConfig({ partial_vacuum: true }), 500_000);
    expect(r.air_density_kg_m3).toBe(0);
    expect(r.drag_force_at_exit_N).toBe(0);
  });

  it('doubling drive efficiency halves electrical power demand', () => {
    const a = computeLaunchAssist(baseConfig({ drive_efficiency: 0.5 }), 100_000);
    const b = computeLaunchAssist(baseConfig({ drive_efficiency: 1.0 }), 100_000);
    expect(a.peak_power_W).toBeCloseTo(2 * b.peak_power_W, -3);
  });

  it('flat track (θ = 0): no gravity component', () => {
    const r = computeLaunchAssist(baseConfig({ track_angle_deg: 0 }), 100_000);
    const expected_accel_N = 100_000 * 3 * 9.80665;
    const drag_only_headroom = 200_000; // ~200 kN slack for drag term
    expect(Math.abs(r.peak_thrust_N - expected_accel_N)).toBeLessThan(drag_only_headroom);
  });
});

describe('solve integration', () => {
  it('adding a launch assist reduces GLOW at the same mission target', () => {
    const stock = solve(baseDesign(), catalog);
    const assisted = solve(
      baseDesign({ launch_assist: baseConfig({ exit_velocity_m_s: 800 }) }),
      catalog,
    );
    expect(stock.valid && assisted.valid).toBe(true);
    expect(assisted.glow_kg).toBeLessThan(stock.glow_kg);
    // Effective rocket Δv should equal mission Δv minus assist gift.
    expect(assisted.effective_rocket_delta_v_m_s).toBeLessThan(9_400);
    // Launch-assist result is populated.
    expect(assisted.launch_assist).toBeDefined();
    expect(assisted.launch_assist!.vehicle_mass_kg).toBeCloseTo(assisted.glow_kg, 3);
  });

  it('exit velocity above the LEO Δv budget makes the rocket almost free', () => {
    const r = solve(
      baseDesign({
        launch_assist: baseConfig({ exit_velocity_m_s: 2_000, base_elevation_km: 10 }),
      }),
      catalog,
    );
    // Not literally zero because the loss budget still applies, but noticeably tiny.
    expect(r.valid).toBe(true);
    expect(r.effective_rocket_delta_v_m_s! < 8_000).toBe(true);
    expect(r.glow_kg).toBeLessThan(500_000);
  });

  it('is deterministic', () => {
    const d = baseDesign({ launch_assist: baseConfig() });
    const a = solve(d, catalog);
    const b = solve(d, catalog);
    expect(a).toEqual(b);
  });
});

describe('V-9 validation', () => {
  it('exit velocity above 3 000 m/s is a hard fail', () => {
    const r = solve(
      baseDesign({ launch_assist: baseConfig({ exit_velocity_m_s: 5_000 }) }),
      catalog,
    );
    expect(r.violations.some((v) => v.rule === 'V-9')).toBe(true);
  });

  it('exit velocity between 2 000 and 3 000 m/s is a warning', () => {
    const r = solve(
      baseDesign({ launch_assist: baseConfig({ exit_velocity_m_s: 2_500 }) }),
      catalog,
    );
    expect(r.warnings.some((w) => w.rule === 'V-9')).toBe(true);
  });

  it('crewed + 5g peak accel fails hard', () => {
    const r = solve(
      baseDesign({
        mission: { destination: 'LEO', delta_v_m_s: 9_400, payload_kg: 9_500, crewed: true },
        stack: [
          { position: 1, module_id: 'kerolox' },
          { position: 2, module_id: 'hydrolox' },
        ],
        launch_assist: baseConfig({ peak_acceleration_g: 5 }),
      }),
      catalog,
    );
    expect(r.violations.some((v) => v.rule === 'V-9' && /Crewed launch/.test(v.message))).toBe(
      true,
    );
  });

  it('uncrewed + 20g peak accel fails', () => {
    const r = solve(
      baseDesign({ launch_assist: baseConfig({ peak_acceleration_g: 20 }) }),
      catalog,
    );
    expect(r.violations.some((v) => v.rule === 'V-9')).toBe(true);
  });

  it('drive efficiency of 0 fails', () => {
    const r = solve(
      baseDesign({ launch_assist: baseConfig({ drive_efficiency: 0 }) }),
      catalog,
    );
    expect(r.violations.some((v) => v.rule === 'V-9')).toBe(true);
  });
});
