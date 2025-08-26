import { calculatePricePerDurability, calculateDamagePerCoin, calculateOverallCombatEfficiency } from './weapon-utils';

export function computeBestStats(weapons) {
  if (!weapons || weapons.length === 0) {
    return { bestPPDWeapon: null, bestDPCWeapon: null, bestOCEWeapon: null };
  }
  let bestPPD = { weapon: null, value: Infinity };
  let bestDPC = { weapon: null, value: 0 };
  let bestOCE = { weapon: null, value: 0 };
  weapons.forEach(weapon => {
    const ppd = calculatePricePerDurability(weapon);
    const dpc = calculateDamagePerCoin(weapon);
    const oce = calculateOverallCombatEfficiency(weapon);
    if (ppd !== null && ppd < bestPPD.value) bestPPD = { weapon, value: ppd };
    if (dpc !== null && dpc > bestDPC.value) bestDPC = { weapon, value: dpc };
    if (oce !== null && oce > bestOCE.value) bestOCE = { weapon, value: oce };
  });
  return {
    bestPPDWeapon: bestPPD.value !== Infinity ? bestPPD : null,
    bestDPCWeapon: bestDPC.value !== 0 || (bestDPC.weapon && bestDPC.value === 0) ? bestDPC : null,
    bestOCEWeapon: bestOCE.value !== 0 || (bestOCE.weapon && bestOCE.value === 0) ? bestOCE : null,
  };
}
