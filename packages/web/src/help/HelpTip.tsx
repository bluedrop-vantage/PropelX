// Reusable "?" help affordance. Follows the WAI-ARIA disclosure pattern:
//   - The trigger is a real <button> with aria-expanded / aria-controls.
//   - The popover is a labelled region with Escape-to-close.
//   - Focus returns to the trigger when the popover closes.
//
// Passes axe's WCAG 2.1 AA sweep with the same rules as the rest of the app
// (no nested-interactive, sufficient contrast, keyboard-only usable).

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface HelpTipProps {
  title: string;
  body: ReactNode;
  size?: 'sm' | 'md';
}

export function HelpTip({ title, body, size = 'sm' }: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

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
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDocClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open]);

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
      {open ? (
        <div
          id={id}
          ref={popoverRef}
          role="region"
          aria-label={`Help: ${title}`}
          className="help-popover"
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
        </div>
      ) : null}
    </span>
  );
}
