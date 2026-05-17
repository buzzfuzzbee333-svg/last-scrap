import { useEffect, useState } from "react";
import { useRunStore } from "@/store/useRunStore";
import { useMetaStore } from "@/store/useMetaStore";

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const run = useRunStore.getState;
  const meta = useMetaStore.getState;

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "`") setOpen((o) => !o); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      <button
        className="fixed right-2 top-2 z-40 rounded bg-black/60 px-2 py-1 text-xs text-white/70"
        onClick={() => setOpen((o) => !o)}
      >dev</button>
      {open && (
        <div className="fixed right-2 top-10 z-40 w-56 rounded border border-white/20 bg-stone-900/95 p-3 text-xs text-white">
          <div className="mb-2 font-bold text-amber-300">Debug</div>
          <div className="grid grid-cols-2 gap-1">
            <Btn onClick={() => meta().addSecured(100)}>+100 secured</Btn>
            <Btn onClick={() => run().debugAddUnsecured(50)}>+50 unsecured</Btn>
            <Btn onClick={() => run().debugDamagePlayer(25)}>-25 HP</Btn>
            <Btn onClick={() => run().debugDamageRig(50)}>-50 Rig</Btn>
            <Btn onClick={() => run().debugKillEnemies()}>Kill all</Btn>
            <Btn onClick={() => run().debugForceWaveClear()}>Force clear</Btn>
            <Btn onClick={() => run().debugSetWave(5)}>Set wave 5</Btn>
            <Btn onClick={() => meta().reset()}>Reset meta</Btn>
          </div>
        </div>
      )}
    </>
  );
}

function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button className="rounded bg-white/10 px-2 py-1 hover:bg-white/20" onClick={onClick}>{children}</button>
  );
}
