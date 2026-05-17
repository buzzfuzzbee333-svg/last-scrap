import type { RunEndSummary } from "@/game/types";

const CAUSE_LABEL: Record<RunEndSummary["cause"], string> = {
  cashout: "Cashed Out",
  overrun: "Rig Overrun",
  death: "You Died",
  surrender: "Surrendered",
};

export function SummaryScreen({ summary, onHome, onUpgrades, onAgain }: {
  summary: RunEndSummary;
  onHome: () => void;
  onUpgrades: () => void;
  onAgain: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-sm rounded-lg border border-white/20 bg-stone-900 p-6 text-white shadow-2xl">
        <h2 className="text-2xl font-bold">{CAUSE_LABEL[summary.cause]}</h2>
        <p className="mt-1 text-sm text-white/60">Reached Wave {summary.waveReached}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded bg-black/40 p-3 text-sm">
          <div>Unsecured before</div><div className="text-right font-mono">{summary.unsecuredBefore}</div>
          <div className="text-emerald-300">Banked</div><div className="text-right font-mono text-emerald-300">+{summary.banked}</div>
          <div className="text-red-300">Lost</div><div className="text-right font-mono text-red-300">-{summary.lost}</div>
          <div className="col-span-2 mt-1 border-t border-white/10 pt-2 flex justify-between">
            <span>Secured total</span>
            <span className="font-mono font-bold text-amber-300">{summary.securedAfter}</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button className="rounded bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400" onClick={onAgain}>Run Again</button>
          <button className="rounded border border-white/30 px-4 py-2 font-semibold hover:bg-white/10" onClick={onUpgrades}>Upgrades</button>
          <button className="col-span-2 rounded border border-white/30 px-4 py-2 font-semibold hover:bg-white/10" onClick={onHome}>Home</button>
        </div>
      </div>
    </div>
  );
}
