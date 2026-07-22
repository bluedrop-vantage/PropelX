// "Explain" modal — walks the user through the exact math the engine used
// for the current design. Numbers come from explain.ts, which shares the
// engine's own sizing primitives so the walkthrough is always in sync.

import { useEffect } from 'react';
import { branding } from '../branding/Wordmark.js';
import { useDesignStore } from '../state/designStore.js';
import type { Explanation, StageMath } from './explain.js';
import { explainSolve } from './explain.js';

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000).toFixed(0)},${(Math.abs(n) % 1_000).toFixed(0).padStart(3, '0')}`;
  if (Math.abs(n) >= 1_000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 10) return n.toFixed(digits);
  return n.toFixed(digits + 1);
}

function fmtMass(kg: number): string {
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(2)} t`;
  return `${kg.toFixed(0)} kg`;
}

function StageBlock({ s }: { s: StageMath }) {
  const denomOk = s.denominator > 0;
  return (
    <div className={`stage-math${s.feasible ? '' : ' infeasible'}`}>
      <h4>
        {s.position === 0
          ? `Stage 0 · ${s.moduleName} (boosters)`
          : `Stage ${s.position} · ${s.moduleName}`}
      </h4>

      <div className="eq-row">
        <span className="eq-label">Isp mode</span>
        <code>{s.ispModeLabel}</code>
      </div>
      {s.ispBlend ? (
        <div className="eq-row">
          <span className="eq-label">Isp used</span>
          <code>
            0.85 × {s.ispBlend.sl_s} + 0.15 × {s.ispBlend.vac_s} = <b>{s.ispUsed_s.toFixed(1)} s</b>
          </code>
        </div>
      ) : (
        <div className="eq-row">
          <span className="eq-label">
            Isp used {s.ispOverride !== undefined ? '(user override)' : ''}
          </span>
          <code>
            <b>{s.ispUsed_s.toFixed(1)} s</b>
          </code>
        </div>
      )}
      <div className="eq-row">
        <span className="eq-label">Ve = Isp · g₀</span>
        <code>
          {s.ispUsed_s.toFixed(1)} × 9.80665 = <b>{fmt(s.ve_m_s)} m/s</b>
        </code>
      </div>
      <div className="eq-row">
        <span className="eq-label">R = exp(Δv / Ve)</span>
        <code>
          exp({fmt(s.deltaV_m_s, 0)} / {fmt(s.ve_m_s, 0)}) = <b>{s.R.toFixed(3)}</b>
        </code>
      </div>
      <div className="eq-row">
        <span className="eq-label">
          ε {s.epsOverride !== undefined ? '(user override)' : ''}
        </span>
        <code>
          <b>{s.epsUsed.toFixed(3)}</b>
        </code>
      </div>
      <div className="eq-row">
        <span className="eq-label">k = ε / (1 − ε)</span>
        <code>
          {s.epsUsed.toFixed(3)} / (1 − {s.epsUsed.toFixed(3)}) = <b>{s.k.toFixed(4)}</b>
        </code>
      </div>
      <div className={`eq-row ${denomOk ? '' : 'fail'}`}>
        <span className="eq-label">Denominator = 1 − (R−1)·k</span>
        <code>
          1 − ({s.R.toFixed(3)} − 1) × {s.k.toFixed(4)} ={' '}
          <b>{s.denominator.toFixed(4)}</b>
          {denomOk ? ' ✓' : ' ≤ 0 → INFEASIBLE'}
        </code>
      </div>
      {!s.feasible ? (
        <div className="feasibility-note">
          <strong>Tank-growth spiral (V-5):</strong> {s.reason ?? 'This stage cannot close.'}
        </div>
      ) : (
        <>
          <div className="eq-row">
            <span className="eq-label">m_above (payload + everything higher)</span>
            <code>
              <b>{fmtMass(s.massAbove_kg)}</b>
            </code>
          </div>
          <div className="eq-row">
            <span className="eq-label">mp = (R−1) · m_above / denominator</span>
            <code>
              ({s.R.toFixed(3)} − 1) × {fmtMass(s.massAbove_kg)} / {s.denominator.toFixed(4)} ={' '}
              <b>{fmtMass(s.mp_kg)}</b>
            </code>
          </div>
          <div className="eq-row">
            <span className="eq-label">ms = k · mp</span>
            <code>
              {s.k.toFixed(4)} × {fmtMass(s.mp_kg)} = <b>{fmtMass(s.ms_kg)}</b>
            </code>
          </div>
          <div className="eq-row summary">
            <span className="eq-label">Mass below this stage</span>
            <code>
              {fmtMass(s.massAbove_kg)} + {fmtMass(s.mp_kg)} + {fmtMass(s.ms_kg)} ={' '}
              <b>{fmtMass(s.massBelow_kg)}</b>
            </code>
          </div>
        </>
      )}
    </div>
  );
}

