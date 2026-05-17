
# Last Scrap — V1 Playable Slice Plan

## Reality check (important)

You referenced `docs/LAST_SCRAP_MASTER_SPEC.md`, `docs/LAST_SCRAP_ARCHITECTURE.md`, and `data/*.json` as "already in the repo." They are not. This repo is the stock Lovable TanStack Start + Tailwind v4 template — no Last Scrap scaffold, no data files, no docs.

Rather than block on that, I will treat the rules in your message as the spec and create the data files from it. If you actually have authoritative numbers in a separate doc, paste them and I'll swap them in — the data layer is isolated so it's a one-file change.

Stack decision: I am keeping TanStack Start (already configured, Cloudflare worker target, routes work) instead of swapping to a new Vite+React app. Functionally equivalent for this slice, avoids tearing down a working build.

## What gets built

A single playable web prototype with the full loop:

Title → Pre-Run/Upgrades → Arena (waves + cashout) → Summary → bank → Upgrades affect next run.

Canvas-based top-down arena, React for shell/HUD/menus, Zustand for run + meta state, localStorage for persistence.

## File layout

```
src/
  game/
    data/
      balance.ts            # balance_constants
      enemies.ts            # Shambler + Brute active, Runner defined but disabled
      upgrades.ts           # upgrade definitions
      waves.ts              # wave rules
    types.ts                # Entity, Enemy, Player, Rig, RunState, MetaState
    combat.ts               # final_damage = max(1, atk - def), contact resolution
    spawn.ts                # wave spawn scheduler
    ai.ts                   # aggro-vs-rig targeting, seek movement
    resolver.ts             # cashout / death / overrun / surrender payouts
    engine.ts               # fixed-timestep tick(dt): movement, combat, scrap, wave state
    persistence.ts          # localStorage load/save for meta (secured scrap + upgrades)
  store/
    useMetaStore.ts         # secured scrap, owned upgrade levels, persisted
    useRunStore.ts          # in-run state, transient
  components/game/
    Arena.tsx               # canvas + input bridge, mounts engine
    HUD.tsx                 # HP, rig integrity, wave, unsecured scrap
    CashoutModal.tsx
    SummaryScreen.tsx
    MobileControls.tsx      # left joystick + attack button (touch)
    DebugPanel.tsx
  routes/
    index.tsx               # Title
    play.tsx                # Pre-run loadout + Start
    run.tsx                 # Arena + HUD + modals
    upgrades.tsx            # Buy upgrades with secured scrap
```

Existing `src/routes/index.tsx` placeholder will be replaced. shadcn/ui components stay available for menus.

## Mechanics (locked to your rules)

- Damage: `final_damage = max(1, attacker.attack - target.defense)` everywhere.
- Combat: contact/proximity only. No ranged, no spit.
- Enemies active in v1: Shambler (slow, low HP), Brute (slow, high HP/dmg). Runner present in `enemies.ts` with `enabled: false`, not spawned.
- AI: each enemy picks target = player if within aggro radius, else rig. Move via simple steering toward target. Contact tick deals damage on cooldown.
- Player attack: short-range melee swing on Space / on-screen button. Auto-attack nearest in arc to keep it playable on mobile.
- Scrap:
  - Kill grants unsecured scrap (per-enemy value in data).
  - Wave clear bonus.
  - Passive rig-linked trickle while rig alive.
- Run end resolution (single place — `resolver.ts`):
  - Cash Out → bank 100% of unsecured.
  - Rig Overrun (rig HP ≤ 0, player alive) → bank 50%, lose 50%.
  - Player Death → bank 0%, lose 100%.
  - Surrender/Quit → bank 40%, lose 60%.
- Cashout: modal opens after every wave clear; Continue advances wave, Cash Out ends run as banked.

## Upgrades (v1 set, all read from data)

- Max HP +
- Player Attack +
- Player Defense +
- Move Speed +
- Rig Max Integrity +
- Scrap Gain % +

Each: level, cost curve, effect-per-level. Purchased via secured scrap on `/upgrades`. Applied at run start by `useRunStore.startRun()` reading `useMetaStore`.

## Controls

- Desktop: WASD/Arrows move, Space attack, Esc opens pause/surrender.
- Mobile: left-thumb virtual joystick, right-thumb attack button. Auto-detected via touch; visible only when touch is used. HUD scales to viewport.

## Engine loop

`requestAnimationFrame` driving fixed dt (e.g. 1/60). Each tick: input → movement → enemy AI → collisions/contact damage → death cleanup → scrap accrual → wave state check → render to canvas. React renders HUD off Zustand subscriptions; canvas does not re-render React.

## Debug panel

Toggle with backtick (`` ` ``) or a small dev button. Buttons: +100 secured, +50 unsecured, set wave, damage player 25, damage rig 50, kill all enemies, force wave clear.

## Definition of done checklist

- `bun run dev` boots, no TS errors.
- Title → Start Run → arena loads with player + rig.
- Waves 1–3 spawn Shamblers and Brutes; contact damage works both ways.
- HUD shows HP, rig integrity, wave, unsecured scrap live.
- Cashout modal after each wave clear; Cash Out and Continue both work.
- Player death and rig overrun each end the run with correct payout split.
- Secured scrap and upgrade levels survive page reload.
- Buying an upgrade visibly changes the next run (e.g. higher HP, faster move).
- Works with touch controls in a mobile viewport.

## Out of scope (per your rules)

Ranged enemies, spit, multiple arenas, multiplayer, backend, crafting, inventory, skill tree, polish passes before the loop is solid, Runner activation.

## Open items I will decide if you don't override

- Exact numbers in `balance.ts` and `waves.ts` (HP, dmg, scrap values, wave sizes). I'll tune to your "Wave 1 teaches, Wave 3+ tense" target and leave them in one file for easy tweaking.
- Arena size: fixed 1280×720 logical, scaled to viewport with letterboxing.
