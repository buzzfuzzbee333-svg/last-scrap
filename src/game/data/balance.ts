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
    maxAmmo: 60,
    ammoRefillOnWave: 30,
  },
  gun: {
    // Semi-auto: triggered by a tap (key/button press edge). Stronger, slower.
    semi: {
      damage: 28,
      cooldown: 0.32,
      ammoCost: 1,
      bulletSpeed: 900,
      bulletRadius: 4,
      color: "#ffd84a",
    },
    // Full-auto: triggered by holding the fire button beyond a short delay. Weaker, faster.
    auto: {
      damage: 12,
      cooldown: 0.09,
      ammoCost: 1,
      bulletSpeed: 780,
      bulletRadius: 3,
      color: "#ff8a3a",
    },
    holdToAutoSec: 0.18, // hold duration before full-auto kicks in
    bulletLifeSec: 0.9,
  },
  round: {
    durationSec: 60, // time limit per wave; on timeout, wave ends and cashout opens
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
