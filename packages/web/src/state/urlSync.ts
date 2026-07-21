// URL-fragment persistence: base64URL(gzip(JSON(design))) in window.location.hash.
// Kept out of the query string so it never hits a server. Enables share-by-link
// without accounts (spec §8.2 + §11).

import { deflate, inflate } from 'pako';
import type { DesignDoc } from '@propelx/engine';
import { useDesignStore } from './designStore.js';

const HASH_PREFIX = '#d=';

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replaceAll('-', '+').replaceAll('_', '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeDesign(design: DesignDoc): string {
  const json = JSON.stringify(design);
  const compressed = deflate(json);
  return HASH_PREFIX + bytesToBase64Url(compressed);
}

export function decodeDesign(hash: string): DesignDoc | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const bytes = base64UrlToBytes(hash.slice(HASH_PREFIX.length));
    const json = inflate(bytes, { to: 'string' });
    return JSON.parse(json) as DesignDoc;
  } catch {
    return null;
  }
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Wire the store to window.location.hash. On mount:
 *   1. Try to hydrate from the current hash.
 *   2. Subscribe to store changes and debounce-write the new hash.
 * Returns an unsubscribe function.
 */
export function attachUrlSync(): () => void {
  // 1. Hydrate.
  if (typeof window !== 'undefined' && window.location.hash) {
    const incoming = decodeDesign(window.location.hash);
    if (incoming) {
      useDesignStore.getState().hydrateDesign(incoming);
    }
  }

  // 2. Subscribe.
  const unsub = useDesignStore.subscribe(
    (s) => s.design,
    (design) => {
      if (writeTimer) clearTimeout(writeTimer);
      writeTimer = setTimeout(() => {
        if (typeof window === 'undefined') return;
        const next = encodeDesign(design);
        if (window.location.hash !== next) {
          history.replaceState(null, '', window.location.pathname + window.location.search + next);
        }
      }, 500);
    },
  );

  return () => {
    unsub();
    if (writeTimer) clearTimeout(writeTimer);
  };
}
