// Comparison tray (spec §7.3). Side-by-side table of the current design
// plus up to 3 pinned designs. Each row shows GLOW, payload fraction, and —
// when Phase 2 economics are visible — cost per kg to orbit.

import { useMemo, useState } from 'react';
import { solve, type DesignDoc } from '@propelx/engine';
import { estimateCost } from '@propelx/suggestions';
import { useDesignStore } from '../state/designStore.js';
import { useEconomicsStore } from '../state/economicsStore.js';
import { usePinnedStore, MAX_PINNED } from '../state/pinnedStore.js';
import { formatMass, formatPercent } from '../lib/format.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

function usd(x: number): string {
  if (!Number.isFinite(x) || x <= 0) return '—';
  if (x >= 1_000_000) return `$${(x / 1_000_000).toFixed(2)}M`;
  if (x >= 1_000) return `$${(x / 1_000).toFixed(1)}k`;
  return `$${Math.round(x).toLocaleString()}`;
}

function defaultLabel(design: DesignDoc, catalog: ReturnType<typeof useDesignStore.getState>['catalog']): string {
  if (design.stack.length === 0) return 'Empty stack';
  const names = design.stack.map((s) => catalog.byId(s.module_id).name.split(' ')[0]).join('/');
  return `${names} → ${design.mission.destination}`;
}

export function ComparisonTray() {
  const design = useDesignStore((s) => s.design);
  const catalog = useDesignStore((s) => s.catalog);
  const currentSolve = useDesignStore((s) => s.solveResult);
  const hydrate = useDesignStore((s) => s.hydrateDesign);
  const assumptions = useEconomicsStore((s) => s.assumptions);
  const currentCost = useEconomicsStore((s) => s.cost);
  const pinned = usePinnedStore((s) => s.items);
  const pin = usePinnedStore((s) => s.pin);
  const unpin = usePinnedStore((s) => s.unpin);
  const [open, setOpen] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');

  // For each pinned design, compute solve + cost on the fly with the current
  // assumptions. Recomputes are cheap (< 100 ms per solve) and stay in sync
  // when the user edits the Assumptions Drawer.
  const rows = useMemo(() => {
    return pinned.map((p) => {
      const s = solve(p.design, catalog);
      const c = estimateCost(p.design, s, assumptions, catalog);
      return { pin: p, solve: s, cost: c };
    });
  }, [pinned, catalog, assumptions]);

  const disabled = !currentSolve.valid || pinned.length >= MAX_PINNED;

  return (
    <section className="comparison-tray" aria-label="Design comparison">
      <div className="tray-header">
        <button
          type="button"
          className="tray-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? '▼' : '▶'} Compare ({pinned.length}/{MAX_PINNED} pinned)
        </button>
        <HelpTip {...HELP.comparison} />
      </div>
      {open ? (
        <div className="tray-body">
          <div className="pin-controls">
            <input
              type="text"
              placeholder={defaultLabel(design, catalog)}
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              maxLength={40}
              aria-label="Label for pinned design"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                pin(labelDraft.trim() || defaultLabel(design, catalog), design);
                setLabelDraft('');
              }}
              title={
                !currentSolve.valid
                  ? 'Fix the current design before pinning it.'
                  : pinned.length >= MAX_PINNED
                    ? `You can pin at most ${MAX_PINNED} designs.`
                    : 'Snapshot the current design for side-by-side comparison.'
              }
            >
              Pin current
            </button>
          </div>
          {pinned.length === 0 ? (
            <p className="empty">
              No pinned designs yet. Snapshot the current design to compare it against variants.
            </p>
          ) : (
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Design</th>
                  <th>GLOW</th>
                  <th>Payload fx</th>
                  <th>$/kg</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr className="current">
                  <td>
                    <strong>Current</strong>
                    <br />
                    <span className="row-sub">{defaultLabel(design, catalog)}</span>
                  </td>
                  <td>{currentSolve.valid ? formatMass(currentSolve.glow_kg) : '—'}</td>
                  <td>{currentSolve.valid ? formatPercent(currentSolve.payload_fraction) : '—'}</td>
                  <td>{usd(currentCost.costPerKgOrbitUsd)}</td>
                  <td />
                </tr>
                {rows.map((r) => (
                  <tr key={r.pin.id}>
                    <td>
                      <strong>{r.pin.label}</strong>
                      <br />
                      <span className="row-sub">{defaultLabel(r.pin.design, catalog)}</span>
                    </td>
                    <td>{r.solve.valid ? formatMass(r.solve.glow_kg) : '—'}</td>
                    <td>{r.solve.valid ? formatPercent(r.solve.payload_fraction) : '—'}</td>
                    <td>{usd(r.cost.costPerKgOrbitUsd)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        onClick={() => hydrate(r.pin.design)}
                        title="Load this design into the canvas"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => unpin(r.pin.id)}
                        title="Remove this pinned design"
                        aria-label={`Remove ${r.pin.label}`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </section>
  );
}
