import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRunStore } from "@/store/useRunStore";
import { useMetaStore } from "@/store/useMetaStore";
import { Arena } from "@/components/game/Arena";
import { HUD } from "@/components/game/HUD";
import { CashoutModal } from "@/components/game/CashoutModal";
import { SummaryScreen } from "@/components/game/SummaryScreen";
import { MobileControls } from "@/components/game/MobileControls";
import { DebugPanel } from "@/components/game/DebugPanel";

export const Route = createFileRoute("/run")({
  head: () => ({ meta: [{ title: "Run — Last Scrap" }] }),
  component: RunPage,
});

function RunPage() {
  const phase = useRunStore((s) => s.phase);
  const endSummary = useRunStore((s) => s.endSummary);
  const beginNextWave = useRunStore((s) => s.beginNextWave);
  const cashOut = useRunStore((s) => s.cashOut);
  const surrender = useRunStore((s) => s.surrender);
  const startRun = useRunStore((s) => s.startRun);

  const secured = useMetaStore((s) => s.securedScrap);
  const upgrades = useMetaStore((s) => s.upgrades);
  const addSecured = useMetaStore((s) => s.addSecured);
  const hydrate = useMetaStore((s) => s.hydrate);
  const navigate = useNavigate();

  useEffect(() => { hydrate(); }, [hydrate]);

  // If user lands directly on /run without starting, send them to lobby.
  useEffect(() => {
    if (phase === "idle") navigate({ to: "/play" });
  }, [phase, navigate]);

  // When run ends, bank the banked amount once.
  useEffect(() => {
    if (phase === "ended" && endSummary && endSummary.securedAfter === -1) {
      addSecured(endSummary.banked);
      // patch securedAfter for display
      useRunStore.setState({
        endSummary: { ...endSummary, securedAfter: secured + endSummary.banked },
      });
    }
  }, [phase, endSummary, addSecured, secured]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <HUD />
      <Arena />
      <MobileControls />
      <DebugPanel />

      <button
        className="absolute right-2 bottom-2 z-10 rounded bg-black/60 px-3 py-1.5 text-xs text-white/70 hover:bg-black/80"
        onClick={() => surrender(secured)}
      >
        Surrender
      </button>

      {phase === "cashout" && (
        <CashoutModal
          onContinue={() => beginNextWave()}
          onCashout={() => cashOut(secured)}
        />
      )}

      {phase === "ended" && endSummary && endSummary.securedAfter !== -1 && (
        <SummaryScreen
          summary={endSummary}
          onHome={() => { useRunStore.setState({ phase: "idle" }); navigate({ to: "/" }); }}
          onUpgrades={() => { useRunStore.setState({ phase: "idle" }); navigate({ to: "/upgrades" }); }}
          onAgain={() => { startRun(upgrades); }}
        />
      )}
    </div>
  );
}
