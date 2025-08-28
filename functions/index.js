const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");


let projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
if (!projectId) {
  try {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
    if (firebaseConfig.projectId) {
      projectId = firebaseConfig.projectId;
    }
  } catch (_) {
    // ignore parse errors, fall back to default below
  }
}

const allowedOrigins = [
  projectId ? `https://${projectId}.web.app` : 'https://kotd-shop-history.web.app',
  projectId ? `https://${projectId}.firebaseapp.com` : 'https://kotd-shop-history.firebaseapp.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const cors = require('cors')({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow non-browser tools
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
    optionsSuccessStatus: 204,
});

const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const { DataProcessor } = require("./data-processor");

setGlobalOptions({
    maxInstances: 10,
    region: "europe-west1",
});

initializeApp();
const db = getFirestore();
const processor = new DataProcessor(db);

/**
 * Scheduled daily update function
 */
exports.scheduledUpdate = onSchedule(
    {
        schedule: "0 0 * * *",
        region: "europe-west1",
        timeoutSeconds: 540,
        retry: true,
    },
    async (event) => {
        try {
            await processor.runDailyUpdate();
            console.log("Daily update completed successfully.");
        } catch (error) {
            console.error("Scheduled update failed:", error);
        }
    }
);

/**
 * Get weapons by date (new model). Returns daily entries, optionally joined with static weapon info.
 * Params: date (required), includeStatic?: boolean
 */
