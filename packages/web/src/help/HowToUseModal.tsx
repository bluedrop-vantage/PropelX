// Page-level "how to use" walkthrough. Opened from the header alongside About.
// Mirrors the AboutModal a11y (dialog role, backdrop dismiss, focus trap-ish).

import { useEffect } from 'react';
import { branding } from '../branding/Wordmark.js';

export function HowToUseModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal how-to-use"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-use-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close how-to-use dialog"
        >
          ✕
        </button>
        <h2 id="how-to-use-title">How to use {branding.productName}</h2>

        <section>
          <h3>1. Set the mission</h3>
          <p>
            In the <strong>Mission</strong> panel (top right), pick a destination and payload.
            <em>Launch</em> targets include gravity+drag losses; toggle <em>In-space</em> for
            missions that begin already in orbit. Crewed presets bundle capsule, life support,
            and abort system — that's why they start near 10 tonnes.
          </p>
        </section>

        <section>
          <h3>2. Build the stack</h3>
          <p>
            Drag propulsion modules from the <strong>Pantry</strong> onto the assembly canvas,
            or press each card's <strong>Insert</strong> button. Bottom = Stage 1. Reorder by
            dragging (or by focusing a stage's ⋯ button and pressing arrow keys). Sprite
            heights scale with propellant mass so a hydrogen upper stage looks visibly larger
            than a kerolox one.
          </p>
        </section>

        <section>
          <h3>3. Tune per-stage</h3>
          <p>
            Click a stage's <strong>⋯</strong> button (or press Enter on the sprite) to open
            the detail drawer. From there you can adjust the tech-level slider (structural
            fraction ε) or switch to manual Δv allocation and drag the sliders — the
            optimizer's Δv split is shown for comparison.
          </p>
        </section>

        <section>
          <h3>4. Read the verdict</h3>
          <p>
            The <strong>Results</strong> tab shows a green / amber / red banner. Green means
            the design closes for your payload; amber means it closes but only below your
            payload; red lists the failed validation rules (V-1&hellip;V-9). Below the banner
            you'll find the Δv waterfall and mass breakdown charts, plus a card per stage.
          </p>
        </section>

        <section>
          <h3>5. Economics (optional)</h3>
          <p>
            Switch to the <strong>Economics</strong> tab for illustrative cost estimates —
            propellant, hardware, cost per flight, cost per kg to orbit. The
            <strong> Assumptions Drawer</strong> at the bottom lets you edit any figure and
            watches everything re-rank live. The suggestions engine flags common improvements
            (S-1&hellip;S-7), each with an <strong>Apply</strong> button that mutates the
            design so you can see for yourself.
          </p>
        </section>

        <section>
          <h3>6. Try a challenge</h3>
          <p>
            The <strong>Challenges</strong> tab has pre-authored missions with concrete
            objectives — cost caps, payload thresholds, banned modules. Start one and the
            mission is locked; iterate until every criterion turns green.
          </p>
        </section>

        <section>
          <h3>7. Launch assist add-on</h3>
          <p>
            In the Mission panel, toggle <strong>Launch assist</strong> to add an
            electromagnetic launcher. Set exit velocity, track angle, base elevation, and
            peak acceleration; the engine subtracts the assist's Δv contribution from what
            the rocket has to cover, then reports peak thrust, peak power, and track length.
          </p>
        </section>

        <section>
          <h3>Keyboard shortcuts</h3>
          <ul>
            <li>
              <kbd>Tab</kbd> — cycle focus through interactive elements (skip link first).
            </li>
            <li>
              <kbd>Enter</kbd> / <kbd>Space</kbd> — activate a focused button.
            </li>
            <li>
              <kbd>↑</kbd> / <kbd>↓</kbd> on a stage's ⋯ button — reorder that stage up or down.
            </li>
            <li>
              <kbd>Del</kbd> / <kbd>Backspace</kbd> on a stage's ⋯ button — remove the stage.
            </li>
            <li>
              <kbd>Esc</kbd> — close any open modal, drawer, or help popover.
            </li>
          </ul>
        </section>

        <section>
          <h3>Every section has a &ldquo;?&rdquo; help icon</h3>
          <p>
            Look for the small circular <strong>?</strong> next to section titles. Click it for
            a one-paragraph guide to that specific panel.
          </p>
        </section>

        <footer className="modal-footer">{branding.copyrightLine}</footer>
      </div>
    </div>
  );
}
