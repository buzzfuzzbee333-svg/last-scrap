import { useRunStore } from "@/store/useRunStore";
import { useMetaStore } from "@/store/useMetaStore";

export function CashoutModal({ onContinue, onCashout }: { onContinue: () => void; onCashout: () => void }) {
  const unsecured = useRunStore((s) => s.unsecured);
  const wave = useRunStore((s) => s.wave);
  const secured = useMetaStore((s) => s.securedScrap);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg border border-amber-500/40 bg-stone-900 p-6 text-white shadow-2xl">
        <h2 className="text-xl font-bold text-amber-300">Wave {wave} Cleared</h2>
        <p className="mt-2 text-sm text-white/70">Cash out now to bank everything, or push on for more.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded bg-black/40 p-3 text-sm">
          <div>Unsecured</div><div className="text-right font-mono text-amber-300">{unsecured}</div>
          <div>Banked</div><div className="text-right font-mono">{secured}</div>
        </div>
        <div className="mt-5 flex gap-3">
          <button className="flex-1 rounded bg-amber-500 px-4 py-2 font-semibold text-black hover:bg-amber-400" onClick={onCashout}>
            Cash Out
          </button>
          <button className="flex-1 rounded border border-white/30 px-4 py-2 font-semibold hover:bg-white/10" onClick={onContinue}>
            Next Wave
          </button>
        </div>
      </div>
    </div>
  );
}
