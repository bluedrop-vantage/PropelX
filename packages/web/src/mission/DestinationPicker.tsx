import {
  CUSTOM_DELTA_V_MAX_M_S,
  CUSTOM_DELTA_V_MIN_M_S,
  IN_SPACE_DESTINATIONS,
  LAUNCH_DESTINATIONS,
  type DestinationId,
} from '@propelx/engine';
import { useDesignStore } from '../state/designStore.js';
import { formatDeltaV } from '../lib/format.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

interface Option {
  id: DestinationId;
  label: string;
  hint: string;
}

const LAUNCH_OPTIONS: Record<Exclude<DestinationId, 'CUSTOM'> | 'CUSTOM', Option> = {
  LEO: { id: 'LEO', label: 'Low Earth orbit', hint: 'ISS-class, ~200 km' },
  SSO: { id: 'SSO', label: 'Sun-synchronous', hint: 'Higher inclination' },
  GTO: { id: 'GTO', label: 'Geostationary transfer', hint: 'LEO + ~2.5 km/s' },
  TLI: { id: 'TLI', label: 'Trans-lunar injection', hint: 'LEO + ~3.2 km/s' },
  LEO_TO_GTO: { id: 'LEO_TO_GTO', label: 'LEO → GTO', hint: 'In-space transfer' },
  LEO_TO_TLI: { id: 'LEO_TO_TLI', label: 'LEO → TLI', hint: 'In-space injection' },
  GTO_TO_GEO: { id: 'GTO_TO_GEO', label: 'GTO → GEO', hint: 'Apogee circularisation' },
  LEO_TO_MARS: { id: 'LEO_TO_MARS', label: 'LEO → Mars', hint: 'Trans-Mars injection' },
  CUSTOM: { id: 'CUSTOM', label: 'Custom', hint: 'Advanced' },
};

export function DestinationPicker() {
  const type = useDesignStore((s) => s.design.mission.type ?? 'launch');
  const destination = useDesignStore((s) => s.design.mission.destination);
  const deltaV = useDesignStore((s) => s.design.mission.delta_v_m_s);
  const setDestination = useDesignStore((s) => s.setDestination);
  const setMissionType = useDesignStore((s) => s.setMissionType);

  const ids = type === 'in-space' ? IN_SPACE_DESTINATIONS : LAUNCH_DESTINATIONS;
  const options = ids.map((id) => LAUNCH_OPTIONS[id]);

  return (
    <div className="destination-picker">
      <div className="mission-type-row">
        <label className="section-sublabel">Mission type</label>
        <HelpTip {...HELP.missionType} />
      </div>
      <div className="mission-type-toggle" role="group" aria-label="Mission type">
        <button
          type="button"
          className={type === 'launch' ? 'active' : ''}
          onClick={() => setMissionType('launch')}
          aria-pressed={type === 'launch'}
          title="Design lifts a payload from the pad to orbit."
        >
          Launch
        </button>
        <button
          type="button"
          className={type === 'in-space' ? 'active' : ''}
          onClick={() => setMissionType('in-space')}
          aria-pressed={type === 'in-space'}
          title="Design begins in orbit; no gravity/drag budget. Ion, cold gas, and hydrolox become legitimate choices."
        >
          In-space
        </button>
      </div>
      <label htmlFor="destination-select">Destination</label>
      <select
        id="destination-select"
        value={destination}
        onChange={(e) => setDestination(e.target.value as DestinationId)}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="hint">{LAUNCH_OPTIONS[destination]?.hint}</div>
      {destination === 'CUSTOM' ? (
        <div className="custom-dv">
          <label htmlFor="custom-dv">Δv budget</label>
          <input
            id="custom-dv"
            type="range"
            min={CUSTOM_DELTA_V_MIN_M_S}
            max={CUSTOM_DELTA_V_MAX_M_S}
            step={100}
            value={deltaV}
            onChange={(e) => setDestination('CUSTOM', Number(e.target.value))}
          />
          <output>{formatDeltaV(deltaV)}</output>
        </div>
      ) : (
        <div className="dv-readout">Δv required: {formatDeltaV(deltaV)}</div>
      )}
    </div>
  );
}
