import type { EnemyKind } from "./data/enemies";

export interface Vec2 { x: number; y: number; }

export interface Player {
  pos: Vec2;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  attackCooldown: number;
  invulnTimer: number;
  facing: number; // radians
  alive: boolean;
}

export interface Rig {
  pos: Vec2;
  hp: number;
  maxHp: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  pos: Vec2;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  radius: number;
  aggroRadius: number;
  contactInterval: number;
  contactTimer: number;
  scrapReward: number;
  color: string;
}

export type RunEndCause = "cashout" | "overrun" | "death" | "surrender";

export interface RunEndSummary {
  cause: RunEndCause;
  unsecuredBefore: number;
  banked: number;
  lost: number;
  securedAfter: number;
  waveReached: number;
}
