import { useDesignStore } from '../state/designStore.js';
import { formatDeltaV, formatMass, formatPercent } from '../lib/format.js';

export function KeyFigures() {
  const result = useDesignStore((s) => s.solveResult);
  const missionDv = useDesignStore((s) => s.design.mission.delta_v_m_s);
  const totalPropellant = result.stages.reduce((a, s) => a + s.propellant_kg, 0);
  const assistDv = result.launch_assist?.delta_v_reduction_m_s;
  return (
    <dl className="key-figures">
      <div>
        <dt>GLOW</dt>
        <dd>{formatMass(result.glow_kg)}</dd>
      </div>
      <div>
        <dt>Payload fraction</dt>
        <dd>{formatPercent(result.payload_fraction)}</dd>
      </div>
      <div>
        <dt>Total propellant</dt>
        <dd>{formatMass(totalPropellant)}</dd>
      </div>
      <div>
        <dt>Stages</dt>
        <dd>{result.stages.length}</dd>
      </div>
      {assistDv && result.effective_rocket_delta_v_m_s !== undefined ? (
        <div className="full-row">
          <dt>Δv split (rocket / assist)</dt>
          <dd>
            {formatDeltaV(result.effective_rocket_delta_v_m_s)}
            <span className="split-sep"> / </span>
            {formatDeltaV(assistDv)}
            <span className="split-total"> of {formatDeltaV(missionDv)}</span>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
