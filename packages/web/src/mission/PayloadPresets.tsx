import { PAYLOAD_MAX_KG, PAYLOAD_MIN_KG } from '@propelx/engine';
import { useDesignStore } from '../state/designStore.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

interface Preset {
  label: string;
  kg: number;
  crewed: boolean;
}

const PRESETS: Preset[] = [
  { label: 'CubeSat', kg: 25, crewed: false },
  { label: 'Small satellite', kg: 500, crewed: false },
  { label: 'Comms satellite', kg: 3_500, crewed: false },
  { label: 'Cargo capsule', kg: 6_500, crewed: false },
  { label: 'Crew (2 astronauts)', kg: 9_500, crewed: true },
  { label: 'Crew (4 astronauts)', kg: 12_500, crewed: true },
];

export function PayloadPresets() {
  const payload = useDesignStore((s) => s.design.mission.payload_kg);
  const setPayload = useDesignStore((s) => s.setPayload);
  const setCrewed = useDesignStore((s) => s.setCrewed);

  const applyPreset = (p: Preset) => {
    setPayload(p.kg);
    setCrewed(p.crewed);
  };

  const inBounds = payload >= PAYLOAD_MIN_KG && payload <= PAYLOAD_MAX_KG;

  return (
    <div className="payload-presets">
      <label htmlFor="payload-kg">
        Payload (kg) <HelpTip {...HELP.payload} />
      </label>
      <input
        id="payload-kg"
        type="number"
        min={PAYLOAD_MIN_KG}
        max={PAYLOAD_MAX_KG}
        value={payload}
        onChange={(e) => setPayload(Number(e.target.value))}
        aria-invalid={!inBounds}
      />
      {!inBounds ? (
        <div className="hint error">
          Must be between {PAYLOAD_MIN_KG.toLocaleString()} and {PAYLOAD_MAX_KG.toLocaleString()} kg.
        </div>
      ) : null}
      <div className="preset-buttons">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={payload === p.kg ? 'active' : ''}
            onClick={() => applyPreset(p)}
          >
            <strong>{p.label}</strong>
            <span>{p.kg.toLocaleString()} kg</span>
          </button>
        ))}
      </div>
    </div>
  );
}
