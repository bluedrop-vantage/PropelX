// Slim status bar shown at the top of the results panel when a challenge is
// active. Summarises progress without leaving the physics/economics view.

import { useDesignStore } from '../state/designStore.js';
import { useEconomicsStore } from '../state/economicsStore.js';
import { useChallengesStore } from '../state/challengesStore.js';
import { CHALLENGES } from './catalog.js';
import { evaluateChallenge } from './detector.js';

export function ChallengeBanner() {
  const activeId = useChallengesStore((s) => s.activeChallengeId);
  const design = useDesignStore((s) => s.design);
  const solveResult = useDesignStore((s) => s.solveResult);
  const cost = useEconomicsStore((s) => s.cost);
  const suggestions = useEconomicsStore((s) => s.suggestions);
  const setActive = useChallengesStore((s) => s.setActiveChallenge);

  if (!activeId) return null;
  const challenge = CHALLENGES.find((c) => c.id === activeId);
  if (!challenge) return null;

  const status = evaluateChallenge(challenge, design, solveResult, cost, suggestions);
  const metCount = status.results.filter((r) => r.met).length +
    (challenge.bannedModules && !status.bannedModuleUsed ? 1 : 0);
  const totalCount = status.results.length + (challenge.bannedModules ? 1 : 0);

  return (
    <div
      className={`challenge-banner${status.allMet ? ' cleared' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div>
        <strong>Challenge:</strong> {challenge.name}
        <span className="progress">
          {metCount} / {totalCount} criteria met
        </span>
      </div>
      <button
        type="button"
        onClick={() => setActive(null)}
        aria-label="End the active challenge"
      >
        End
      </button>
    </div>
  );
}
