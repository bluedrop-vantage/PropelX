// Electro-Magnetic Launch Assist add-on.
//
// See docs/launch-assist.md for the derivation. Summary:
//
//   Force balance along an incline (θ from horizontal):
//     F_EM = m · (a + g·sin θ) + F_drag        [Newton 2]
//     F_drag = ½·ρ(h)·Cd·A·v²                  [aerodynamic drag]
//     P_peak = F_EM · v_exit                   [mechanical power at exit]
//     L = v_exit² / (2·a)                      [constant-a track length]
//     ρ(h) = ρ₀ · exp(-h / H)                  [ISA-scale-height model, H=8.5 km]
//
// Δv gift to the rocket:
//     Δv_reduction = v_exit + savings(h)
//     savings(h) = LOSS_BUDGET · (1 − exp(-h / LOSS_SCALE))
//
// The launch assist is treated as an add-on: the mission Δv budget is fixed
// (target orbit unchanged) but the rocket only needs to provide
//   Δv_rocket = mission.delta_v_m_s − Δv_reduction
// This shrinks GLOW without requiring a new mission definition.

import { G0 } from './constants.js';
import {
  AIR_DENSITY_SEA_LEVEL_KG_M3,
  ASSIST_LOSS_BUDGET_M_S,
  ASSIST_LOSS_SCALE_HEIGHT_M,
  ATMOSPHERE_SCALE_HEIGHT_M,
} from './constants.js';
import type { LaunchAssistConfig, LaunchAssistResult } from './types.js';

/** ISA-anchored exponential air density (kg/m³) at altitude h (m). */
export function airDensityAtAltitude(h_m: number): number {
  if (h_m < 0) return AIR_DENSITY_SEA_LEVEL_KG_M3;
  return AIR_DENSITY_SEA_LEVEL_KG_M3 * Math.exp(-h_m / ATMOSPHERE_SCALE_HEIGHT_M);
}

/**
 * Δv the rocket no longer has to spend because it starts at altitude h with
 * some kinetic energy. Combines the direct exit-velocity gift with the
 * atmospheric-loss savings.
 */
export function assistDeltaVReduction(
  exitVelocity_m_s: number,
  baseElevation_m: number,
): { total_m_s: number; exit_savings_m_s: number; altitude_savings_m_s: number } {
  const exit_savings_m_s = Math.max(0, exitVelocity_m_s);
  const altitude_savings_m_s =
    ASSIST_LOSS_BUDGET_M_S *
    (1 - Math.exp(-Math.max(0, baseElevation_m) / ASSIST_LOSS_SCALE_HEIGHT_M));
  return {
    total_m_s: exit_savings_m_s + altitude_savings_m_s,
    exit_savings_m_s,
    altitude_savings_m_s,
  };
}

/**
 * Compute the full sizing result for a launch assist given a vehicle mass
 * (GLOW) already known from the reduced-Δv rocket solve.
 */
export function computeLaunchAssist(
  config: LaunchAssistConfig,
  vehicle_mass_kg: number,
): LaunchAssistResult {
  const elevation_m = config.base_elevation_km * 1_000;
  const theta_rad = (config.track_angle_deg * Math.PI) / 180;
  const a_ms2 = config.peak_acceleration_g * G0;

  const rho = config.partial_vacuum ? 0 : airDensityAtAltitude(elevation_m);
  const drag_N =
    0.5 *
    rho *
    Math.max(0, config.drag_coefficient) *
    Math.max(0, config.vehicle_cross_section_m2) *
    config.exit_velocity_m_s *
    config.exit_velocity_m_s;

  const gravity_along_track_N = vehicle_mass_kg * G0 * Math.sin(theta_rad);
  const accel_thrust_N = vehicle_mass_kg * a_ms2;
  const peak_thrust_N = accel_thrust_N + gravity_along_track_N + drag_N;

  // Mechanical power at exit velocity.
  const mech_power_W = peak_thrust_N * config.exit_velocity_m_s;
  // Electrical demand at the substation, accounting for drive efficiency η.
  const eta = Math.min(1, Math.max(0.05, config.drive_efficiency));
  const peak_power_W = mech_power_W / eta;

  // Track length + duration under constant a.
  const track_length_m =
    a_ms2 > 0 ? (config.exit_velocity_m_s * config.exit_velocity_m_s) / (2 * a_ms2) : 0;
  const duration_s = a_ms2 > 0 ? config.exit_velocity_m_s / a_ms2 : 0;

  // Total energy delivered: kinetic + potential (height gained by the incline).
  const height_gained_m = track_length_m * Math.sin(theta_rad);
  const kinetic_J = 0.5 * vehicle_mass_kg * config.exit_velocity_m_s ** 2;
  const potential_J = vehicle_mass_kg * G0 * height_gained_m;
  const total_energy_J = kinetic_J + potential_J;

  const dv = assistDeltaVReduction(config.exit_velocity_m_s, elevation_m);

  return {
    enabled: true,
    delta_v_reduction_m_s: dv.total_m_s,
    exit_velocity_savings_m_s: dv.exit_savings_m_s,
    altitude_loss_savings_m_s: dv.altitude_savings_m_s,
    track_length_m,
    duration_s,
    peak_thrust_N,
    peak_power_W,
    air_density_kg_m3: rho,
    drag_force_at_exit_N: drag_N,
    total_energy_J,
    vehicle_mass_kg,
  };
}
