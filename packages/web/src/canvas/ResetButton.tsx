// Reset-to-initial-state button. Two-click "armed" pattern avoids
// accidentally nuking a design: first click arms it (button turns red and
// changes label), a second click within 3 s actually resets. Auto-cancels
// after 3 s if no confirmation.

import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../state/designStore.js';

export function ResetButton() {
  const reset = useDesignStore((s) => s.resetDesign);
  const stackLen = useDesignStore((s) => s.design.stack.length);
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!armed) return;
    timerRef.current = setTimeout(() => setArmed(false), 3_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [armed]);

  const onClick = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    reset();
    setArmed(false);
  };

  // Nothing to reset when the design is already empty.
  const emptyAlready = stackLen === 0;

  return (
    <button
      type="button"
      className={`reset-btn${armed ? ' armed' : ''}`}
      onClick={onClick}
      disabled={emptyAlready && !armed}
      aria-label={armed ? 'Confirm reset — click again to clear the design' : 'Reset design to initial state'}
      title={armed ? 'Click again to confirm' : 'Reset design'}
    >
      {armed ? 'Confirm reset?' : (
        <>
          <span className="reset-icon" aria-hidden="true">↻</span>
          <span className="reset-label">Reset</span>
        </>
      )}
    </button>
  );
}
