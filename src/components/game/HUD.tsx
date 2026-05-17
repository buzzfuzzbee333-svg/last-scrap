import { useRunStore } from "@/store/useRunStore";

export function HUD() {
  const player = useRunStore((s) => s.player);
  const rig = useRunStore((s) => s.rig);
  const wave = useRunStore((s) => s.wave);
  const unsecured = useRunStore((s) => s.unsecured);
  const phase = useRunStore((s) => s.phase);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 text-sm font-medium text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded bg-black/70 px-3 py-1.5">
          Wave <span className="font-bold text-amber-300">{wave}</span>
          <span className="ml-2 text-xs text-white/60 uppercase">{phase}</span>
        </div>
        <div className="rounded bg-black/70 px-3 py-1.5">
          Unsecured Scrap: <span className="font-bold text-amber-300">{unsecured}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <Bar label="HP" value={player.hp} max={player.maxHp} color="#e85d3a" />
        <Bar label="RIG" value={rig.hp} max={rig.maxHp} color="#c9a84c" />
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex-1 rounded bg-black/70 px-2 py-1">
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
