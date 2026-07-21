// Assembly canvas — the center panel (spec §5.1).
// All solve results flow in ONCE at this level and are passed down to sprites
// so we avoid the solve→render→layout coupling flagged in PLAN §7.

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDesignStore } from '../state/designStore.js';
import { StageSprite } from './StageSprite.js';
import { DropZone } from './DropZone.js';
import { PayloadFairing } from './PayloadFairing.js';
import { BoosterControl } from './BoosterControl.js';
import { BoosterBadge } from './BoosterBadge.js';
import { StageDrawer } from './StageDrawer.js';
import { NozzleCluster } from './NozzleCluster.js';
import { ResetButton } from './ResetButton.js';
import { CanvasBackdrop } from './CanvasBackdrop.js';
import { HelpTip } from '../help/HelpTip.js';
import { HELP } from '../help/content.js';
import type { ModuleId } from '@propelx/engine';

export function AssemblyCanvas() {
  const design = useDesignStore((s) => s.design);
  const solveResult = useDesignStore((s) => s.solveResult);
  const insertStage = useDesignStore((s) => s.insertStage);
  const moveStage = useDesignStore((s) => s.moveStage);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const data = e.active.data.current;
    if (!data) return;
    const overData = e.over.data.current;
    if (!overData) return;
    const targetIndex = overData.index as number;

    if (data.source === 'pantry') {
      insertStage(data.module_id as ModuleId, targetIndex);
    } else if (data.source === 'canvas') {
      const fromIndex = data.index as number;
      const clampedTo = Math.min(targetIndex, design.stack.length - 1);
      moveStage(fromIndex, clampedTo);
    }
  };

  // stack is bottom→top in the data model; render top→bottom for visual clarity
  // (fairing on top).
  const stagesRendered = [...design.stack].reverse();

  return (
    <section className="assembly-canvas" aria-label="Vehicle assembly" tabIndex={0}>
      <div className="canvas-header">
        <h2>
          Vehicle stack <HelpTip {...HELP.canvas} />
        </h2>
        <ResetButton />
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="stack-column">
          <CanvasBackdrop />
          <PayloadFairing payloadKg={design.mission.payload_kg} />
          {/* Insert-at-top drop zone */}
          <DropZone index={design.stack.length} label="Insert at top" />
          {stagesRendered.map((entry, visualIndex) => {
            // Convert visual index (0 = topmost) back to data-model index (bottom-up).
            const dataIndex = design.stack.length - 1 - visualIndex;
            const stageResult = solveResult.stages[dataIndex];
            const isStage1 = dataIndex === 0;
            return (
              <div key={`stage-${dataIndex}`} className="stage-row">
                <div className="stage-row-inner">
                  {isStage1 && solveResult.booster ? (
                    <BoosterBadge booster={solveResult.booster} side="left" />
                  ) : null}
                  <StageSprite entry={entry} stageResult={stageResult} index={dataIndex} />
                  {isStage1 && solveResult.booster ? (
                    <BoosterBadge booster={solveResult.booster} side="right" />
                  ) : null}
                </div>
                {isStage1 ? <BoosterControl /> : null}
                <DropZone index={dataIndex} label={`Insert below stage ${entry.position}`} />
              </div>
            );
          })}
          {design.stack.length === 0 ? (
            <p className="empty-hint">
              Drag a module from the pantry, or click <em>Insert</em>. Bottom = Stage 1.
            </p>
          ) : (
            <NozzleCluster />
          )}
          {design.mission.type === 'in-space' ? null : (
            <div className="launch-pad" aria-hidden="true" />
          )}
        </div>
      </DndContext>
      <StageDrawer />
    </section>
  );
}
