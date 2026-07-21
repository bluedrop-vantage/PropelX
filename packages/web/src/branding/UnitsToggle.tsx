import { useUnitsStore } from '../state/unitsStore.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

export function UnitsToggle() {
  const system = useUnitsStore((s) => s.system);
  const setSystem = useUnitsStore((s) => s.setSystem);
  return (
    <div className="units-toggle-wrap">
      <div className="units-toggle" role="group" aria-label="Units">
        <button
          type="button"
          className={system === 'metric' ? 'active' : ''}
          onClick={() => setSystem('metric')}
          aria-pressed={system === 'metric'}
          aria-label="Show values in metric units (kg, m/s, m³)"
        >
          Metric
        </button>
        <button
          type="button"
          className={system === 'imperial' ? 'active' : ''}
          onClick={() => setSystem('imperial')}
          aria-pressed={system === 'imperial'}
          aria-label="Show values in imperial units (lb, ft/s, ft³)"
        >
          Imperial
        </button>
      </div>
      <HelpTip {...HELP.units} />
    </div>
  );
}
