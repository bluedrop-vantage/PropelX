// Units toggle (spec §12 Q5). Metric is the source of truth for the engine;
// this store only changes how numbers are DISPLAYED. Persisted to localStorage
// so the user's preference survives page reloads.

import { create } from 'zustand';

const STORAGE_KEY = 'propelx.units.v1';
export type UnitSystem = 'metric' | 'imperial';

function loadFromStorage(): UnitSystem {
  if (typeof window === 'undefined') return 'metric';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'imperial' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

interface UnitsState {
  system: UnitSystem;
  setSystem(next: UnitSystem): void;
  toggle(): void;
}

export const useUnitsStore = create<UnitsState>()((set, get) => ({
  system: loadFromStorage(),
  setSystem(next) {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage full — session-only.
    }
    set({ system: next });
  },
  toggle() {
    get().setSystem(get().system === 'metric' ? 'imperial' : 'metric');
  },
}));
