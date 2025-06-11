export const parsePrice = (priceString) => {
  if (priceString === null || priceString === undefined) return null;
  if (typeof priceString === 'number') {
    return isNaN(priceString) ? null : priceString;
  }
  if (typeof priceString !== 'string') {
    return null;
  }
  const numericString = priceString.replace(/g|,/gi, '');
  const price = parseFloat(numericString);
  return isNaN(price) ? null : price;
};

export const parseDurability = (durabilityString) => {
  if (durabilityString === null || durabilityString === undefined) return null;
  if (typeof durabilityString !== 'string') {
    return null;
  }

  const usesMatch = durabilityString.match(/\s*(\d+)\s*Uses/i);
  if (usesMatch && usesMatch[1]) {
    const durability = parseInt(usesMatch[1], 10);
    return isNaN(durability) ? null : durability;
  }

  const slashMatch = durabilityString.match(/^\s*(\d+)\s*\/\s*\d+\s*$/);
  if (slashMatch && slashMatch[1]) {
    const durability = parseInt(slashMatch[1], 10);
    return isNaN(durability) ? null : durability;
  }
  const directNumber = parseInt(durabilityString, 10);
  if (!isNaN(directNumber)) {
      return directNumber;
  }

  return null;
};

export const parseDamage = (damageString) => {
  if (damageString === null || damageString === undefined) return null;
  if (typeof damageString === 'number') {
    return isNaN(damageString) ? null : damageString;
  }
  if (typeof damageString !== 'string') {
    return null;
  }

  const parts = damageString.split('-').map(part => parseFloat(part.trim()));
  if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0];
  } else if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return (parts[0] + parts[1]) / 2;
  }
  return null;
};


export const getPriceChangeInfo = (weapon, previousData) => {
  if (!previousData || previousData.length === 0) return null;
  if (!weapon || weapon.price == null) return null;

  const previousWeapon = previousData.find(pw => pw.id === weapon.id);
  if (!previousWeapon || previousWeapon.price == null) return null;

  const currentPrice = parsePrice(weapon.price);
  const prevPrice = parsePrice(previousWeapon.price);

  if (currentPrice === null || prevPrice === null) {
    return null;
  }

  if (prevPrice === 0) {
    if (currentPrice === 0) {
      return null;
    } else {
      return { sign: '+', amount: 'New', percentageChange: Infinity, color: '#007bff' };
    }
  }

  const percentageChange = ((currentPrice - prevPrice) / prevPrice) * 100;

  if (percentageChange === 0) {
    return null;
  }

  const sign = percentageChange > 0 ? '+' : '-';
  const amount = Math.abs(percentageChange);
  const color = percentageChange > 0 ? 'red' : 'green';

  return {
    sign,
    amount,
    percentageChange,
    color
  };
};

export const calculatePricePerDurability = (weapon) => {
  if (!weapon) return null;

  const price = parsePrice(weapon.price);
  const durability = parseDurability(weapon.durability);

  if (price === null || durability === null || durability === 0) {
    return null;
  }

  if (price === 0) return 0;

  return price / durability;
};

export const calculateDamagePerCoin = (weapon) => {
  if (!weapon) return null;

  const damage = parseDamage(weapon.damage);
  const price = parsePrice(weapon.price);

  if (damage === null || price === null || price === 0) {
    return null;
  }

  if (damage === 0) return 0;

  return damage / price;
};

export const calculateOverallCombatEfficiency = (weapon) => {
  if (!weapon) return null;

  const damage = parseDamage(weapon.damage);
  const durability = parseDurability(weapon.durability);
  const price = parsePrice(weapon.price);

  if (damage === null || durability === null || price === null || price === 0) {
    return null;
  }

  if (damage === 0 || durability === 0) return 0;

  return (damage * durability) / price;
};
