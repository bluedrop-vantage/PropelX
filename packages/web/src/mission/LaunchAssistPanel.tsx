// Electro-magnetic launch-assist configuration panel.
// See Electro-Magnetic Launch Assist Theory.md for the equations.

import {
  ASSIST_ACCEL_MAX_CREWED_G,
  ASSIST_ACCEL_MAX_UNCREWED_G,
  ASSIST_BASE_ELEVATION_MAX_KM,
  ASSIST_EXIT_VELOCITY_AGGRESSIVE_M_S,
  ASSIST_EXIT_VELOCITY_MAX_M_S,
  ASSIST_EXIT_VELOCITY_MIN_M_S,
  ASSIST_TRACK_ANGLE_MAX_DEG,
  type LaunchAssistSystem,
} from '@propelx/engine';
import { useDesignStore } from '../state/designStore.js';
import { formatDeltaV, formatMass } from '../lib/format.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

function usdEnergy(J: number): string {
  // Convert Joules to kWh (electricity market unit) at ~$0.10/kWh so the
  // user sees an order-of-magnitude electricity bill per launch.
  if (!Number.isFinite(J) || J <= 0) return '—';
  const kWh = J / 3.6e6;
  const usd = kWh * 0.1;
  if (usd >= 1_000_000) return `~$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `~$${(usd / 1_000).toFixed(0)}k`;
  return `~$${Math.round(usd)}`;
}

function fmtPower(W: number): string {
  if (!Number.isFinite(W) || W <= 0) return '—';
  if (W >= 1e9) return `${(W / 1e9).toFixed(2)} GW`;
  if (W >= 1e6) return `${(W / 1e6).toFixed(1)} MW`;
  if (W >= 1e3) return `${(W / 1e3).toFixed(0)} kW`;
  return `${Math.round(W)} W`;
}

function fmtForce(N: number): string {
  if (!Number.isFinite(N) || N <= 0) return '—';
  if (N >= 1e6) return `${(N / 1e6).toFixed(2)} MN`;
  if (N >= 1e3) return `${(N / 1e3).toFixed(0)} kN`;
  return `${Math.round(N)} N`;
}

function fmtLength(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return '—';
  if (m >= 1_000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

export function LaunchAssistPanel() {
  const cfg = useDesignStore((s) => s.design.launch_assist);
  const result = useDesignStore((s) => s.solveResult.launch_assist);
  const missionCrewed = useDesignStore((s) => s.design.mission.crewed);
  const setEnabled = useDesignStore((s) => s.setLaunchAssistEnabled);
  const update = useDesignStore((s) => s.updateLaunchAssist);

  const enabled = cfg?.enabled ?? false;
  const accelCap = missionCrewed ? ASSIST_ACCEL_MAX_CREWED_G : ASSIST_ACCEL_MAX_UNCREWED_G;

  return (
    <section className="launch-assist-panel" aria-label="Launch assist">
      <header className="panel-header">
        <label className="switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Launch assist</span>
          <HelpTip {...HELP.launchAssist} />
        </label>
        {enabled ? (
          <span className="panel-hint">reduces rocket Δv</span>
        ) : (
          <span className="panel-hint">add-on: electromagnetic launcher</span>
        )}
      </header>

      {enabled && cfg ? (
        <div className="assist-body">
          <label>
            System type
            <select
              value={cfg.system_type}
              onChange={(e) => update({ system_type: e.target.value as LaunchAssistSystem })}
            >
              <option value="linear_motor">Linear motor (maglev)</option>
              <option value="railgun">Railgun (Lorentz)</option>
              <option value="coilgun">Coilgun (mass driver)</option>
            </select>
          </label>

          <label className="slider">
            <div className="label-row">
              <span>Exit velocity</span>
              <output>
                {formatDeltaV(cfg.exit_velocity_m_s)}
                {cfg.exit_velocity_m_s > ASSIST_EXIT_VELOCITY_AGGRESSIVE_M_S ? (
                  <span className="aggressive"> aggressive</span>
                ) : null}
              </output>
            </div>
            <input
              type="range"
              min={ASSIST_EXIT_VELOCITY_MIN_M_S}
              max={ASSIST_EXIT_VELOCITY_MAX_M_S}
              step={25}
              value={cfg.exit_velocity_m_s}
              onChange={(e) => update({ exit_velocity_m_s: Number(e.target.value) })}
            />
          </label>

          <label className="slider">
            <div className="label-row">
              <span>Track angle</span>
              <output>{cfg.track_angle_deg}°</output>
            </div>
            <input
              type="range"
              min={0}
              max={ASSIST_TRACK_ANGLE_MAX_DEG}
              step={1}
              value={cfg.track_angle_deg}
              onChange={(e) => update({ track_angle_deg: Number(e.target.value) })}
            />
          </label>

          <label className="slider">
            <div className="label-row">
              <span>Base elevation</span>
              <output>{cfg.base_elevation_km.toFixed(1)} km</output>
            </div>
            <input
              type="range"
              min={0}
              max={ASSIST_BASE_ELEVATION_MAX_KM}
              step={0.5}
              value={cfg.base_elevation_km}
              onChange={(e) => update({ base_elevation_km: Number(e.target.value) })}
            />
          </label>

          <label className="slider">
            <div className="label-row">
              <span>Peak acceleration</span>
              <output>{cfg.peak_acceleration_g.toFixed(1)}g</output>
            </div>
            <input
              type="range"
              min={1}
              max={accelCap + 1}
              step={0.5}
              value={cfg.peak_acceleration_g}
              onChange={(e) => update({ peak_acceleration_g: Number(e.target.value) })}
            />
          </label>

          <label className="slider">
            <div className="label-row">
              <span>Drive efficiency</span>
              <output>{(cfg.drive_efficiency * 100).toFixed(0)}%</output>
            </div>
            <input
              type="range"
              min={0.5}
              max={0.98}
              step={0.01}
              value={cfg.drive_efficiency}
              onChange={(e) => update({ drive_efficiency: Number(e.target.value) })}
            />
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={cfg.partial_vacuum}
              onChange={(e) => update({ partial_vacuum: e.target.checked })}
            />
            Partial vacuum tube (drag → 0)
          </label>

          {result ? (
            <dl className="assist-readouts">
              <div>
                <dt>Δv gift to rocket</dt>
                <dd>{formatDeltaV(result.delta_v_reduction_m_s)}</dd>
              </div>
              <div>
                <dt>Track length</dt>
                <dd>{fmtLength(result.track_length_m)}</dd>
              </div>
              <div>
                <dt>Peak thrust</dt>
                <dd>{fmtForce(result.peak_thrust_N)}</dd>
              </div>
              <div>
                <dt>Peak power</dt>
                <dd>{fmtPower(result.peak_power_W)}</dd>
              </div>
              <div>
                <dt>Vehicle mass</dt>
                <dd>{formatMass(result.vehicle_mass_kg)}</dd>
              </div>
              <div>
                <dt>Electricity/launch</dt>
                <dd>{usdEnergy(result.total_energy_J)}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
