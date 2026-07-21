import { create } from 'zustand';
import type { Challenge } from '../challenges/types.js';

const STORAGE_KEY = 'propelx.activeChallenge.v1';

function loadFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface ChallengesState {
  activeChallengeId: string | null;
  setActiveChallenge(challenge: Challenge | null): void;
}

export const useChallengesStore = create<ChallengesState>()((set) => ({
  activeChallengeId: loadFromStorage(),
  setActiveChallenge(challenge) {
    const id = challenge?.id ?? null;
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // session-only fallback
    }
    set({ activeChallengeId: id });
  },
}));
