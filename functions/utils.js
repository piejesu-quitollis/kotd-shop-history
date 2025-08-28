function parsePrice(priceString) {
  if (priceString === null || priceString === undefined) return null;
  if (typeof priceString === 'number') {
    return isNaN(priceString) ? null : priceString;
  }
  if (typeof priceString !== 'string') return null;
  const numericString = priceString.replace(/g|,/gi, '');
  const price = parseFloat(numericString);
  return isNaN(price) ? null : price;
}

function parseDurability(durabilityString) {
  if (durabilityString === null || durabilityString === undefined) return null;
  if (typeof durabilityString !== 'string') return null;

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
}

function parseDamage(damageString) {
  if (damageString === null || damageString === undefined) return null;
  if (typeof damageString === 'number') {
    return isNaN(damageString) ? null : damageString;
  }
  if (typeof damageString !== 'string') return null;
  const m = damageString.match(/-?\s*~\s*([0-9]+(?:\.[0-9]+)?)/);
  if (m && m[1]) {
    const v = parseFloat(m[1]);
    return isNaN(v) ? null : v;
  }
  const v = parseFloat(damageString);
  return isNaN(v) ? null : v;
}

function calculatePPD(weapon) {
  if (!weapon) return null;
  const price = parsePrice(weapon.price);
  const durability = parseDurability(weapon.durability);
  if (price === null || durability === null || durability === 0) return null;
  if (price === 0) return 0;
  return price / durability;
}

module.exports = { parsePrice, parseDurability, parseDamage, calculatePPD };
