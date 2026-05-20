import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useMetaStore } from "@/store/useMetaStore";
import { UPGRADES, upgradeCost } from "@/game/data/upgrades";
import { downloadSave, importSave } from "@/game/persistence";

export const Route = createFileRoute("/upgrades")({
  head: () => ({ meta: [{ title: "Upgrades — Last Scrap" }] }),
  component: Upgrades,
});

function Upgrades() {
  const hydrate = useMetaStore((s) => s.hydrate);
  const secured = useMetaStore((s) => s.securedScrap);
  const upgrades = useMetaStore((s) => s.upgrades);
  const buy = useMetaStore((s) => s.buyUpgrade);
  const loadFromData = useMetaStore((s) => s.loadFromData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    importSave(file)
      .then((data) => loadFromData(data))
      .catch(() => alert("Failed to import save — invalid file."));
    e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <div className="mx-auto max-w-md p-6">
        <Link to="/" className="text-sm text-white/60 hover:text-white">← Home</Link>
        <h1 className="mt-3 text-3xl font-black text-amber-300">Upgrades</h1>
        <p className="text-sm text-white/60">
          Secured Scrap: <span className="font-mono text-amber-300">{secured}</span>
        </p>

        <div className="mt-5 space-y-3">
          {UPGRADES.map((u) => {
            const lvl = upgrades[u.id] ?? 0;
            const max = lvl >= u.maxLevel;
            const cost = max ? 0 : upgradeCost(u, lvl);
            const canBuy = !max && secured >= cost;
            return (
              <div key={u.id} className="rounded border border-white/10 bg-black/40 p-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="font-bold">{u.name}</div>
                    <div className="text-xs text-white/60">{u.description}</div>
                  </div>
                  <div className="text-right text-xs text-white/60">
                    Lv <span className="text-amber-300">{lvl}</span>/{u.maxLevel}
                  </div>
                </div>
                <button
                  disabled={!canBuy}
                  onClick={() => buy(u.id)}
                  className="mt-2 w-full rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
                >
                  {max ? "MAX" : `Buy · ${cost} scrap`}
                </button>
              </div>
            );
          })}
        </div>

        <Link to="/play" className="mt-6 block w-full rounded border border-white/30 px-6 py-3 text-center font-semibold hover:bg-white/10">
          To Loadout
        </Link>

        <div className="mt-4 flex gap-2">
          <button
            onClick={downloadSave}
            className="flex-1 rounded border border-white/20 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            ↓ Download Save
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded border border-white/20 px-3 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            ↑ Import Save
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>
    </div>
  );
}
