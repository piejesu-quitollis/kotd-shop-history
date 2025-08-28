// Deprecated Snoowrap flow (kept for reference)
// const Snoowrap = require('snoowrap');
// const { parseWeaponsData, WeaponDataError } = require('./data-parser.js');
// const { defineString } = require('firebase-functions/params');
// Use global fetch available in Node 18+ runtime (Cloud Functions Node 20).

const { parsePrice, parseDurability, parseDamage } = require('./utils');

class DataProcessor {
    #db = null;
    constructor(db) { this.#db = db; }

    // Fetch the KOTD post JSON and extract the post markdown (ignore comments)
    async fetchRedditPostMarkdown(postJsonUrl) {
        const resp = await fetch(postJsonUrl, { headers: { 'User-Agent': 'kotd-shop-history/1.0' } });
        if (!resp.ok) throw new Error(`Reddit fetch failed: ${resp.status} ${resp.statusText}`);
        const json = await resp.json();
        const post = json && Array.isArray(json) && json[0]?.data?.children?.[0]?.data;
        const selftext = post?.selftext || '';
        const updatedText = (selftext.match(/Last Updated:\s*([A-Za-z]+\s+\d{1,2}\s+\d{4})\s*-\s*\d{2}:\d{2}\s*UTC/i) || [])[1];
        let dateISO;
        if (updatedText) {
            const parsed = new Date(`${updatedText} UTC`);
            if (!isNaN(parsed.getTime())) dateISO = parsed.toISOString().slice(0, 10);
        }
        return { markdown: selftext, dateStr: dateISO };
    }

    // Parse the markdown table from the post into weapon rows
    parseWeaponsFromMarkdown(md) {
        const lines = (md || '').split(/\r?\n/);
        const tableStart = lines.findIndex(l => /\|\s*Price\s*\|\s*ID\s*\|\s*Type\s*\|\s*Name\s*\|\s*Damage\s*\|\s*Durability\s*\|\s*Element\s*\|/i.test(l));
        if (tableStart === -1) return [];
        const rows = [];
        for (let i = tableStart + 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line.startsWith('|')) break; // end of table
            const cells = line.split('|').map(s => s.trim());
            // ['', '360g', '3', '⚔️', 'Basic GreatSword', '~3.0', '10 Uses', 'Blessed', '']
            if (cells.length < 9) continue;
            const price = cells[1];
            const id = parseInt(cells[2], 10);
            const type = cells[3];
            const name = cells[4];
            const damage = cells[5];
            const durability = cells[6];
            const element = cells[7];
            if (!Number.isFinite(id)) continue;
            rows.push({ id, price, type, name, damage, durability, element });
        }
        return rows;
    }

    // Write to model: Weapons (static) and DailyPrices (per day per weapon)
    async upsertModel(dateStr, weapons) {
        if (!dateStr) throw new Error('Missing dateStr for upsert');
        const batch = this.#db.batch();
        let writes = 0;
        for (const w of weapons) {
            const weaponId = String(w.id);
            const weaponDoc = this.#db.collection('weapons').doc(weaponId);
            const baseDamage = parseDamage(w.damage);
            // Static metadata only (overwrite to avoid stray fields)
            batch.set(weaponDoc, {
                _id: weaponId,
                name: w.name,
                type: w.type,
                element: w.element,
                baseDamage: baseDamage,
            }, { merge: false });
            writes++;

            const price = parsePrice(w.price);
            const durability = parseDurability(w.durability);
            const dailyId = `${weaponId}_${dateStr}`;
            const dailyDoc = this.#db.collection('dailyPrices').doc(dailyId);
            // Only changing fields for the day (overwrite to avoid stray fields)
            batch.set(dailyDoc, {
                _id: dailyId,
                weaponId: weaponId,
                date: dateStr,
                durability: durability,
                price: price,
            }, { merge: false });
            writes++;

            if (writes >= 400) {
                // eslint-disable-next-line no-await-in-loop
                await batch.commit();
                writes = 0;
            }
        }
        if (writes > 0) await batch.commit();
    }

    // Ingest current data from Reddit JSON URL into new model
    async ingestFromReddit(postJsonUrl) {
        const { markdown, dateStr } = await this.fetchRedditPostMarkdown(postJsonUrl);
        const weapons = this.parseWeaponsFromMarkdown(markdown);
        if (!dateStr) {
            // fallback: use today in UTC
            const now = new Date();
            const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const d = today.toISOString().slice(0,10);
            await this.upsertModel(d, weapons);
            return { message: 'Ingested without explicit date', count: weapons.length, date: d };
        }
        await this.upsertModel(dateStr, weapons);
        return { message: 'Ingested', count: weapons.length, date: dateStr };
    }

    // Minimal daily update: ingest from default Reddit JSON URL
    async runDailyUpdate() {
        const defaultUrl = 'https://www.reddit.com/r/kickopenthedoor/comments/167tvm4/weapon_shop_trading_tavern/.json';
        return this.ingestFromReddit(defaultUrl);
    }

    // Import from old export format into new model
    async importFromOldExport(exportJson) {
        const snapshots = exportJson?.data?.snapshots || [];
        let total = 0;
        for (const s of snapshots) {
            const dateStr = s.snapshot_date;
            const weapons = Array.isArray(s.weapons) ? s.weapons : [];
            // eslint-disable-next-line no-await-in-loop
            await this.upsertModel(dateStr, weapons);
            total += weapons.length;
        }
        return { message: 'Imported', snapshots: snapshots.length, items: total };
    }
}

module.exports = { DataProcessor };