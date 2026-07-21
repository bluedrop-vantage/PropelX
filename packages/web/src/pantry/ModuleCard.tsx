import { useDraggable } from '@dnd-kit/core';
import type { CatalogModule } from '@propelx/engine';
import { useDesignStore } from '../state/designStore.js';
import { formatIsp } from '../lib/format.js';

// Rough "density pip" score 1..5 from the fuel density (bulk propellants
// score higher). Purely visual — no engine effect.
function densityPips(mod: CatalogModule): number {
  const d = mod.densities_kg_m3.fuel ?? 0;
  if (d >= 1500) return 5;
  if (d >= 800) return 4;
  if (d >= 400) return 3;
  if (d >= 100) return 2;
  return 1;
}

export function ModuleCard({ module: mod }: { module: CatalogModule }) {
  const insertStage = useDesignStore((s) => s.insertStage);
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `pantry:${mod.id}`,
    data: { source: 'pantry', module_id: mod.id },
  });
  const pips = densityPips(mod);

  // dnd-kit adds role="button" + tabIndex=0 via `attributes`, which would
  // make the whole article a focusable interactive element — that clashes
  // with the visible Insert button inside (axe: `nested-interactive`).
  // We keep pointer-drag by spreading `listeners`, but drop the interactive
  // role/tabindex so keyboard users route through the Insert button instead.
  const { role: _dndRole, tabIndex: _dndTabIndex, ...restAttrs } = attributes;
  return (
    <article
      ref={setNodeRef}
      className={`module-card${isDragging ? ' dragging' : ''}`}
      aria-label={`${mod.name} propulsion module`}
      {...listeners}
      {...restAttrs}
    >
      <header>
        <h3>{mod.name}</h3>
      </header>
      <dl className="specs">
        <div>
          <dt>Isp (SL)</dt>
          <dd>{mod.isp_sl_s !== null ? formatIsp(mod.isp_sl_s) : '—'}</dd>
        </div>
        <div>
          <dt>Isp (vac)</dt>
          <dd>{formatIsp(mod.isp_vac_s)}</dd>
        </div>
      </dl>
      <div className="pips" aria-label={`density ${pips} of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < pips ? 'on' : 'off'} />
        ))}
        <small>density</small>
      </div>
      <ul className="tags" role="list">
        {mod.tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="note">{mod.notes}</p>
      <button
        type="button"
        className="insert"
        onClick={() => insertStage(mod.id)}
        onKeyDown={(e) => {
          // Prevent dnd-kit's KeyboardSensor (attached to the enclosing card)
          // from swallowing Enter/Space before the button's native click fires.
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
        }}
        aria-label={`Insert ${mod.name} at top of stack`}
      >
        Insert
      </button>
    </article>
  );
}
