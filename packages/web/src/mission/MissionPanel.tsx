// Mission panel: destination + payload + crewed callout (spec §4).

import { useDesignStore } from '../state/designStore.js';
import { DestinationPicker } from './DestinationPicker.js';
import { PayloadPresets } from './PayloadPresets.js';
import { CrewedCallout } from './CrewedCallout.js';
import { LaunchAssistPanel } from './LaunchAssistPanel.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';

export function MissionPanel() {
  const mission = useDesignStore((s) => s.design.mission);
  return (
    <section className="mission-panel" aria-label="Mission" tabIndex={0}>
      <h2>
        Mission <HelpTip {...HELP.mission} />
      </h2>
      <DestinationPicker />
      <PayloadPresets />
      {mission.crewed ? <CrewedCallout /> : null}
      <LaunchAssistPanel />
    </section>
  );
}
