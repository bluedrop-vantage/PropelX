// Comparison-tray persistence (§7.3). Up to 3 pinned designs, kept in
// localStorage as compressed JSON so a page reload restores the tray.
// Cost is re-computed on demand when the tray is rendered so it always
// reflects the current assumptions (and picks up code-model updates).

import { create } from 'zustand';
import type { DesignDoc } from '@propelx/engine';

const STORAGE_KEY = 'propelx.pinned.v1';
export const MAX_PINNED = 3;

export interface PinnedDesign {
  id: string; // unique per pin (timestamp-based)
  label: string;
  design: DesignDoc;
  pinnedAt: number;
}

interface PinnedState {
  items: PinnedDesign[];
  pin(label: string, design: DesignDoc): void;
  unpin(id: string): void;
  clear(): void;
}

function loadFromStorage(): PinnedDesign[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PinnedDesign[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_PINNED);
  } catch {
    return [];
  }
}

function saveToStorage(items: PinnedDesign[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable — silently ignore. The tray still
    // works in-memory for the session.
  }
}

export const usePinnedStore = create<PinnedState>()((set, get) => ({
  items: loadFromStorage(),

  pin(label, design) {
    const current = get().items;
    const id = `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next: PinnedDesign[] = [
      { id, label, design: JSON.parse(JSON.stringify(design)) as DesignDoc, pinnedAt: Date.now() },
      ...current,
    ].slice(0, MAX_PINNED);
    saveToStorage(next);
    set({ items: next });
  },

  unpin(id) {
    const next = get().items.filter((p) => p.id !== id);
    saveToStorage(next);
    set({ items: next });
  },

  clear() {
    saveToStorage([]);
    set({ items: [] });
  },
}));
