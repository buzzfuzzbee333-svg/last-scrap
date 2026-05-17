import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
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
  const markSummaryPersisted = useRunStore((s) => s.markSummaryPersisted);

  const secured = useMetaStore((s) => s.securedScrap);
  const upgrades = useMetaStore((s) => s.upgrades);
  const addSecured = useMetaStore((s) => s.addSecured);
  const hydrate = useMetaStore((s) => s.hydrate);
  const navigate = useNavigate();

  const bankedKeyRef = useRef<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (phase === "idle") navigate({ to: "/play" });
  }, [phase, navigate]);

  // Bank scrap exactly once per ended summary, for ALL causes.
  useEffect(() => {
    if (phase !== "ended" || !endSummary || endSummary.persisted) return;
    // Identify this summary so we only bank it once.
    const key = `${endSummary.cause}-${endSummary.waveReached}-${endSummary.banked}-${endSummary.unsecuredBefore}`;
    if (bankedKeyRef.current === key) return;
    bankedKeyRef.current = key;
    addSecured(endSummary.banked);
    // Read fresh secured after write to display accurate total.
    const newSecured = useMetaStore.getState().securedScrap;
    markSummaryPersisted(newSecured);
  }, [phase, endSummary, addSecured, markSummaryPersisted]);

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
          onContinue={(gambleMult, penalty) => {
            bankedKeyRef.current = null;
            beginNextWave(gambleMult, penalty);
          }}
          onCashout={() => cashOut(secured)}
        />
      )}

      {phase === "ended" && endSummary && endSummary.persisted && (
        <SummaryScreen
          summary={endSummary}
          onHome={() => { useRunStore.setState({ phase: "idle" }); navigate({ to: "/" }); }}
          onUpgrades={() => { useRunStore.setState({ phase: "idle" }); navigate({ to: "/upgrades" }); }}
          onAgain={() => { bankedKeyRef.current = null; startRun(upgrades); }}
        />
      )}
    </div>
  );
}
