// Curated challenge catalog. Values are illustrative but grounded — a
// well-designed 2-stage kerolox/hydrolox with modest tech-level tuning
// should be able to clear the "Human-rated to LEO" and "Cargo capsule
// under $50M/kg" challenges.

import type { Challenge } from './types.js';

export const CHALLENGES: Challenge[] = [
  {
    id: 'cubesat-cheap',
    name: 'Rideshare CubeSat',
    description:
      'Lift a 25 kg CubeSat to LEO for under $10k/kg to orbit. Small launcher class — no strap-on boosters allowed.',
    mission: { type: 'launch', destination: 'LEO', payload_kg: 25, crewed: false },
    successCriteria: [
      { kind: 'valid' },
      { kind: 'costPerKgOrbitLtUsd', value: 10_000 },
      { kind: 'noBoosters' },
      { kind: 'stageCountLte', value: 3 },
    ],
  },
  {
    id: 'comsat-workhorse',
    name: 'Comsat to GTO',
    description:
      '3,500 kg communications satellite to GTO for under $15M per flight. Modern propellants only (no hypergolics).',
    mission: { type: 'launch', destination: 'GTO', payload_kg: 3_500, crewed: false },
    bannedModules: ['hypergolic'],
    successCriteria: [
      { kind: 'valid' },
      { kind: 'costPerFlightLtUsd', value: 15_000_000 },
      { kind: 'stageCountLte', value: 3 },
    ],
  },
  {
    id: 'crew-to-leo',
    name: 'Human-rated to LEO',
    description:
      '2 astronauts (9,500 kg) to LEO for under $100M per flight, no hypergolics near the crew, and no all-solid stack.',
    mission: { type: 'launch', destination: 'LEO', payload_kg: 9_500, crewed: true },
    bannedModules: ['hypergolic'],
    successCriteria: [
      { kind: 'valid' },
      { kind: 'costPerFlightLtUsd', value: 100_000_000 },
      { kind: 'payloadFractionGt', value: 0.02 },
    ],
  },
  {
    id: 'moonshot',
    name: 'Trans-lunar cargo',
    description:
      '6,500 kg cargo capsule to TLI. Use whatever propellants you like — but keep the vehicle under 800 t GLOW.',
    mission: { type: 'launch', destination: 'TLI', payload_kg: 6_500, crewed: false },
    successCriteria: [
      { kind: 'valid' },
      { kind: 'glowLtKg', value: 800_000 },
    ],
  },
  {
    id: 'in-space-ion',
    name: 'Ion tug to GEO',
    description:
      '1,000 kg payload from GTO to GEO using ion propulsion (or another in-space stage of your choice). In-space mode is required.',
    mission: { type: 'in-space', destination: 'GTO_TO_GEO', payload_kg: 1_000, crewed: false },
    successCriteria: [
      { kind: 'valid' },
      { kind: 'payloadFractionGt', value: 0.5 },
    ],
  },
  {
    id: 'commonality-award',
    name: 'Commonality award',
    description:
      'Reach LEO with a 3,500 kg comsat using a single propellant family across every stage. Cost must be under $30M per flight.',
    mission: { type: 'launch', destination: 'LEO', payload_kg: 3_500, crewed: false },
    successCriteria: [
      { kind: 'valid' },
      { kind: 'costPerFlightLtUsd', value: 30_000_000 },
      { kind: 'requireSuggestionCleared' }, // fires if S-1 no longer applies
    ],
  },
];
