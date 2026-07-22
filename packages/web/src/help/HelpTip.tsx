// Reusable "?" help affordance. Follows the WAI-ARIA disclosure pattern:
//   - The trigger is a real <button> with aria-expanded / aria-controls.
//   - The popover is a labelled region with Escape-to-close.
//   - Focus returns to the trigger when the popover closes.
//
// The popover renders through a React portal into document.body so it
// escapes any ancestor with `overflow: auto` / `overflow: hidden` (the
// scrollable mission/results panels would otherwise clip it). Position is
// computed from the trigger's bounding rect on open, resize, and any
// ancestor scroll.

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export interface HelpTipProps {
  title: string;
  body: ReactNode;
  size?: 'sm' | 'md';
}

const POPOVER_MAX_WIDTH = 320;
const VIEWPORT_MARGIN = 8;

export function HelpTip({ title, body, size = 'sm' }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Prefer right-aligning with the trigger so the popover grows leftward
    // (natural on the right-column panels). Flip left-aligned if that would
    // push past the left edge of the viewport.
    let left = rect.right - POPOVER_MAX_WIDTH;
    if (left < VIEWPORT_MARGIN) left = rect.left;
    if (left + POPOVER_MAX_WIDTH > window.innerWidth - VIEWPORT_MARGIN) {
      left = window.innerWidth - POPOVER_MAX_WIDTH - VIEWPORT_MARGIN;
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
    setPos({ top: rect.bottom + 6, left });
  }, []);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        popoverRef.current &&
        target &&
        !popoverRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onReflow = () => updatePosition();
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('resize', onReflow);
    // Capture-phase scroll so a scrollable ancestor moving repositions us.
    window.addEventListener('scroll', onReflow, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open, updatePosition]);

  return (
    <span className="help-tip">
      <button
        ref={triggerRef}
        type="button"
        className={`help-btn help-btn-${size}`}
        aria-label={`Help: ${title}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ?
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={id}
              ref={popoverRef}
              role="region"
              aria-label={`Help: ${title}`}
              className="help-popover"
              style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
            >
              <header>
                <strong>{title}</strong>
                <button
                  type="button"
                  className="help-close"
                  aria-label="Close help"
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                >
                  ✕
                </button>
              </header>
              <div className="help-body">{body}</div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
