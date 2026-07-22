import { useState } from 'react';
import { useDesignStore } from '../state/designStore.js';
import { VerdictBanner } from './VerdictBanner.js';
import { DeltaVWaterfall } from './DeltaVWaterfall.js';
import { MassBreakdown } from './MassBreakdown.js';
import { StageCard } from './StageCard.js';
import { KeyFigures } from './KeyFigures.js';
import { ChallengeBanner } from '../challenges/ChallengeBanner.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';
import { ExplainModal } from '../physics/ExplainModal.js';

export function ResultsPanel() {
  const result = useDesignStore((s) => s.solveResult);
  const design = useDesignStore((s) => s.design);
  const emptyStack = design.stack.length === 0;
  const [explainOpen, setExplainOpen] = useState(false);
  return (
    <section className="results-panel" aria-label="Results" tabIndex={0}>
      <div className="results-header">
        <h2>
          Results <HelpTip {...HELP.results} />
        </h2>
        <button
          type="button"
          className="explain-btn"
          onClick={() => setExplainOpen(true)}
          disabled={emptyStack}
          title={emptyStack ? 'Add a stage first' : 'Show the equations and values used'}
          aria-label="Explain how this design was computed"
        >
          <span className="explain-icon" aria-hidden="true">ƒ</span> Explain
        </button>
      </div>
      <ChallengeBanner />
      <VerdictBanner />
      {result.valid ? (
        <>
          <KeyFigures />
          <DeltaVWaterfall />
          <MassBreakdown />
          <div className="stage-cards">
            {result.stages.map((s, i) => (
              <StageCard key={i} stage={s} design={design} index={i} />
            ))}
          </div>
        </>
      ) : emptyStack ? (
        // Fresh/reset canvas: the verdict banner already says "add a stage".
        // Skip the redundant V-1 violation list.
        null
      ) : (
        <ul className="violation-list" role="list">
          {result.violations.map((v, i) => (
            <li key={i} className="violation">
              <strong>{v.rule}</strong>
              {v.stage ? <span className="stage-tag">stage {v.stage}</span> : null}
              <p>{v.message}</p>
            </li>
          ))}
        </ul>
      )}
      {result.warnings.length > 0 && !emptyStack ? (
        <ul className="warning-list" role="list">
          {result.warnings.map((w, i) => (
            <li key={i} className="warning">
              <strong>{w.rule}</strong>
              {w.stage ? <span className="stage-tag">stage {w.stage}</span> : null}
              <p>{w.message}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {explainOpen ? <ExplainModal onClose={() => setExplainOpen(false)} /> : null}
    </section>
  );
}
