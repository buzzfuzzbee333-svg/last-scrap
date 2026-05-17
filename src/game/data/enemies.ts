export type EnemyKind = "shambler" | "brute" | "runner";

export interface EnemyDef {
  kind: EnemyKind;
  enabled: boolean;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  contactDamageInterval: number; // sec
  aggroRadius: number;
  radius: number;
  scrapReward: number;
  color: string;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  shambler: {
    kind: "shambler",
    enabled: true,
    maxHp: 30,
    attack: 8,
    defense: 0,
    speed: 70,
    contactDamageInterval: 0.7,
    aggroRadius: 220,
    radius: 14,
    scrapReward: 5,
    color: "#7a8b6f",
  },
  brute: {
    kind: "brute",
    enabled: true,
    maxHp: 90,
    attack: 18,
    defense: 4,
    speed: 55,
    contactDamageInterval: 0.9,
    aggroRadius: 260,
    radius: 22,
    scrapReward: 14,
    color: "#a04848",
  },
  // Defined but intentionally disabled in v1.
  runner: {
    kind: "runner",
    enabled: false,
    maxHp: 18,
    attack: 6,
    defense: 0,
    speed: 160,
    contactDamageInterval: 0.5,
    aggroRadius: 320,
    radius: 12,
    scrapReward: 8,
    color: "#d2b04c",
  },
};
