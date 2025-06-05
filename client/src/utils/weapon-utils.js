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

  const currentPrice = parsePrice(weapon.price);
  const prevPrice = parsePrice(previousWeapon.price);

  if (currentPrice === null || prevPrice === null) {
    console.warn(`[getPriceChangeInfo] Could not parse prices for weapon ID ${weapon.id}. Current: "${weapon.price}", Previous: "${previousWeapon.price}"`);
    return null;
  }

  const difference = currentPrice - prevPrice;
  if (difference === 0) return null;

  return {
    sign: difference > 0 ? '+' : '-',
    amount: Math.abs(difference),
    color: difference > 0 ? 'red' : 'green'
  };
};
