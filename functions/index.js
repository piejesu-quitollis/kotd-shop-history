const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
let allowedOrigin;

if (projectId) {
  allowedOrigin = `https://${projectId}.web.app`;
} else {
  allowedOrigin = 'https://kotd-shop-history.web.app';
  console.warn('REACT_APP_FIREBASE_PROJECT_ID environment variable not set. CORS origin defaulting to placeholder. Please configure this for production.');
}

const cors = require('cors')({origin: allowedOrigin});
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
 * Get weapons by date
 */
exports.getWeaponsByDate = onRequest(async (req, res) => {
    cors(req, res, async () => {
        const { date } = req.body.data || {};
        if (!date) {
            res.status(400).json({ error: 'Missing "date" parameter' });
            return;
        }

        try {
            const snapshotRef = db.collection("weaponSnapshots").doc(date);
            const snapshot = await snapshotRef.get();

            if (!snapshot.exists) {
                res.status(404).json({ error: "No data found for that date" });
                return;
            }

            const weaponsRef = snapshotRef.collection("weapons");
            const querySnapshot = await weaponsRef.get();
            res.json({ data: querySnapshot.docs.map((doc) => doc.data()) });
        } catch (error) {
            console.error("Error fetching weapons:", error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Get all snapshot dates
 */
exports.getAllDates = onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const querySnapshot = await db
                .collection("weaponSnapshots")
                .orderBy("snapshot_time", "desc")
                .get();

            const dates = querySnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    snapshot_date: data.snapshot_date,
                    snapshot_time: data.snapshot_time,
                    capture_time: data.snapshot_time.substring(11, 16),
                };
            });

            console.log('getAllDates returning:', dates.length, 'dates');
            res.json({ data: dates });
        } catch (error) {
            console.error("Error fetching dates:", error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Manually trigger an update
 */
exports.manualUpdate = onCall(async () => {
    try {
        await processor.runDailyUpdate();
        console.log("Manual update triggered successfully.");
        return { success: true };
    } catch (error) {
        console.error("Manual update failed:", error);
        throw new Error(error.message);
    }
});
