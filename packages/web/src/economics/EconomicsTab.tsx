import { useEffect } from 'react';
import { useEconomicsStore } from '../state/economicsStore.js';
import { CostBreakdown } from './CostBreakdown.js';
import { SuggestionsPanel } from './SuggestionsPanel.js';
import { AssumptionsDrawer } from './AssumptionsDrawer.js';
import { ReuseToggle } from './ReuseToggle.js';
import { AdvisorNarrative } from './AdvisorNarrative.js';

export function EconomicsTab() {
  const setOpen = useEconomicsStore((s) => s.setEconomicsTabOpen);
  useEffect(() => {
    setOpen(true);
    return () => setOpen(false);
  }, [setOpen]);
  return (
    <div className="economics-tab" aria-label="Economics">
      <ReuseToggle />
      <CostBreakdown />
      <SuggestionsPanel />
      <AdvisorNarrative />
      <AssumptionsDrawer />
    </div>
  );
}
