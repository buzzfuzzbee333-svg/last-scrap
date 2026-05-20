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

export function downloadSave(): void {
  const data = loadMeta();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "lastscrap-save.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importSave(file: File): Promise<MetaPersisted> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string) as MetaPersisted;
        const safe: MetaPersisted = {
          securedScrap: typeof parsed.securedScrap === "number" ? parsed.securedScrap : 0,
          upgrades: parsed.upgrades && typeof parsed.upgrades === "object" ? parsed.upgrades : {},
        };
        saveMeta(safe);
        resolve(safe);
      } catch {
        reject(new Error("Invalid save file"));
      }
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}
