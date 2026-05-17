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
  ammo: number;
  maxAmmo: number;
  fireCooldown: number; // shared gun cooldown
  holdTime: number;     // how long fire has been held this press
  weaponBonus: number;  // +damage added to bullets (from upgrades)
  meleeBonus: number;   // +damage added to melee fallback (from upgrades)
  meleeCooldown: number;
  regenMult: number;    // upgrade multiplier on regen rate (1 = base)
  hpRegenAcc: number;   // fractional HP carry
  ammoRegenAcc: number; // fractional ammo carry
  hitRecentTimer: number; // pauses HP regen briefly after damage
}

export interface Bullet {
  id: number;
  pos: Vec2;
  vel: Vec2;
  damage: number;
  radius: number;
  life: number;
  color: string;
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
  gambleBusted?: boolean;
  gambleMult?: number;
  persisted?: boolean; // set true after meta store has banked it
}
