class WeaponDataError extends Error {
    constructor(message, type) {
        super(message);
        this.type = type;
    }
}

const parseWeaponsData = (rawText) => {
    const dateMatch = rawText.match(/Last Updated: (.*?) UTC/);
    if (!dateMatch) throw new WeaponDataError('No update date found', 'PARSE_ERROR');

    const cleanDateTime = dateMatch[1].replace(' - ', ' ').trim();
    const lastUpdateDate = new Date(`${cleanDateTime} UTC`);

    const weapons = parseWeapons(rawText);
    return { weapons, lastUpdateDate };
};

const parseWeapons = (rawText) => {
    const WEAPONS_REGEX = /#Items:\n[\s\S]*?\|Price\|ID\|Type\|Name\|Damage\|Durability\|Element\|Req Lv\.\|([\s\S]*?)\n# Canteen:/;
    const weapons = rawText.match(WEAPONS_REGEX)?.[1]
        ?.trim()
        .split('\n')
        .filter(line => line && !line.includes(':-:'))
        .map(parseWeaponLine)
        .filter(Boolean);
        
    if (!weapons?.length) throw new WeaponDataError('No weapons found', 'PARSE_ERROR');
    return weapons;
};

const parseWeaponLine = (line) => {
    const fields = line.replace(/^\||\|$/g, '').split('|').map(item => item.trim());
    if (fields.length !== 8) return null;
    
    const [price, id, type, name, damage, durability, element, reqLevel] = fields;
    return {
        id: parseInt(id, 10),
        price,
        type,
        name,
        damage,
        durability,
        element,
        reqLevel: parseInt(reqLevel, 10)
    };
};

module.exports = { 
    WeaponDataError,
    parseWeaponsData 
};