// Central tuning. Edit numbers here.
export const BALANCE = {
  arena: { width: 1280, height: 720, rigRadius: 48, rigX: 640, rigY: 360 },
  player: {
    baseMaxHp: 100,
    baseAttack: 20,
    baseDefense: 2,
    baseSpeed: 240, // px/sec
    attackRange: 70,
    attackArcDeg: 110,
    attackCooldown: 0.35, // sec
    radius: 16,
    invulnAfterHit: 0.25,
  },
  rig: {
    baseMaxIntegrity: 300,
    passiveScrapPerSec: 2,
    contactTickInterval: 0.6,
  },
  cashoutSplits: {
    cashout: { bank: 1.0, lose: 0.0 },
    overrun: { bank: 0.5, lose: 0.5 },
    death: { bank: 0.0, lose: 1.0 },
    surrender: { bank: 0.4, lose: 0.6 },
  },
  waveClearBonus: (wave: number) => 15 + wave * 5,
};
