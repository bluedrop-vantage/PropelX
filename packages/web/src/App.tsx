import { useEffect, useState } from 'react';
import { attachUrlSync } from './state/urlSync.js';
import { Wordmark, Footer, branding } from './branding/Wordmark.js';
import { MissionPanel } from './mission/MissionPanel.js';
import { Pantry } from './pantry/Pantry.js';
import { AssemblyCanvas } from './canvas/AssemblyCanvas.js';
import { ResultsPanel } from './results/ResultsPanel.js';
import { AboutModal } from './branding/AboutModal.js';
import { EconomicsTab } from './economics/EconomicsTab.js';
import { ComparisonTray } from './results/ComparisonTray.js';
import { UnitsToggle } from './branding/UnitsToggle.js';
import { useUnitsStore } from './state/unitsStore.js';
import { ChallengesPanel } from './challenges/ChallengesPanel.js';
import { HowToUseModal } from './help/HowToUseModal.js';

type Tab = 'physics' | 'economics' | 'challenges';

export function App() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('physics');
  // Subscribing at the App root re-renders the tree whenever the user flips
  // metric ↔ imperial, so every `formatMass`/`formatDeltaV` call sees fresh
  // output without every component needing its own subscription.
  useUnitsStore((s) => s.system);

  useEffect(() => attachUrlSync(), []);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', branding.accent);
    document.documentElement.style.setProperty('--accent-dark', branding.accentDark);
  }, []);

  return (
    <div className="app">
      <a href="#main-canvas" className="skip-link">
        Skip to assembly canvas
      </a>
      <header className="app-header">
        <Wordmark />
        <div className="header-actions">
          <UnitsToggle />
          <button type="button" onClick={() => setHowToOpen(true)} className="how-to-btn">
            How to use
          </button>
          <button type="button" onClick={() => setAboutOpen(true)}>
            About
          </button>
        </div>
      </header>
      <main className="layout">
        <Pantry />
        <div id="main-canvas">
          <AssemblyCanvas />
        </div>
        <aside className="right-column">
          <MissionPanel />
          <div className="tab-bar" role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'physics'}
              className={tab === 'physics' ? 'active' : ''}
              onClick={() => setTab('physics')}
            >
              Physics
            </button>
            <button
              role="tab"
              aria-selected={tab === 'economics'}
              className={tab === 'economics' ? 'active' : ''}
              onClick={() => setTab('economics')}
            >
              Economics
            </button>
            <button
              role="tab"
              aria-selected={tab === 'challenges'}
              className={tab === 'challenges' ? 'active' : ''}
              onClick={() => setTab('challenges')}
            >
              Challenges
            </button>
          </div>
          {tab === 'physics' ? (
            <ResultsPanel />
          ) : tab === 'economics' ? (
            <EconomicsTab />
          ) : (
            <ChallengesPanel />
          )}
          <ComparisonTray />
        </aside>
      </main>
      <Footer />
      {aboutOpen ? <AboutModal onClose={() => setAboutOpen(false)} /> : null}
      {howToOpen ? <HowToUseModal onClose={() => setHowToOpen(false)} /> : null}
    </div>
  );
}
