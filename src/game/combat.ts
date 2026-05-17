// Locked damage formula.
export function computeDamage(attackerAttack: number, targetDefense: number): number {
  return Math.max(1, Math.floor(attackerAttack - targetDefense));
}
