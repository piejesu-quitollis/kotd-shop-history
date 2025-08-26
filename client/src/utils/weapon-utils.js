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

  let processedString = damageString;
  if (processedString.startsWith('~')) {
    processedString = processedString.slice(1);
  }

  const parts = processedString.split('-').map(part => parseFloat(part.trim()));
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

  if (!weapon) return null;

  const previousWeapon = previousData.find(pw => pw.id === weapon.id);
  if (!previousWeapon) return null;

  const currentPrice = parsePrice(weapon.price);
  const currentDurability = parseDurability(weapon.durability);
  const prevPrice = parsePrice(previousWeapon.price);
  const previousDurability = parseDurability(previousWeapon.durability);

  const currentPPD = (currentPrice !== null && currentDurability !== null && currentDurability > 0) 
    ? currentPrice / currentDurability 
    : null;
  const previousPPD = (prevPrice !== null && previousDurability !== null && previousDurability > 0) 
    ? prevPrice / previousDurability 
    : null;

  if (currentPPD === null && previousPPD === null) {
    return null;
  }

  if (previousPPD === null) {
    return { 
      sign: currentPPD === 0 ? '' : '+',
      amount: 'New', 
      percentageChange: Infinity, 
      color: currentPPD === 0 ? 'green' : '#007bff' 
    };
  }

  if (currentPPD === null) {
    return { 
      sign: '-', 
      amount: 'Removed', 
      percentageChange: -Infinity, 
      color: 'grey' 
    };
  }

  if (previousPPD === 0) {
    if (currentPPD === 0) {
      return null;
    } else {
      return { 
        sign: '+',
        amount: currentPPD.toFixed(2),
        percentageChange: Infinity,
        color: 'red'
      };
    }
  }

  const percentageChange = ((currentPPD - previousPPD) / previousPPD) * 100;

  if (Math.abs(percentageChange) < 0.1) {
    return null;
  }

  return {
    sign: percentageChange > 0 ? '+' : '-',
    amount: Math.abs(percentageChange),
    percentageChange: percentageChange,
    color: percentageChange > 0 ? 'red' : 'green', 
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

export const calculatePricePerDamageTimesDurability = (weapon) => {
  if (!weapon) return null;

  const damage = parseDamage(weapon.damage);
  const durability = parseDurability(weapon.durability);
  const price = parsePrice(weapon.price);

  if (damage === null || durability === null || price === null) {
    return null;
  }
  const denom = damage * durability;
  if (!denom) {
    return null;
  }
  if (price === 0) return 0;
  return price / denom;
};