exports.getWeaponsByDate = onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            let date, includeStatic = false;
            if (req.method === 'GET') {
                date = req.query && req.query.date;
                includeStatic = (req.query && String(req.query.includeStatic).toLowerCase() === 'true');
            } else {
                const body = req.body || {};
                const wrap = body.data || body;
                date = wrap.date;
                includeStatic = !!wrap.includeStatic;
            }
            if (!date) { res.status(400).json({ error: 'Missing "date" parameter' }); return; }

            const dailySnap = await db.collection('dailyPrices').where('date', '==', date).get();
            const items = dailySnap.docs.map(d => d.data());

            if (!includeStatic || items.length === 0) {
                res.json({ data: items });
                return;
            }
            const ids = Array.from(new Set(items.map(i => String(i.weaponId)))).filter(Boolean);
            const chunks = [];
            for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
            const weaponMap = {};
            for (const chunk of chunks) {
                const wSnap = await db.collection('weapons').where('__name__', 'in', chunk).get();
                wSnap.forEach(doc => { weaponMap[doc.id] = doc.data(); });
            }
            const merged = items.map(i => ({ ...i, weapon: weaponMap[i.weaponId] || null }));
            res.json({ data: merged });
        } catch (error) {
            console.error('Error fetching weapons by date:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// Removed getAllDates (legacy snapshots)

/**
 * Backfill per-weapon P/D series from existing snapshots.
 * Body: { startDate?: 'yyyy-MM-dd', endDate?: 'yyyy-MM-dd' }
 */
// Removed backfillWeaponSeries (series deprecated)

/**
 * Get P/D series for a weapon (optionally between startDate and endDate inclusive)
 * Body: { weaponId: number, startDate?: 'yyyy-MM-dd', endDate?: 'yyyy-MM-dd' }
 */
// Removed getWeaponSeries (series deprecated)

/**
 * Export all weapon data as a single JSON payload.
 * Params (GET query or POST body.data):
 * - startDate?: 'yyyy-MM-dd'
 * - endDate?: 'yyyy-MM-dd'
 * - includeSeries?: boolean (default false)
 */
exports.exportAllData = onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            // Parse params
            let startDate, endDate, includeSeries = false;
            if (req.method === 'GET') {
                startDate = req.query ? req.query.startDate : undefined;
                endDate = req.query ? req.query.endDate : undefined;
                includeSeries = (req.query && String(req.query.includeSeries).toLowerCase() === 'true');
            } else {
                const body = req.body || {};
                const wrap = body.data || body;
                startDate = wrap.startDate;
                endDate = wrap.endDate;
                includeSeries = !!wrap.includeSeries;
            }

            console.log('exportAllData request', { method: req.method, startDate, endDate, includeSeries });

            // Build snapshots query
            let q = db.collection('weaponSnapshots').orderBy('snapshot_date');
            if (startDate) q = q.startAt(startDate);
            if (endDate) q = q.endAt(endDate);

            const snap = await q.get();
            const snapshots = [];
            let totalWeapons = 0;

            // For each snapshot, fetch its weapons subcollection
            for (const doc of snap.docs) {
                const data = doc.data() || {};
                const date = data.snapshot_date;
                const time = data.snapshot_time;
                // eslint-disable-next-line no-await-in-loop
                const weaponsSnap = await doc.ref.collection('weapons').get();
                const weapons = weaponsSnap.docs.map(d => d.data());
                totalWeapons += weapons.length;
                snapshots.push({ snapshot_date: date, snapshot_time: time, weapons });
            }

            const result = {
                meta: {
                    exportedAt: new Date().toISOString(),
                    startDate: startDate || null,
                    endDate: endDate || null,
                    snapshotCount: snapshots.length,
                    weaponCount: totalWeapons,
                    includeSeries,
                },
                snapshots,
            };

            if (includeSeries) {
                const seriesCol = await db.collection('weaponSeries').get();
                // Return series as an array to keep payload predictable
                result.series = seriesCol.docs.map(d => {
                    const s = d.data() || {};
                    return { weaponId: s.weaponId || Number(d.id), series: s.series || {} };
                });
            }

            res.set('Content-Type', 'application/json');
            res.status(200).json({ data: result });
        } catch (error) {
            console.error('Error exporting all data:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Ingest current data from Reddit JSON into new model (weapons + dailyPrices).
 * Params: url?: string (defaults to official KOTD post JSON)
 */
exports.ingestReddit = onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            let url;
            if (req.method === 'GET') {
                url = req.query && req.query.url;
            } else {
                const body = req.body || {};
                const wrap = body.data || body;
                url = wrap.url;
            }
            const defaultUrl = 'https://www.reddit.com/r/kickopenthedoor/comments/167tvm4/weapon_shop_trading_tavern/.json';
            const target = url || defaultUrl;
            const out = await processor.ingestFromReddit(target);
            res.json({ data: out });
        } catch (error) {
            console.error('Error ingesting from Reddit:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Import from old export JSON into new model.
 * Body: { export: <json> } or raw export JSON as body
 */
// Removed importFromOldExport (legacy migration)

/**
 * Get daily entries by date from new model.
 * Params: date (required), includeStatic?: boolean
 */
// Removed getDailyByDate (merged into getWeaponsByDate)

/**
 * Get full history for a weapon from new model.
 * Params: weaponId (required), startDate?, endDate?, includeStatic?: boolean
 */
exports.getHistoryByWeapon = onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            let weaponId, startDate, endDate, includeStatic = false;
            if (req.method === 'GET') {
                weaponId = req.query && req.query.weaponId;
                startDate = req.query && req.query.startDate;
                endDate = req.query && req.query.endDate;
                includeStatic = (req.query && String(req.query.includeStatic).toLowerCase() === 'true');
            } else {
                const body = req.body || {};
                const wrap = body.data || body;
                weaponId = wrap.weaponId;
                startDate = wrap.startDate;
                endDate = wrap.endDate;
                includeStatic = !!wrap.includeStatic;
            }
            if (!weaponId) { res.status(400).json({ error: 'Missing "weaponId" parameter' }); return; }

            let q = db.collection('dailyPrices').where('weaponId', '==', String(weaponId));
            if (startDate) q = q.where('date', '>=', startDate);
            if (endDate) q = q.where('date', '<=', endDate);
            const snap = await q.get();
            const rows = snap.docs.map(d => d.data()).sort((a,b) => a.date.localeCompare(b.date));

            if (!includeStatic) { res.json({ data: rows }); return; }
            const wdoc = await db.collection('weapons').doc(String(weaponId)).get();
            res.json({ data: { weapon: wdoc.exists ? wdoc.data() : null, history: rows } });
        } catch (error) {
            console.error('Error fetching history by weapon:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Export new model data (weapons + dailyPrices) as JSON. Optional filters by date range.
 * Params: startDate?, endDate?
 */
exports.exportData = onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            let startDate, endDate;
            if (req.method === 'GET') {
                startDate = req.query && req.query.startDate;
                endDate = req.query && req.query.endDate;
            } else {
                const body = req.body || {};
                const wrap = body.data || body;
                startDate = wrap.startDate;
                endDate = wrap.endDate;
            }

            // Weapons
            const weaponsSnap = await db.collection('weapons').get();
            const weapons = weaponsSnap.docs.map(d => d.data());

            // DailyPrices filtered by date
            let dpQuery = db.collection('dailyPrices');
            if (startDate) dpQuery = dpQuery.where('date', '>=', startDate);
            if (endDate) dpQuery = dpQuery.where('date', '<=', endDate);
            const dpSnap = await dpQuery.get();
            const daily = dpSnap.docs.map(d => d.data());

            res.json({ data: {
                meta: {
                    exportedAt: new Date().toISOString(),
                    startDate: startDate || null,
                    endDate: endDate || null,
                    weapons: weapons.length,
                    dailyCount: daily.length,
                },
                weapons,
                daily,
            }});
        } catch (error) {
            console.error('Error exporting data:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Get latest available day from new model and return all entries for that date.
 * Params: includeStatic?: boolean
 * Response: { date: 'yyyy-MM-dd', items: [...] }
 */
exports.getLatestDaily = onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            let includeStatic = false;
            if (req.method === 'GET') {
                includeStatic = (req.query && String(req.query.includeStatic).toLowerCase() === 'true');
            } else {
                const body = req.body || {};
                const wrap = body.data || body;
                includeStatic = !!wrap.includeStatic;
            }

            // Find latest date by ordering dailyPrices by date desc, 1 doc
            const latestDocSnap = await db.collection('dailyPrices').orderBy('date', 'desc').limit(1).get();
            if (latestDocSnap.empty) {
                res.json({ data: { date: null, items: [] } });
                return;
            }
            const latestDate = latestDocSnap.docs[0].data().date;

            const dailySnap = await db.collection('dailyPrices').where('date', '==', latestDate).get();
            const items = dailySnap.docs.map(d => d.data());

            if (!includeStatic || items.length === 0) {
                res.json({ data: { date: latestDate, items } });
                return;
            }

            const ids = Array.from(new Set(items.map(i => String(i.weaponId)))).filter(Boolean);
            const chunks = [];
            for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
            const weaponMap = {};
            // eslint-disable-next-line no-await-in-loop
            for (const chunk of chunks) {
                // eslint-disable-next-line no-await-in-loop
                const wSnap = await db.collection('weapons').where('__name__', 'in', chunk).get();
                wSnap.forEach(doc => { weaponMap[doc.id] = doc.data(); });
            }
            const merged = items.map(i => ({ ...i, weapon: weaponMap[i.weaponId] || null }));
            res.json({ data: { date: latestDate, items: merged } });
        } catch (error) {
            console.error('Error fetching latest daily:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Get the previous available date before the given date from dailyPrices.
 * Params: before (required)
 */
// Removed getPreviousDate (not needed)

/**
 * Migrate all old snapshot data to the new model (no params required).
 * Iterates weaponSnapshots and writes into weapons + dailyPrices.
 * Optional: startDate, endDate for partial migrations.
 */
// Removed migrateSnapshotsToNewModel (legacy migration)