function ExplanationBody({ ex }: { ex: Explanation }) {
  if (!ex.hasDesign) {
    return (
      <p className="hint">
        Add at least one stage to the vehicle first — there's nothing to explain yet.
      </p>
    );
  }

  return (
    <>
      <section>
        <h3>Mission</h3>
        <div className="eq-row">
          <span className="eq-label">Mode</span>
          <code>
            {ex.mission.type === 'in-space' ? 'in-space (no gravity/drag losses)' : 'launch (from the pad)'}
          </code>
        </div>
        <div className="eq-row">
          <span className="eq-label">Destination</span>
          <code>{ex.mission.destination}</code>
        </div>
        <div className="eq-row">
          <span className="eq-label">Δv target</span>
          <code><b>{fmt(ex.mission.deltaVTarget_m_s, 0)} m/s</b></code>
        </div>
        <div className="eq-row">
          <span className="eq-label">Payload</span>
          <code><b>{fmtMass(ex.mission.payload_kg)}</b>{ex.mission.crewed ? ' (crewed)' : ''}</code>
        </div>
      </section>

      {ex.launchAssist ? (
        <section>
          <h3>Launch assist Δv gift</h3>
          <div className="eq-row">
            <span className="eq-label">Exit velocity gift</span>
            <code>
              <b>{fmt(ex.launchAssist.exitSavings_m_s, 0)} m/s</b>
            </code>
          </div>
          <div className="eq-row">
            <span className="eq-label">
              Altitude loss savings = 1,600 · (1 − e^(−h / 12 km))
            </span>
            <code>
              1600 · (1 − exp(−{ex.launchAssist.baseElevation_km.toFixed(1)}/12)) ={' '}
              <b>{fmt(ex.launchAssist.altitudeSavings_m_s, 0)} m/s</b>
            </code>
          </div>
          <div className="eq-row summary">
            <span className="eq-label">Effective rocket Δv</span>
            <code>
              {fmt(ex.mission.deltaVTarget_m_s, 0)} − {fmt(ex.launchAssist.totalReduction_m_s, 0)} ={' '}
              <b>{fmt(ex.launchAssist.effectiveRocketDeltaV_m_s, 0)} m/s</b>
            </code>
          </div>
        </section>
      ) : null}

      {ex.boosters ? (
        <section>
          <h3>Strap-on boosters</h3>
          <p className="hint">{ex.boosters.note}</p>
        </section>
      ) : null}

      <section>
        <h3>Δv allocation ({ex.allocation.mode})</h3>
        <p className="hint">
          {ex.allocation.mode === 'auto'
            ? 'Nelder–Mead over softmax(z) fractions minimising GLOW under §6.2 feasibility.'
            : 'User-specified split — the optimizer is skipped.'}
        </p>
        <div className="alloc-strip">
          {ex.allocation.entries.map((e, i) => (
            <div key={i} className="alloc-chip">
              <span className="alloc-label">{e.label}</span>
              <span className="alloc-value">{fmt(e.deltaV_m_s, 0)}</span>
              <span className="alloc-unit">m/s</span>
            </div>
          ))}
        </div>
        <div className="eq-row summary">
          <span className="eq-label">Sum</span>
          <code>
            {fmt(ex.allocation.total_m_s, 0)} m/s (target {fmt(ex.allocation.target_m_s, 0)} m/s)
          </code>
        </div>
      </section>

      {ex.stages.length > 0 ? (
        <section>
          <h3>Per-stage sizing (top-down, spec §6.2)</h3>
          <p className="hint">
            Payload is the initial m_above. Each stage adds its own propellant + dry mass,
            which becomes m_above for the stage below.
          </p>
          {ex.stages.map((s, i) => (
            <StageBlock key={`${s.position}-${i}`} s={s} />
          ))}
        </section>
      ) : null}

      <section>
        <h3>Verdict</h3>
        {ex.final.valid ? (
          <>
            <div className="eq-row summary">
              <span className="eq-label">GLOW</span>
              <code><b>{fmtMass(ex.final.glow_kg)}</b></code>
            </div>
            <div className="eq-row">
              <span className="eq-label">Payload fraction = payload / GLOW</span>
              <code>
                {fmtMass(ex.mission.payload_kg)} / {fmtMass(ex.final.glow_kg)} ={' '}
                <b>{(ex.final.payloadFraction * 100).toFixed(2)}%</b>
              </code>
            </div>
            {ex.final.maxPayload_kg !== null ? (
              <div className="eq-row">
                <span className="eq-label">Max payload (bisection)</span>
                <code>
                  <b>{fmtMass(ex.final.maxPayload_kg)}</b> — largest payload that still closes.
                </code>
              </div>
            ) : null}
          </>
        ) : (
          <p className="fail-line">
            <strong>Invalid:</strong> {ex.final.firstViolation ?? 'design does not close.'}
          </p>
        )}
      </section>
    </>
  );
}

export function ExplainModal({ onClose }: { onClose: () => void }) {
  const design = useDesignStore((s) => s.design);
  const solveResult = useDesignStore((s) => s.solveResult);
  const catalog = useDesignStore((s) => s.catalog);
  const ex = explainSolve(design, solveResult, catalog);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal explain-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="explain-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close explain dialog"
        >
          ✕
        </button>
        <h2 id="explain-title">How this design was computed</h2>
        <p className="hint">
          The engine walks through the Tsiolkovsky rocket equation stage-by-stage. Numbers
          below are the exact values it used for the current design.
        </p>
        <ExplanationBody ex={ex} />
        <footer className="modal-footer">{branding.copyrightLine}</footer>
      </div>
    </div>
  );
}
