import { calculatePricePerDurability, calculatePricePerDamageTimesDurability } from './weapon-utils';

export function computeBestStats(weapons) {
  if (!weapons || weapons.length === 0) {
    return {
      bestPPDWeapon: null,
      bestPPDDWeapon: null,
      bestPPDByType: { magic: null, melee: null, range: null },
      bestPPDDByType: { magic: null, melee: null, range: null },
    };
  }
  let bestPPD = { weapon: null, value: Infinity }; // Price/Durability (min)
  let bestPPDD = { weapon: null, value: Infinity }; // Price/(Damage*Durability) (min)
  const bestPPDByType = { magic: { weapon: null, value: Infinity }, melee: { weapon: null, value: Infinity }, range: { weapon: null, value: Infinity } };
  const bestPPDDByType = { magic: { weapon: null, value: Infinity }, melee: { weapon: null, value: Infinity }, range: { weapon: null, value: Infinity } };

  const toTypeKey = (type) => {
    if (!type) return null;
    const t = String(type).toLowerCase();
    if (t.includes('🔮') || t.includes('magic')) return 'magic';
    if (t.includes('⚔') || t.includes('melee')) return 'melee';
    if (t.includes('🏹') || t.includes('range')) return 'range';
    return null;
  };
  weapons.forEach(weapon => {
    const ppd = calculatePricePerDurability(weapon);
    if (ppd !== null && ppd < bestPPD.value) bestPPD = { weapon, value: ppd };
    const ppdd = calculatePricePerDamageTimesDurability(weapon);
    if (ppdd !== null && ppdd < bestPPDD.value) bestPPDD = { weapon, value: ppdd };

    const key = toTypeKey(weapon.type);
    if (key) {
      if (ppd !== null && ppd < bestPPDByType[key].value) bestPPDByType[key] = { weapon, value: ppd };
      if (ppdd !== null && ppdd < bestPPDDByType[key].value) bestPPDDByType[key] = { weapon, value: ppdd };
    }
  });
  return {
    bestPPDWeapon: bestPPD.value !== Infinity ? bestPPD : null,
    bestPPDDWeapon: bestPPDD.value !== Infinity ? bestPPDD : null,
    bestPPDByType: {
      magic: bestPPDByType.magic.value !== Infinity ? bestPPDByType.magic : null,
      melee: bestPPDByType.melee.value !== Infinity ? bestPPDByType.melee : null,
      range: bestPPDByType.range.value !== Infinity ? bestPPDByType.range : null,
    },
    bestPPDDByType: {
      magic: bestPPDDByType.magic.value !== Infinity ? bestPPDDByType.magic : null,
      melee: bestPPDDByType.melee.value !== Infinity ? bestPPDDByType.melee : null,
      range: bestPPDDByType.range.value !== Infinity ? bestPPDDByType.range : null,
    },
  };
}
