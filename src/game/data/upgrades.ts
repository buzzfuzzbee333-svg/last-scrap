export type UpgradeId =
  | "maxHp"
  | "attack"
  | "defense"
  | "speed"
  | "rigIntegrity"
  | "scrapGain";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number; // multiplier per level
  perLevel: number;   // raw bonus per level (interpreted per id)
}

export const UPGRADES: UpgradeDef[] = [
  { id: "maxHp",        name: "Reinforced Frame",   description: "+15 Max HP",                 maxLevel: 10, baseCost: 30,  costGrowth: 1.4, perLevel: 15 },
  { id: "attack",       name: "Sharpened Strike",   description: "+4 Attack",                  maxLevel: 10, baseCost: 40,  costGrowth: 1.45, perLevel: 4 },
  { id: "defense",      name: "Plated Armor",       description: "+2 Defense",                 maxLevel: 8,  baseCost: 35,  costGrowth: 1.5, perLevel: 2 },
  { id: "speed",        name: "Light Boots",        description: "+20 Move Speed",             maxLevel: 6,  baseCost: 45,  costGrowth: 1.5, perLevel: 20 },
  { id: "rigIntegrity", name: "Rig Bulwark",        description: "+60 Rig Integrity",          maxLevel: 8,  baseCost: 50,  costGrowth: 1.45, perLevel: 60 },
  { id: "scrapGain",    name: "Salvage Protocols",  description: "+15% Scrap Gain",            maxLevel: 6,  baseCost: 60,  costGrowth: 1.6, perLevel: 0.15 },
];

export function upgradeCost(def: UpgradeDef, currentLevel: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel));
}
