import { useDraggable } from '@dnd-kit/core';
import type { StackEntry, StageResult } from '@propelx/engine';
import { useDesignStore } from '../state/designStore.js';
import { formatMass } from '../lib/format.js';

const MIN_H = 44;
const MAX_H = 220;

function stageHeightPx(mp_kg: number | undefined): number {
  // Log scale on propellant mass, clamped (spec §5.1).
  if (!mp_kg || mp_kg <= 0) return MIN_H;
  const l = Math.log10(mp_kg + 1);
  const scaled = MIN_H + (MAX_H - MIN_H) * ((l - 1) / 5); // ~1..6 log range
  return Math.max(MIN_H, Math.min(MAX_H, scaled));
}

interface Props {
  entry: StackEntry;
  stageResult: StageResult | undefined;
  index: number;
}

export function StageSprite({ entry, stageResult, index }: Props) {
  const catalog = useDesignStore((s) => s.catalog);
  const removeStage = useDesignStore((s) => s.removeStage);
  const moveStage = useDesignStore((s) => s.moveStage);
  const openDrawer = useDesignStore((s) => s.openStageDrawer);
  const stackLen = useDesignStore((s) => s.design.stack.length);
  const mod = catalog.byId(entry.module_id);

  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: `canvas:${index}`,
    data: { source: 'canvas', index },
  });

  const h = stageHeightPx(stageResult?.propellant_kg);
  const label = `Stage ${entry.position} · ${mod.name}`;

  // dnd-kit's `attributes` includes role="button" + tabIndex=0. That would
  // wrap the Details/Remove buttons in another interactive element (axe:
  // `nested-interactive`). We keep pointer-drag via `listeners` but drop
  // the interactive role — keyboard users route through the Details button,
  // which also handles arrow-key reorder and Delete.
  const { role: _dndRole, tabIndex: _dndTabIndex, ...restAttrs } = attributes;

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowUp' && index < stackLen - 1) {
      e.preventDefault();
      moveStage(index, index + 1);
    } else if (e.key === 'ArrowDown' && index > 0) {
      e.preventDefault();
      moveStage(index, index - 1);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeStage(index);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`stage-sprite${isDragging ? ' dragging' : ''}`}
      style={{ height: `${h}px` }}
      aria-label={label}
      onDoubleClick={(e) => {
        e.stopPropagation();
        openDrawer(index);
      }}
      {...listeners}
      {...restAttrs}
    >
      <div className="stage-body">
        <span className="stage-num">S{entry.position}</span>
        <span className="stage-name">{mod.name}</span>
        {stageResult ? (
          <span className="stage-mp">{formatMass(stageResult.propellant_kg)} propellant</span>
        ) : null}
      </div>
      <div className="stage-actions">
        <button
          type="button"
          className="stage-details"
          aria-label={`Details for stage ${entry.position}. Arrow keys reorder, Delete removes.`}
          onClick={(e) => {
            e.stopPropagation();
            openDrawer(index);
          }}
          onKeyDown={(e) => {
            // Stop Enter/Space from bubbling into dnd-kit's KeyboardSensor
            // (which would preventDefault and swallow the native button click).
            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
            onKeyDown(e);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ⋯
        </button>
        <button
          type="button"
          className="stage-remove"
          aria-label={`Remove stage ${entry.position}`}
          onClick={(e) => {
            e.stopPropagation();
            removeStage(index);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
