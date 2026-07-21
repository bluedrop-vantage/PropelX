import { loadBranding } from './theme.js';

const branding = loadBranding();

export function Wordmark() {
  return (
    <span className="wordmark" aria-label={branding.productName}>
      {branding.wordmark.map((p, i) => (
        <span key={i} style={{ color: p.color }}>
          {p.text}
        </span>
      ))}
    </span>
  );
}

export function Footer() {
  return (
    <footer className="app-footer">
      <span>{branding.copyrightLine}</span>
      {branding.productVersion ? <span className="version">{branding.productVersion}</span> : null}
    </footer>
  );
}

export { branding };
