import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMetaStore } from "@/store/useMetaStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Last Scrap" },
      { name: "description", content: "Survive the waves. Bank the scrap. Or lose it all." },
    ],
  }),
  component: Title,
});

function Title() {
  const hydrate = useMetaStore((s) => s.hydrate);
  const secured = useMetaStore((s) => s.securedScrap);
  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-stone-950 px-6 text-center text-white">
      <h1 className="text-6xl font-black tracking-tight text-amber-300 drop-shadow">LAST SCRAP</h1>
      <p className="max-w-md text-white/70">
        Defend the rig. Survive the waves. Cash out before greed kills you.
      </p>
      <div className="rounded bg-black/40 px-4 py-2 font-mono text-sm">
        Secured Scrap: <span className="font-bold text-amber-300">{secured}</span>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link to="/play" className="rounded bg-amber-500 px-6 py-3 text-lg font-semibold text-black hover:bg-amber-400">
          Start Run
        </Link>
        <Link to="/upgrades" className="rounded border border-white/30 px-6 py-3 text-lg font-semibold hover:bg-white/10">
          Upgrades
        </Link>
      </div>
      <div className="mt-8 text-xs text-white/40">
        WASD / arrows to move · Space to attack · Touch controls on mobile
      </div>
    </div>
  );
}
