import { create } from "zustand";
import { BALANCE } from "@/game/data/balance";
import { ENEMIES, type EnemyKind } from "@/game/data/enemies";
import { getWaveRule } from "@/game/data/waves";
import { computeDamage } from "@/game/combat";
import { resolveRunEnd } from "@/game/resolver";
import type { Enemy, Player, Rig, RunEndCause, RunEndSummary, Vec2 } from "@/game/types";
import type { UpgradeId } from "@/game/data/upgrades";

export type RunPhase = "idle" | "spawning" | "fighting" | "cashout" | "ended";

interface InputState {
  moveX: number; // -1..1
  moveY: number; // -1..1
  attack: boolean;
}

interface RunState {
  phase: RunPhase;
  wave: number;
  unsecured: number;
  scrapMultiplier: number;
  player: Player;
  rig: Rig;
  enemies: Enemy[];
  spawnQueue: EnemyKind[];
  spawnTimer: number;
  spawnInterval: number;
  passiveTimer: number;
  input: InputState;
  endSummary: RunEndSummary | null;
  // actions
  startRun: (upgrades: Partial<Record<UpgradeId, number>>) => void;
  setInput: (i: Partial<InputState>) => void;
  tick: (dt: number) => void;
  beginNextWave: () => void;
  cashOut: (currentSecured: number) => RunEndSummary;
  surrender: (currentSecured: number) => RunEndSummary;
  forceEnd: (cause: RunEndCause, currentSecured: number) => RunEndSummary;
  // debug
  debugAddUnsecured: (n: number) => void;
  debugDamagePlayer: (n: number) => void;
  debugDamageRig: (n: number) => void;
  debugKillEnemies: () => void;
  debugForceWaveClear: () => void;
  debugSetWave: (w: number) => void;
}

let enemyIdCounter = 1;

function makePlayer(upgrades: Partial<Record<UpgradeId, number>>): Player {
  const hpLvl = upgrades.maxHp ?? 0;
  const atkLvl = upgrades.attack ?? 0;
  const defLvl = upgrades.defense ?? 0;
  const spdLvl = upgrades.speed ?? 0;
  const maxHp = BALANCE.player.baseMaxHp + 15 * hpLvl;
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
  };
}

function makeRig(upgrades: Partial<Record<UpgradeId, number>>): Rig {
  const lvl = upgrades.rigIntegrity ?? 0;
  const maxHp = BALANCE.rig.baseMaxIntegrity + 60 * lvl;
  return {
    pos: { x: BALANCE.arena.rigX, y: BALANCE.arena.rigY },
    hp: maxHp,
    maxHp,
  };
}

function buildSpawnQueue(wave: number): { queue: EnemyKind[]; interval: number } {
  const rule = getWaveRule(wave);
  const queue: EnemyKind[] = [];
  (Object.keys(rule.spawns) as EnemyKind[]).forEach((k) => {
    if (!ENEMIES[k].enabled) return;
    const n = rule.spawns[k] ?? 0;
    for (let i = 0; i < n; i++) queue.push(k);
  });
  // shuffle
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return { queue, interval: rule.spawnIntervalSec };
}

