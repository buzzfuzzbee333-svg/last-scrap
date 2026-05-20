import { create } from "zustand";
import { BALANCE } from "@/game/data/balance";
import { ENEMIES, type EnemyKind } from "@/game/data/enemies";
import { getWaveRule } from "@/game/data/waves";
import { computeDamage } from "@/game/combat";
import { resolveRunEnd } from "@/game/resolver";
import type { Bullet, Enemy, Player, Rig, RunEndCause, RunEndSummary, Vec2 } from "@/game/types";
import type { UpgradeId } from "@/game/data/upgrades";

export type RunPhase = "idle" | "spawning" | "fighting" | "cashout" | "ended";

interface InputState {
  moveX: number;
  moveY: number;
  firePressed: boolean; // one-shot edge (set on key/button down)
  fireHeld: boolean;    // continuous while held
  attack: boolean;      // legacy melee/attack signal (kept for compatibility)
}

interface RunState {
  phase: RunPhase;
  wave: number;
  unsecured: number;
  scrapMultiplier: number;
  kills: number;
  roundTimer: number;
  gambleMult: number;     // active multiplier for current wave (1 = no gamble)
  gamblePenalty: number;  // % of unsecured lost if this wave fails (0 if no gamble)
  player: Player;
  rig: Rig;
  enemies: Enemy[];
  bullets: Bullet[];
  spawnQueue: EnemyKind[];
  spawnTimer: number;
  spawnInterval: number;
  passiveTimer: number;
  input: InputState;
  endSummary: RunEndSummary | null;
  startRun: (upgrades: Partial<Record<UpgradeId, number>>) => void;
  setInput: (i: Partial<InputState>) => void;
  tick: (dt: number) => void;
  beginNextWave: (gambleMult?: number, gamblePenalty?: number) => void;
  cashOut: (currentSecured: number) => RunEndSummary;
  surrender: (currentSecured: number) => RunEndSummary;
  forceEnd: (cause: RunEndCause, currentSecured: number) => RunEndSummary;
  markSummaryPersisted: (securedAfter: number) => void;
  debugAddUnsecured: (n: number) => void;
  debugDamagePlayer: (n: number) => void;
  debugDamageRig: (n: number) => void;
  debugKillEnemies: () => void;
  debugForceWaveClear: () => void;
  debugSetWave: (w: number) => void;
}

let enemyIdCounter = 1;
let bulletIdCounter = 1;

function makePlayer(upgrades: Partial<Record<UpgradeId, number>>): Player {
  const hpLvl = upgrades.maxHp ?? 0;
  const atkLvl = upgrades.attack ?? 0;
  const defLvl = upgrades.defense ?? 0;
  const spdLvl = upgrades.speed ?? 0;
  const ammoLvl = upgrades.startAmmo ?? 0;
  const wpnLvl = upgrades.weaponDamage ?? 0;
  const meleeLvl = upgrades.melee ?? 0;
  const regenLvl = upgrades.regenRate ?? 0;
  const maxHp = BALANCE.player.baseMaxHp + 15 * hpLvl;
  const maxAmmo = BALANCE.player.maxAmmo + 10 * ammoLvl;
  return {
    pos: { x: BALANCE.arena.width / 2, y: BALANCE.arena.height / 2 + 90 },
    hp: maxHp,
    maxHp,
    attack: BALANCE.player.baseAttack + 4 * atkLvl,
    defense: BALANCE.player.baseDefense + 2 * defLvl,
    speed: BALANCE.player.baseSpeed + 20 * spdLvl,
    attackCooldown: 0,
    invulnTimer: 0,
    facing: 0,
    alive: true,
    ammo: maxAmmo,
    maxAmmo,
    fireCooldown: 0,
    holdTime: 0,
    weaponBonus: 3 * wpnLvl,
    meleeBonus: 5 * meleeLvl,
    meleeCooldown: 0,
    regenMult: 1 + 0.25 * regenLvl,
    hpRegenAcc: 0,
    ammoRegenAcc: 0,
    hitRecentTimer: 0,
    vel: { x: 0, y: 0 },
  };
}

function makeRig(upgrades: Partial<Record<UpgradeId, number>>): Rig {
  const lvl = upgrades.rigIntegrity ?? 0;
  const maxHp = BALANCE.rig.baseMaxIntegrity + 60 * lvl;
  return { pos: { x: BALANCE.arena.rigX, y: BALANCE.arena.rigY }, hp: maxHp, maxHp };
}

