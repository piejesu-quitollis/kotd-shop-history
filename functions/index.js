const { setGlobalOptions } = require("firebase-functions/v2");
const { onCall } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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
exports.getWeaponsByDate = onCall(async (request) => {
    const { date } = request.data;
    if (!date) {
        throw new Error('Missing "date" parameter');
    }

    try {
        const snapshotRef = db.collection("weaponSnapshots").doc(date);
        const snapshot = await snapshotRef.get();

        if (!snapshot.exists) {
            throw new Error("No data found for that date");
        }

        const weaponsRef = snapshotRef.collection("weapons");
        const querySnapshot = await weaponsRef.get();
        return querySnapshot.docs.map((doc) => doc.data());
    } catch (error) {
        console.error("Error fetching weapons:", error);
        throw new Error(error.message);
    }
});

/**
 * Get all snapshot dates
 */
exports.getAllDates = onCall(async () => {
    try {
        const querySnapshot = await db
            .collection("weaponSnapshots")
            .orderBy("snapshot_date", "desc")
            .orderBy("snapshot_time", "desc")
            .get();

        return querySnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                snapshot_date: data.snapshot_date,
                snapshot_time: data.snapshot_time,
                capture_time: data.snapshot_time.substring(11, 16),
            };
        });
    } catch (error) {
        console.error("Error fetching dates:", error);
        throw new Error(error.message);
    }
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
