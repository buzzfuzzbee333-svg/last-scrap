import { useRunStore } from "@/store/useRunStore";

export function HUD() {
  const player = useRunStore((s) => s.player);
  const rig = useRunStore((s) => s.rig);
  const wave = useRunStore((s) => s.wave);
  const unsecured = useRunStore((s) => s.unsecured);
  const phase = useRunStore((s) => s.phase);
  const kills = useRunStore((s) => s.kills);
  const roundTimer = useRunStore((s) => s.roundTimer);
  const gambleMult = useRunStore((s) => s.gambleMult);

  const mm = Math.floor(roundTimer / 60).toString().padStart(1, "0");
  const ss = Math.floor(roundTimer % 60).toString().padStart(2, "0");

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 text-sm font-medium text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="rounded bg-black/70 px-3 py-1.5">
          Wave <span className="font-bold text-amber-300">{wave}</span>
          <span className="ml-2 text-xs text-white/60 uppercase">{phase}</span>
          {gambleMult > 1 && (
            <span className="ml-2 rounded bg-rose-500/30 px-2 py-0.5 text-xs font-bold text-rose-200">
              GAMBLE ×{gambleMult}
            </span>
          )}
        </div>
        <Stat label="Time" value={`${mm}:${ss}`} accent={roundTimer < 10 ? "#ff6b6b" : "#e8edf3"} />
        <Stat label="Kills" value={kills} />
        <Stat label="Scrap" value={unsecured} accent="#ffd84a" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Bar label="HP" value={player.hp} max={player.maxHp} color="#e85d3a" />
        <Bar label="RIG" value={rig.hp} max={rig.maxHp} color="#c9a84c" />
        <Bar label="AMMO" value={player.ammo} max={player.maxAmmo} color="#73ffb8" />
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "#e8edf3" }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded bg-black/70 px-3 py-1.5">
      <span className="text-xs text-white/60 uppercase mr-2">{label}</span>
      <span className="font-bold font-mono" style={{ color: accent }}>{value}</span>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex-1 min-w-[110px] rounded bg-black/70 px-2 py-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span>{Math.ceil(value)}/{max}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-white/10">
        <div className="h-full" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}
