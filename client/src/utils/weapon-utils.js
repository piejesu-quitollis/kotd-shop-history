export const getPriceChangeInfo = (weapon, previousData) => {
  if (!previousData || previousData.length === 0) return null;
  if (!weapon || weapon.price == null) return null;

  const previousWeapon = previousData.find(pw => pw.id === weapon.id);
  if (!previousWeapon || previousWeapon.price == null) return null;

  const parsePrice = (priceString) => {
    if (typeof priceString !== 'string') {
      const num = parseFloat(priceString);
      return isNaN(num) ? null : num;
    }
    const numericString = priceString.replace(/g|,/gi, '');
    const price = parseFloat(numericString);
    return isNaN(price) ? null : price;
  };

  const parseDurability = (durabilityString) => {
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

    return null;
  };

  const currentPrice = parsePrice(weapon.price);
  const prevPrice = parsePrice(previousWeapon.price);

  if (currentPrice === null || prevPrice === null) {
    console.warn(`[getPriceChangeInfo] Could not parse prices for weapon ID ${weapon.id}. Current: "${weapon.price}", Previous: "${previousWeapon.price}"`);
    return null;
  }

  const currentDurability = parseDurability(weapon.durability);
  const previousDurability = parseDurability(previousWeapon.durability);

  if (currentDurability === null || currentDurability === 0) {
    console.warn(`[getPriceChangeInfo] Invalid or zero current durability for weapon ID ${weapon.id}. Durability: "${weapon.durability}"`);
    return null;
  }

  if (previousDurability === null || previousDurability === 0) {
    console.warn(`[getPriceChangeInfo] Invalid or zero previous durability for weapon ID ${weapon.id}. Durability: "${previousWeapon.durability}"`);
    return null;
  }

  const currentPricePerDurability = currentPrice / currentDurability;
  const previousPricePerDurability = prevPrice / previousDurability;

  const difference = (currentPricePerDurability - previousPricePerDurability) * currentDurability;

  if (difference === 0) return null;

  return {
    sign: difference > 0 ? '+' : '-',
    amount: Math.abs(difference),
    color: difference > 0 ? 'red' : 'green'
  };
};
