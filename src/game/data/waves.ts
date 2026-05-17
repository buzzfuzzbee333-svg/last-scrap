import type { EnemyKind } from "./enemies";

export interface WaveRule {
  spawns: Partial<Record<EnemyKind, number>>;
  spawnIntervalSec: number;
}

// Procedural after the listed waves.
const SCRIPTED: WaveRule[] = [
  { spawns: { shambler: 5 }, spawnIntervalSec: 1.3 },
  { spawns: { shambler: 9 }, spawnIntervalSec: 1.1 },
  { spawns: { shambler: 10, brute: 1 }, spawnIntervalSec: 1.0 },
  { spawns: { shambler: 12, brute: 2 }, spawnIntervalSec: 0.9 },
  { spawns: { shambler: 14, brute: 3 }, spawnIntervalSec: 0.8 },
];

export function getWaveRule(wave: number): WaveRule {
  if (wave <= SCRIPTED.length) return SCRIPTED[wave - 1];
  const over = wave - SCRIPTED.length;
  return {
    spawns: {
      shambler: 14 + over * 3,
      brute: 3 + Math.floor(over * 1.2),
    },
    spawnIntervalSec: Math.max(0.45, 0.8 - over * 0.05),
  };
}