function buildSpawnQueue(wave: number): { queue: EnemyKind[]; interval: number } {
  const rule = getWaveRule(wave);
  const queue: EnemyKind[] = [];
  (Object.keys(rule.spawns) as EnemyKind[]).forEach((k) => {
    if (!ENEMIES[k].enabled) return;
    const n = rule.spawns[k] ?? 0;
    for (let i = 0; i < n; i++) queue.push(k);
  });
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return { queue, interval: rule.spawnIntervalSec };
}

function spawnEnemy(kind: EnemyKind): Enemy {
  const def = ENEMIES[kind];
  const side = Math.floor(Math.random() * 4);
  const W = BALANCE.arena.width;
  const H = BALANCE.arena.height;
  let pos: Vec2;
  if (side === 0) pos = { x: Math.random() * W, y: -20 };
  else if (side === 1) pos = { x: W + 20, y: Math.random() * H };
  else if (side === 2) pos = { x: Math.random() * W, y: H + 20 };
  else pos = { x: -20, y: Math.random() * H };
  return {
    id: enemyIdCounter++, kind, pos,
    hp: def.maxHp, maxHp: def.maxHp,
    attack: def.attack, defense: def.defense, speed: def.speed,
    radius: def.radius, aggroRadius: def.aggroRadius,
    contactInterval: def.contactDamageInterval, contactTimer: 0,
    scrapReward: def.scrapReward, color: def.color,
    vel: { x: 0, y: 0 },
  };
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestEnemy(enemies: Enemy[], p: Vec2): Enemy | null {
  let best: Enemy | null = null;
  let bd = Infinity;
  for (const e of enemies) {
    const d = dist(e.pos, p);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function fireBullet(p: Player, mode: "semi" | "auto", facing: number): Bullet {
  const cfg = BALANCE.gun[mode];
  return {
    id: bulletIdCounter++,
    pos: { x: p.pos.x + Math.cos(facing) * 18, y: p.pos.y + Math.sin(facing) * 18 },
    vel: { x: Math.cos(facing) * cfg.bulletSpeed, y: Math.sin(facing) * cfg.bulletSpeed },
    damage: cfg.damage,
    radius: cfg.bulletRadius,
    life: BALANCE.gun.bulletLifeSec,
    color: cfg.color,
  };
}

export const useRunStore = create<RunState>((set, get) => ({
  phase: "idle",
  wave: 0,
  unsecured: 0,
  scrapMultiplier: 1,
  kills: 0,
  roundTimer: BALANCE.round.durationSec,
  gambleMult: 1,
  gamblePenalty: 0,
  player: makePlayer({}),
  rig: makeRig({}),
  enemies: [],
  bullets: [],
  spawnQueue: [],
  spawnTimer: 0,
  spawnInterval: 1,
  passiveTimer: 0,
  input: { moveX: 0, moveY: 0, firePressed: false, fireHeld: false, attack: false },
  endSummary: null,

  startRun: (upgrades) => {
    const scrapLvl = upgrades.scrapGain ?? 0;
    const { queue, interval } = buildSpawnQueue(1);
    set({
      phase: "spawning",
      wave: 1,
      unsecured: 0,
      scrapMultiplier: 1 + 0.15 * scrapLvl,
      kills: 0,
      roundTimer: BALANCE.round.durationSec,
      gambleMult: 1,
      gamblePenalty: 0,
      player: makePlayer(upgrades),
      rig: makeRig(upgrades),
      enemies: [],
      bullets: [],
      spawnQueue: queue,
      spawnTimer: 0,
      spawnInterval: interval,
      passiveTimer: 0,
      input: { moveX: 0, moveY: 0, firePressed: false, fireHeld: false, attack: false },
      endSummary: null,
    });
  },

  setInput: (i) => set({ input: { ...get().input, ...i } }),

  beginNextWave: (gambleMult = 1, gamblePenalty = 0) => {
    const nextWave = get().wave + 1;
    const { queue: baseQueue, interval } = buildSpawnQueue(nextWave);
    const queue: EnemyKind[] = [];
    const repeats = Math.max(1, Math.round(gambleMult));
    for (let r = 0; r < repeats; r++) queue.push(...baseQueue);
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    const scaledInterval = Math.max(0.25, interval / Math.max(1, gambleMult * 0.85));
    const P = { ...get().player };
    P.ammo = Math.min(P.maxAmmo, P.ammo + BALANCE.player.ammoRefillOnWave);
    set({
      phase: "spawning",
      wave: nextWave,
      spawnQueue: queue,
      spawnTimer: 0,
      spawnInterval: scaledInterval,
      roundTimer: BALANCE.round.durationSec,
      player: P,
      bullets: [],
      gambleMult,
      gamblePenalty,
    });
  },

  cashOut: (currentSecured) => {
    const s = get();
    const summary = resolveRunEnd("cashout", s.unsecured, currentSecured, s.wave);
    set({ phase: "ended", endSummary: summary });
    return summary;
  },
  surrender: (currentSecured) => {
    const s = get();
    const summary = resolveRunEnd("surrender", s.unsecured, currentSecured, s.wave);
    set({ phase: "ended", endSummary: summary });
    return summary;
  },
  forceEnd: (cause, currentSecured) => {
    const s = get();
    const summary = resolveRunEnd(cause, s.unsecured, currentSecured, s.wave);
    set({ phase: "ended", endSummary: summary });
    return summary;
  },

  markSummaryPersisted: (securedAfter) => {
    const sum = get().endSummary;
    if (!sum || sum.persisted) return;
    set({ endSummary: { ...sum, securedAfter, persisted: true } });
  },

  tick: (dt) => {
    const s = get();
    if (s.phase !== "spawning" && s.phase !== "fighting") return;

    const P = { ...s.player, pos: { ...s.player.pos } };
    const R = { ...s.rig };
    let enemies = s.enemies.map((e) => ({ ...e, pos: { ...e.pos } }));
    let bullets = s.bullets.map((b) => ({ ...b, pos: { ...b.pos }, vel: { ...b.vel } }));
    let unsecured = s.unsecured;
    let kills = s.kills;

    // ----- Player movement (smoothed via exponential lerp) -----
    const ix = s.input.moveX;
    const iy = s.input.moveY;
    const mag = Math.hypot(ix, iy);
    let targetVx = 0, targetVy = 0;
    if (mag > 0.001 && P.alive) {
      const nx = ix / mag;
      const ny = iy / mag;
      targetVx = nx * P.speed;
      targetVy = ny * P.speed;
    }
    const pLerp = 1 - Math.exp(-BALANCE.motion.playerInputLerp * dt);
    P.vel.x += (targetVx - P.vel.x) * pLerp;
    P.vel.y += (targetVy - P.vel.y) * pLerp;
    P.pos.x += P.vel.x * dt;
    P.pos.y += P.vel.y * dt;
    const vMag = Math.hypot(P.vel.x, P.vel.y);
    if (vMag > 1) P.facing = Math.atan2(P.vel.y, P.vel.x);
    P.pos.x = Math.max(16, Math.min(BALANCE.arena.width - 16, P.pos.x));
    P.pos.y = Math.max(16, Math.min(BALANCE.arena.height - 16, P.pos.y));
    P.attackCooldown = Math.max(0, P.attackCooldown - dt);
    P.invulnTimer = Math.max(0, P.invulnTimer - dt);
    P.fireCooldown = Math.max(0, P.fireCooldown - dt);
    P.meleeCooldown = Math.max(0, P.meleeCooldown - dt);
    P.hitRecentTimer = Math.max(0, P.hitRecentTimer - dt);

    // ----- Gun firing -----
    // Determine aim: movement direction, or nearest enemy if standing still.
    let aim = P.facing;
    if (mag <= 0.001) {
      const n = nearestEnemy(enemies, P.pos);
      if (n) aim = Math.atan2(n.pos.y - P.pos.y, n.pos.x - P.pos.x);
    }

    // Melee fallback (ammo depleted): swing on tap, hits enemies in arc in front.
    const doMelee = (): void => {
      if (!P.alive || P.meleeCooldown > 0) return;
      const dmg = BALANCE.melee.baseDamage + P.meleeBonus;
      const range = BALANCE.melee.range;
      const halfArc = (BALANCE.melee.arcDeg * Math.PI) / 360;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.pos.x - P.pos.x;
        const dy = e.pos.y - P.pos.y;
        const d = Math.hypot(dx, dy);
        if (d > range + e.radius) continue;
        const ang = Math.atan2(dy, dx);
        let diff = Math.abs(((ang - aim + Math.PI) % (Math.PI * 2)) - Math.PI);
        if (diff <= halfArc) e.hp -= computeDamage(dmg, e.defense);
      }
      P.meleeCooldown = BALANCE.melee.cooldown;
      P.facing = aim;
    };

    // Semi: instant shot on press edge. If no ammo, fall back to melee swing.
    if (P.alive && s.input.firePressed && P.fireCooldown <= 0) {
      if (P.ammo >= BALANCE.gun.semi.ammoCost) {
        const b = fireBullet(P, "semi", aim);
        b.damage += P.weaponBonus;
        bullets.push(b);
        P.ammo -= BALANCE.gun.semi.ammoCost;
        P.fireCooldown = BALANCE.gun.semi.cooldown;
        P.facing = aim;
      } else {
        doMelee();
      }
    }

    // Track hold time. If still held past threshold, auto-fire at auto cadence.
    if (s.input.fireHeld) {
      P.holdTime += dt;
      if (P.alive && P.holdTime >= BALANCE.gun.holdToAutoSec && P.fireCooldown <= 0) {
        if (P.ammo >= BALANCE.gun.auto.ammoCost) {
          const b = fireBullet(P, "auto", aim);
          b.damage += P.weaponBonus;
          bullets.push(b);
          P.ammo -= BALANCE.gun.auto.ammoCost;
          P.fireCooldown = BALANCE.gun.auto.cooldown;
          P.facing = aim;
        } else if (P.meleeCooldown <= 0) {
          doMelee();
        }
      }
    } else {
      P.holdTime = 0;
    }

    // ----- Bullet update + collisions -----
    const liveBullets: Bullet[] = [];
    for (const b of bullets) {
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      b.life -= dt;
      if (b.life <= 0 || b.pos.x < -20 || b.pos.x > BALANCE.arena.width + 20 || b.pos.y < -20 || b.pos.y > BALANCE.arena.height + 20) {
        continue;
      }
      let hit = false;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (dist(e.pos, b.pos) <= e.radius + b.radius) {
          e.hp -= computeDamage(b.damage, e.defense);
          hit = true;
          break;
        }
      }
      if (!hit) liveBullets.push(b);
    }
    bullets = liveBullets;

    // ----- Enemy AI + contact damage -----
    // Priority target is ALWAYS the rig. Enemies only "attack" the hero by
    // physical proximity (they walk past toward the rig and brush the player).
    for (const e of enemies) {
      const dx = R.pos.x - e.pos.x;
      const dy = R.pos.y - e.pos.y;
      const m = Math.hypot(dx, dy) || 1;
      e.pos.x += (dx / m) * e.speed * dt;
      e.pos.y += (dy / m) * e.speed * dt;
      e.contactTimer = Math.max(0, e.contactTimer - dt);

      const dRig = dist(e.pos, R.pos);
      if (dRig <= e.radius + BALANCE.arena.rigRadius && e.contactTimer <= 0) {
        R.hp -= computeDamage(e.attack, 0);
        e.contactTimer = e.contactInterval;
      }
      const dPl = dist(e.pos, P.pos);
      if (P.alive && dPl <= e.radius + 16 && e.contactTimer <= 0 && P.invulnTimer <= 0) {
        P.hp -= computeDamage(e.attack, P.defense);
        P.invulnTimer = BALANCE.player.invulnAfterHit;
        P.hitRecentTimer = BALANCE.regen.delayAfterHitSec;
        e.contactTimer = e.contactInterval;
      }
    }

    // Remove dead, award scrap + kills (scaled by gamble multiplier)
    const rewardMult = s.scrapMultiplier * s.gambleMult;
    const survivors: Enemy[] = [];
    for (const e of enemies) {
      if (e.hp <= 0) {
        unsecured += Math.round(e.scrapReward * rewardMult);
        kills += 1;
      } else {
        survivors.push(e);
      }
    }
    enemies = survivors;

    // ----- Spawning -----
    let spawnQueue = s.spawnQueue;
    let spawnTimer = s.spawnTimer - dt;
    if (s.phase === "spawning") {
      while (spawnTimer <= 0 && spawnQueue.length > 0) {
        enemies.push(spawnEnemy(spawnQueue[0]));
        spawnQueue = spawnQueue.slice(1);
        spawnTimer += s.spawnInterval;
      }
    }

    // ----- Passive rig scrap -----
    let passiveTimer = s.passiveTimer + dt;
    if (R.hp > 0) {
      while (passiveTimer >= 1) {
        unsecured += Math.round(BALANCE.rig.passiveScrapPerSec * rewardMult);
        passiveTimer -= 1;
      }
    }

    // ----- Regeneration (HP + ammo) -----
    // Difficulty divisor: higher gamble multiplier => slower regen.
    if (P.alive) {
      const diffDiv = Math.max(1, s.gambleMult);
      const hpRate = (BALANCE.regen.hpPerSec * P.regenMult) / diffDiv;
      const ammoRate = (BALANCE.regen.ammoPerSec * P.regenMult) / diffDiv;
      if (P.hp < P.maxHp && P.hitRecentTimer <= 0) {
        P.hpRegenAcc += hpRate * dt;
        if (P.hpRegenAcc >= 1) {
          const add = Math.floor(P.hpRegenAcc);
          P.hp = Math.min(P.maxHp, P.hp + add);
          P.hpRegenAcc -= add;
        }
      }
      if (P.ammo < P.maxAmmo) {
        P.ammoRegenAcc += ammoRate * dt;
        if (P.ammoRegenAcc >= 1) {
          const add = Math.floor(P.ammoRegenAcc);
          P.ammo = Math.min(P.maxAmmo, P.ammo + add);
          P.ammoRegenAcc -= add;
        }
      }
    }

    // ----- Round timer -----
    const roundTimer = Math.max(0, s.roundTimer - dt);

    // Player death
    if (P.alive && P.hp <= 0) {
      P.hp = 0; P.alive = false;
      const busted = s.gambleMult > 1;
      const effUnsecured = busted ? Math.round(unsecured * (1 - s.gamblePenalty)) : unsecured;
      const summary = resolveRunEnd("death", effUnsecured, 0, s.wave);
      set({
        player: P, rig: R, enemies, bullets, spawnQueue, spawnTimer,
        unsecured: effUnsecured, kills, passiveTimer, roundTimer,
        phase: "ended",
        endSummary: { ...summary, gambleBusted: busted, gambleMult: s.gambleMult },
      });
      return;
    }

    // Rig overrun
    if (R.hp <= 0) {
      R.hp = 0;
      const busted = s.gambleMult > 1;
      const effUnsecured = busted ? Math.round(unsecured * (1 - s.gamblePenalty)) : unsecured;
      const summary = resolveRunEnd("overrun", effUnsecured, 0, s.wave);
      set({
        player: P, rig: R, enemies, bullets, spawnQueue, spawnTimer,
        unsecured: effUnsecured, kills, passiveTimer, roundTimer,
        phase: "ended",
        endSummary: { ...summary, gambleBusted: busted, gambleMult: s.gambleMult },
      });
      return;
    }

    // Phase transitions
    let phase: RunPhase = s.phase;
    const allCleared = enemies.length === 0 && spawnQueue.length === 0;
    const timeout = roundTimer <= 0;
    if (phase === "spawning" && spawnQueue.length === 0) phase = "fighting";
    if (phase === "fighting" && (allCleared || timeout)) {
      const bonus = BALANCE.waveClearBonus(s.wave);
      unsecured += Math.round(bonus * rewardMult);
      phase = "cashout";
    }

    set({
      player: P, rig: R, enemies, bullets, spawnQueue, spawnTimer,
      unsecured, kills, passiveTimer, roundTimer, phase,
    });
  },

  // debug
  debugAddUnsecured: (n) => set({ unsecured: get().unsecured + n }),
  debugDamagePlayer: (n) => { const P = { ...get().player }; P.hp = Math.max(0, P.hp - n); set({ player: P }); },
  debugDamageRig: (n) => { const R = { ...get().rig }; R.hp = Math.max(0, R.hp - n); set({ rig: R }); },
  debugKillEnemies: () => {
    const s = get();
    let unsecured = s.unsecured; let kills = s.kills;
    for (const e of s.enemies) { unsecured += Math.round(e.scrapReward * s.scrapMultiplier); kills += 1; }
    set({ enemies: [], unsecured, kills });
  },
  debugForceWaveClear: () => {
    const s = get();
    let unsecured = s.unsecured; let kills = s.kills;
    for (const e of s.enemies) { unsecured += Math.round(e.scrapReward * s.scrapMultiplier); kills += 1; }
    const bonus = BALANCE.waveClearBonus(s.wave);
    unsecured += Math.round(bonus * s.scrapMultiplier);
    set({ enemies: [], spawnQueue: [], unsecured, kills, phase: "cashout" });
  },
  debugSetWave: (w) => set({ wave: Math.max(1, w) }),
}));
