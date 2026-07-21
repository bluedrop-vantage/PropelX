import { useDesignStore } from '../state/designStore.js';
import { ModuleCard } from './ModuleCard.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

export function Pantry() {
  const catalog = useDesignStore((s) => s.catalog);
  return (
    <section className="pantry" aria-label="Propulsion pantry" tabIndex={0}>
      <h2>
        Pantry <HelpTip {...HELP.pantry} />
      </h2>
      <p className="hint">Drag a module onto the stack, or use Insert.</p>
      <ul className="pantry-list" role="list">
        {catalog.modules.map((m) => (
          <li key={m.id}>
            <ModuleCard module={m} />
          </li>
        ))}
      </ul>
    </section>
  );
}
