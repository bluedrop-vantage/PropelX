import { branding } from './Wordmark.js';

// Model-simplifications callout required by the spec's closing paragraph.
export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close about dialog"
        >
          ✕
        </button>
        <h2 id="about-title">About {branding.productName}</h2>
        <p>
          <strong>{branding.productName}</strong> — a browser-based interactive rocket stage builder.
          Drag propulsion modules onto the stack, pick a payload and destination, and see the
          Tsiolkovsky equation applied stage-by-stage in real time.
        </p>
        <h3>Model simplifications</h3>
        <ul>
          <li>Delta-v losses are captured as fixed budgets per destination — no trajectory integration.</li>
          <li>Single-number structural fractions per propellant archetype (engine mass folded in).</li>
          <li>No fairing or interstage line items.</li>
          <li>
            The tool aims to teach staging physics honestly at ~±10–15% fidelity vs. real vehicles —
            the right trade for its purpose.
          </li>
        </ul>
        <footer className="modal-footer">{branding.copyrightLine}</footer>
      </div>
    </div>
  );
}