function spawnEnemy(kind: EnemyKind): Enemy {
  const def = ENEMIES[kind];
  // spawn at random arena edge
  const side = Math.floor(Math.random() * 4);
  const W = BALANCE.arena.width;
  const H = BALANCE.arena.height;
  let pos: Vec2;
  if (side === 0) pos = { x: Math.random() * W, y: -20 };
  else if (side === 1) pos = { x: W + 20, y: Math.random() * H };
  else if (side === 2) pos = { x: Math.random() * W, y: H + 20 };
  else pos = { x: -20, y: Math.random() * H };
  return {
    id: enemyIdCounter++,
    kind,
    pos,
    hp: def.maxHp,
    maxHp: def.maxHp,
    attack: def.attack,
    defense: def.defense,
    speed: def.speed,
    radius: def.radius,
    aggroRadius: def.aggroRadius,
    contactInterval: def.contactDamageInterval,
    contactTimer: 0,
    scrapReward: def.scrapReward,
    color: def.color,
  };
}

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export const useRunStore = create<RunState>((set, get) => ({
  phase: "idle",
  wave: 0,
  unsecured: 0,
  scrapMultiplier: 1,
  player: makePlayer({}),
  rig: makeRig({}),
  enemies: [],
  spawnQueue: [],
  spawnTimer: 0,
  spawnInterval: 1,
  passiveTimer: 0,
  input: { moveX: 0, moveY: 0, attack: false },
  endSummary: null,

  startRun: (upgrades) => {
    const scrapLvl = upgrades.scrapGain ?? 0;
    const { queue, interval } = buildSpawnQueue(1);
    set({
      phase: "spawning",
      wave: 1,
      unsecured: 0,
      scrapMultiplier: 1 + 0.15 * scrapLvl,
      player: makePlayer(upgrades),
      rig: makeRig(upgrades),
      enemies: [],
      spawnQueue: queue,
      spawnTimer: 0,
      spawnInterval: interval,
      passiveTimer: 0,
      input: { moveX: 0, moveY: 0, attack: false },
      endSummary: null,
    });
  },

  setInput: (i) => set({ input: { ...get().input, ...i } }),

  beginNextWave: () => {
    const nextWave = get().wave + 1;
    const { queue, interval } = buildSpawnQueue(nextWave);
    set({
      phase: "spawning",
      wave: nextWave,
      spawnQueue: queue,
      spawnTimer: 0,
      spawnInterval: interval,
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

  tick: (dt) => {
    const s = get();
    if (s.phase !== "spawning" && s.phase !== "fighting") return;

    const P = { ...s.player, pos: { ...s.player.pos } };
    const R = { ...s.rig };
    let enemies = s.enemies.map((e) => ({ ...e, pos: { ...e.pos } }));
    let unsecured = s.unsecured;

    // Player movement
    const ix = s.input.moveX;
    const iy = s.input.moveY;
    const mag = Math.hypot(ix, iy);
    if (mag > 0.001 && P.alive) {
      const nx = ix / mag;
      const ny = iy / mag;
      P.pos.x += nx * P.speed * dt;
      P.pos.y += ny * P.speed * dt;
      P.facing = Math.atan2(ny, nx);
    }
    P.pos.x = Math.max(P.radius ?? 16, Math.min(BALANCE.arena.width - 16, P.pos.x));
    P.pos.y = Math.max(16, Math.min(BALANCE.arena.height - 16, P.pos.y));
    P.attackCooldown = Math.max(0, P.attackCooldown - dt);
    P.invulnTimer = Math.max(0, P.invulnTimer - dt);

    // Player attack (auto or pressed)
    if (P.alive && s.input.attack && P.attackCooldown <= 0) {
      const range = BALANCE.player.attackRange;
      const arc = (BALANCE.player.attackArcDeg * Math.PI) / 180;
      // facing fallback: nearest enemy
      let facing = P.facing;
      if (mag <= 0.001) {
        let nearest: Enemy | null = null;
        let nd = Infinity;
        for (const e of enemies) {
          const d = dist(e.pos, P.pos);
          if (d < nd) { nd = d; nearest = e; }
        }
        if (nearest) facing = Math.atan2(nearest.pos.y - P.pos.y, nearest.pos.x - P.pos.x);
      }
      let hitAny = false;
      for (const e of enemies) {
        const d = dist(e.pos, P.pos);
        if (d > range + e.radius) continue;
        const ang = Math.atan2(e.pos.y - P.pos.y, e.pos.x - P.pos.x);
        let diff = Math.abs(ang - facing);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff <= arc / 2) {
          e.hp -= computeDamage(P.attack, e.defense);
          hitAny = true;
        }
      }
      if (hitAny || true) {
        P.attackCooldown = BALANCE.player.attackCooldown;
        P.facing = facing;
      }
    }

    // Enemy AI + contact damage
    for (const e of enemies) {
      const toPlayer = dist(e.pos, P.pos);
      const target: Vec2 = (P.alive && toPlayer <= e.aggroRadius) ? P.pos : R.pos;
      const dx = target.x - e.pos.x;
      const dy = target.y - e.pos.y;
      const m = Math.hypot(dx, dy) || 1;
      e.pos.x += (dx / m) * e.speed * dt;
      e.pos.y += (dy / m) * e.speed * dt;
      e.contactTimer = Math.max(0, e.contactTimer - dt);

      // contact with rig
      const dRig = dist(e.pos, R.pos);
      if (dRig <= e.radius + BALANCE.arena.rigRadius) {
        if (e.contactTimer <= 0) {
          R.hp -= computeDamage(e.attack, 0);
          e.contactTimer = e.contactInterval;
        }
      }
      // contact with player
      const dPl = dist(e.pos, P.pos);
      if (P.alive && dPl <= e.radius + 16) {
        if (e.contactTimer <= 0 && P.invulnTimer <= 0) {
          P.hp -= computeDamage(e.attack, P.defense);
          P.invulnTimer = BALANCE.player.invulnAfterHit;
          e.contactTimer = e.contactInterval;
        }
      }
    }

    // Remove dead enemies, award scrap
    const survivors: Enemy[] = [];
    for (const e of enemies) {
      if (e.hp <= 0) {
        unsecured += Math.round(e.scrapReward * s.scrapMultiplier);
      } else {
        survivors.push(e);
      }
    }
    enemies = survivors;

    // Spawning
    let spawnQueue = s.spawnQueue;
    let spawnTimer = s.spawnTimer - dt;
    if (s.phase === "spawning") {
      while (spawnTimer <= 0 && spawnQueue.length > 0) {
        enemies.push(spawnEnemy(spawnQueue[0]));
        spawnQueue = spawnQueue.slice(1);
        spawnTimer += s.spawnInterval;
      }
    }

    // Passive rig scrap
    let passiveTimer = s.passiveTimer + dt;
    if (R.hp > 0) {
      while (passiveTimer >= 1) {
        unsecured += Math.round(BALANCE.rig.passiveScrapPerSec * s.scrapMultiplier);
        passiveTimer -= 1;
      }
    }

    // Check player death
    if (P.alive && P.hp <= 0) {
      P.hp = 0;
      P.alive = false;
      const summary = resolveRunEnd("death", unsecured, 0, s.wave);
      // currentSecured updated in finalize step
      set({
        player: P, rig: R, enemies, spawnQueue, spawnTimer,
        unsecured, passiveTimer, phase: "ended",
        endSummary: { ...summary, securedAfter: -1 },
      });
      return;
    }

    // Check rig overrun
    if (R.hp <= 0) {
      R.hp = 0;
      const summary = resolveRunEnd("overrun", unsecured, 0, s.wave);
      set({
        player: P, rig: R, enemies, spawnQueue, spawnTimer,
        unsecured, passiveTimer, phase: "ended",
        endSummary: { ...summary, securedAfter: -1 },
      });
      return;
    }

    // Determine phase transitions
    let phase: RunPhase = s.phase;
    if (phase === "spawning" && spawnQueue.length === 0) {
      phase = "fighting";
    }
    if (phase === "fighting" && enemies.length === 0 && spawnQueue.length === 0) {
      // wave clear
      const bonus = BALANCE.waveClearBonus(s.wave);
      unsecured += Math.round(bonus * s.scrapMultiplier);
      phase = "cashout";
    }

    set({
      player: P, rig: R, enemies, spawnQueue, spawnTimer,
      unsecured, passiveTimer, phase,
    });
  },

  // ---- debug ----
  debugAddUnsecured: (n) => set({ unsecured: get().unsecured + n }),
  debugDamagePlayer: (n) => {
    const P = { ...get().player };
    P.hp = Math.max(0, P.hp - n);
    set({ player: P });
  },
  debugDamageRig: (n) => {
    const R = { ...get().rig };
    R.hp = Math.max(0, R.hp - n);
    set({ rig: R });
  },
  debugKillEnemies: () => {
    const s = get();
    let unsecured = s.unsecured;
    for (const e of s.enemies) unsecured += Math.round(e.scrapReward * s.scrapMultiplier);
    set({ enemies: [], unsecured });
  },
  debugForceWaveClear: () => {
    const s = get();
    let unsecured = s.unsecured;
    for (const e of s.enemies) unsecured += Math.round(e.scrapReward * s.scrapMultiplier);
    const bonus = BALANCE.waveClearBonus(s.wave);
    unsecured += Math.round(bonus * s.scrapMultiplier);
    set({ enemies: [], spawnQueue: [], unsecured, phase: "cashout" });
  },
  debugSetWave: (w) => set({ wave: Math.max(1, w) }),
}));
