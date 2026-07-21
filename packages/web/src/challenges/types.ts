// Gamification challenges (PLAN §6 Q4). Each challenge locks a mission
// (destination + payload + crewed) and defines pass/fail criteria evaluated
// live against the current solve + cost.

import type { DestinationId, ModuleId, MissionType } from '@propelx/engine';

export interface ChallengeMission {
  type: MissionType;
  destination: DestinationId;
  payload_kg: number;
  crewed: boolean;
}

export type SuccessCriterion =
  | { kind: 'valid'; label?: string }
  | { kind: 'glowLtKg'; value: number; label?: string }
  | { kind: 'payloadFractionGt'; value: number; label?: string }
  | { kind: 'costPerFlightLtUsd'; value: number; label?: string }
  | { kind: 'costPerKgOrbitLtUsd'; value: number; label?: string }
  | { kind: 'stageCountLte'; value: number; label?: string }
  | { kind: 'noBoosters'; label?: string }
  | { kind: 'requireSuggestionCleared'; label?: string };

export interface Challenge {
  id: string;
  name: string;
  description: string;
  mission: ChallengeMission;
  bannedModules?: ModuleId[];
  requiredFirstStage?: ModuleId[];
  successCriteria: SuccessCriterion[];
}

export interface CriterionResult {
  criterion: SuccessCriterion;
  met: boolean;
  actual: string;
  target: string;
}

export interface ChallengeStatus {
  challenge: Challenge;
  results: CriterionResult[];
  allMet: boolean;
  bannedModuleUsed: string | null;
  firstStageOk: boolean;
}
