import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMetaStore } from "@/store/useMetaStore";
import { useRunStore } from "@/store/useRunStore";
import { BALANCE } from "@/game/data/balance";

export const Route = createFileRoute("/play")({
  head: () => ({ meta: [{ title: "Loadout — Last Scrap" }] }),
  component: PlayLobby,
});

function PlayLobby() {
  const hydrate = useMetaStore((s) => s.hydrate);
  const upgrades = useMetaStore((s) => s.upgrades);
  const secured = useMetaStore((s) => s.securedScrap);
  const startRun = useRunStore((s) => s.startRun);
  const navigate = useNavigate();

  useEffect(() => { hydrate(); }, [hydrate]);

  const hp = BALANCE.player.baseMaxHp + 15 * (upgrades.maxHp ?? 0);
  const atk = BALANCE.player.baseAttack + 4 * (upgrades.attack ?? 0);
  const def = BALANCE.player.baseDefense + 2 * (upgrades.defense ?? 0);
  const spd = BALANCE.player.baseSpeed + 20 * (upgrades.speed ?? 0);
  const rig = BALANCE.rig.baseMaxIntegrity + 60 * (upgrades.rigIntegrity ?? 0);
  const scrap = 1 + 0.15 * (upgrades.scrapGain ?? 0);

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <div className="mx-auto max-w-md p-6">
        <Link to="/" className="text-sm text-white/60 hover:text-white">← Home</Link>
        <h1 className="mt-3 text-3xl font-black text-amber-300">Loadout</h1>
        <p className="text-sm text-white/60">Secured Scrap: <span className="font-mono text-amber-300">{secured}</span></p>

        <div className="mt-5 rounded border border-white/10 bg-black/40 p-4">
          <div className="mb-2 text-sm font-bold uppercase text-white/60">Permanent Stats</div>
          <Stat label="Max HP" value={hp} />
          <Stat label="Attack" value={atk} />
          <Stat label="Defense" value={def} />
          <Stat label="Move Speed" value={spd} />
          <Stat label="Rig Integrity" value={rig} />
          <Stat label="Scrap Gain" value={`${Math.round(scrap * 100)}%`} />
        </div>

        <button
          className="mt-6 w-full rounded bg-amber-500 px-6 py-3 text-lg font-bold text-black hover:bg-amber-400"
          onClick={() => { startRun(upgrades); navigate({ to: "/run" }); }}
        >
          Begin Run
        </button>
        <Link to="/upgrades" className="mt-3 block w-full rounded border border-white/30 px-6 py-3 text-center font-semibold hover:bg-white/10">
          Buy Upgrades
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-1 text-sm">
      <span className="text-white/70">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
