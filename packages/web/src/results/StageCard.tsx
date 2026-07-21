import type { DesignDoc, StageResult } from '@propelx/engine';
import { useDesignStore } from '../state/designStore.js';
import {
  formatDeltaV,
  formatIsp,
  formatMass,
  formatRatio,
  formatVolume,
} from '../lib/format.js';

interface Props {
  stage: StageResult;
  design: DesignDoc;
  index: number;
}

export function StageCard({ stage, design, index }: Props) {
  const catalog = useDesignStore((s) => s.catalog);
  const entry = design.stack[index];
  if (!entry) return null;
  const mod = catalog.byId(entry.module_id);
  const hasOxidizer = mod.mixture_ratio_ox_to_fuel !== null;

  return (
    <article className="stage-card" aria-label={`Stage ${stage.position} details`}>
      <header>
        <h3>Stage {stage.position}</h3>
        <span>{mod.name}</span>
      </header>
      <dl>
        <div>
          <dt>Δv</dt>
          <dd>{formatDeltaV(stage.delta_v_m_s)}</dd>
        </div>
        <div>
          <dt>Isp used</dt>
          <dd>{formatIsp(stage.isp_used_s)}</dd>
        </div>
        <div>
          <dt>Mass ratio</dt>
          <dd>{formatRatio(stage.mass_ratio)}</dd>
        </div>
        <div>
          <dt>Propellant</dt>
          <dd>{formatMass(stage.propellant_kg)}</dd>
        </div>
        {hasOxidizer ? (
          <>
            <div>
              <dt>Fuel</dt>
              <dd>{formatMass(stage.fuel_kg)}</dd>
            </div>
            <div>
              <dt>Oxidizer</dt>
              <dd>{formatMass(stage.oxidizer_kg)}</dd>
            </div>
          </>
        ) : null}
        <div>
          <dt>Dry mass</dt>
          <dd>{formatMass(stage.dry_kg)}</dd>
        </div>
        <div>
          <dt>Tank vol</dt>
          <dd>{formatVolume(stage.tank_volume_m3)}</dd>
        </div>
        <div>
          <dt>Max TWR</dt>
          <dd>{stage.twr_ignition.toFixed(2)}</dd>
        </div>
      </dl>
    </article>
  );
}
