import type { UpgradeId } from "./data/upgrades";

const KEY = "lastscrap.meta.v1";

export interface MetaPersisted {
  securedScrap: number;
  upgrades: Partial<Record<UpgradeId, number>>;
}

const DEFAULT: MetaPersisted = { securedScrap: 0, upgrades: {} };

export function loadMeta(): MetaPersisted {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as MetaPersisted;
    return { securedScrap: parsed.securedScrap ?? 0, upgrades: parsed.upgrades ?? {} };
  } catch {
    return DEFAULT;
  }
}

export function saveMeta(m: MetaPersisted): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // ignore
  }
}
