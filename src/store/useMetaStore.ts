import { create } from "zustand";
import { loadMeta, saveMeta } from "@/game/persistence";
import { UPGRADES, upgradeCost, type UpgradeId } from "@/game/data/upgrades";

interface MetaState {
  securedScrap: number;
  upgrades: Partial<Record<UpgradeId, number>>;
  hydrated: boolean;
  hydrate: () => void;
  addSecured: (n: number) => void;
  setSecured: (n: number) => void;
  buyUpgrade: (id: UpgradeId) => boolean;
  reset: () => void;
}

export const useMetaStore = create<MetaState>((set, get) => ({
  securedScrap: 0,
  upgrades: {},
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const m = loadMeta();
    set({ securedScrap: m.securedScrap, upgrades: m.upgrades, hydrated: true });
  },
  addSecured: (n) => {
    const next = Math.max(0, get().securedScrap + n);
    set({ securedScrap: next });
    saveMeta({ securedScrap: next, upgrades: get().upgrades });
  },
  setSecured: (n) => {
    set({ securedScrap: Math.max(0, n) });
    saveMeta({ securedScrap: Math.max(0, n), upgrades: get().upgrades });
  },
  buyUpgrade: (id) => {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const lvl = get().upgrades[id] ?? 0;
    if (lvl >= def.maxLevel) return false;
    const cost = upgradeCost(def, lvl);
    if (get().securedScrap < cost) return false;
    const nextUpgrades = { ...get().upgrades, [id]: lvl + 1 };
    const nextSecured = get().securedScrap - cost;
    set({ upgrades: nextUpgrades, securedScrap: nextSecured });
    saveMeta({ securedScrap: nextSecured, upgrades: nextUpgrades });
    return true;
  },
  reset: () => {
    set({ securedScrap: 0, upgrades: {} });
    saveMeta({ securedScrap: 0, upgrades: {} });
  },
}));

export function getUpgradeLevel(
  upgrades: Partial<Record<UpgradeId, number>>,
  id: UpgradeId,
): number {
  return upgrades[id] ?? 0;
}
