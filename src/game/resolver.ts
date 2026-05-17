import { BALANCE } from "./data/balance";
import type { RunEndCause, RunEndSummary } from "./types";

export function resolveRunEnd(
  cause: RunEndCause,
  unsecured: number,
  currentSecured: number,
  waveReached: number,
): RunEndSummary {
  const split = BALANCE.cashoutSplits[cause];
  const banked = Math.floor(unsecured * split.bank);
  const lost = unsecured - banked;
  return {
    cause,
    unsecuredBefore: unsecured,
    banked,
    lost,
    securedAfter: currentSecured + banked,
    waveReached,
  };
}
