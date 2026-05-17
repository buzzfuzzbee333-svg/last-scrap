import { useState } from "react";
import { useRunStore } from "@/store/useRunStore";
import { useMetaStore } from "@/store/useMetaStore";
import { BALANCE } from "@/game/data/balance";

interface Props {
  onContinue: (gambleMult: number, gamblePenalty: number) => void;
  onCashout: () => void;
}

export function CashoutModal({ onContinue, onCashout }: Props) {
  const unsecured = useRunStore((s) => s.unsecured);
  const wave = useRunStore((s) => s.wave);
  const secured = useMetaStore((s) => s.securedScrap);
  const [showGamble, setShowGamble] = useState(false);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg border border-amber-500/40 bg-stone-900 p-6 text-white shadow-2xl">
        <h2 className="text-xl font-bold text-amber-300">Wave {wave} Cleared</h2>
        <p className="mt-2 text-sm text-white/70">
          Cash out, push on, or <span className="text-rose-300">gamble</span> for bigger payouts.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded bg-black/40 p-3 text-sm">
          <div>Unsecured</div><div className="text-right font-mono text-amber-300">{unsecured}</div>
          <div>Banked</div><div className="text-right font-mono">{secured}</div>
        </div>

        {!showGamble ? (
          <>
            <div className="mt-5 flex gap-3">
              <button className="flex-1 rounded bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400" onClick={onCashout}>
                Cash Out
              </button>
              <button className="flex-1 rounded border border-white/30 px-4 py-2 font-semibold hover:bg-white/10" onClick={() => onContinue(1, 0)}>
                Next Wave
              </button>
            </div>
            <button
              className="mt-3 w-full rounded border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
              onClick={() => setShowGamble(true)}
            >
              ⚠ Gamble Next Wave
            </button>
          </>
        ) : (
          <div className="mt-5">
            <p className="text-xs text-white/70">
              Pick a multiplier. Enemies and rewards scale together.
              If you die or the rig falls, you lose that % of <em>all</em> unsecured scrap.
            </p>
            <div className="mt-3 space-y-2">
              {BALANCE.gamble.options.map((opt) => (
                <button
                  key={opt.mult}
                  className="flex w-full items-center justify-between rounded border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm hover:bg-rose-500/20"
                  onClick={() => onContinue(opt.mult, opt.penalty)}
                >
                  <span className="font-bold text-rose-200">{opt.label} scrap & difficulty</span>
                  <span className="text-xs text-white/60">lose {Math.round(opt.penalty * 100)}% on fail</span>
                </button>
              ))}
            </div>
            <button className="mt-3 w-full rounded border border-white/20 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10" onClick={() => setShowGamble(false)}>
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
