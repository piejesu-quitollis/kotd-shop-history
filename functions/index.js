const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase-admin/app');
const { DataProcessor } = require('./data-processor');

setGlobalOptions({
    maxInstances: 10,
    region: 'europe-west1'
});

initializeApp();
const db = getFirestore();

const processor = new DataProcessor(db);

// Existing scheduled update
exports.scheduledUpdate = onSchedule({
    schedule: '0 0 * * *',
    region: 'europe-west1',
    timeoutSeconds: 540,
    retry: true
}, async (event) => {
   await processor.runDailyUpdate();
});

// Get weapons by date
exports.getWeaponsByDate = onRequest(async (request, response) => {
   const { date } = request.query;
   if (!date) {
       return response.status(400).json({ error: 'Missing "date" query parameter' });
   }

   try {
       const snapshotRef = db.collection('weaponSnapshots').doc(date);
       const snapshot = await snapshotRef.get();

       if (!snapshot.exists) {
           return response.status(404).json({ error: 'No data found for that date' });
       }

       const weaponsRef = snapshotRef.collection('weapons');
       const querySnapshot = await weaponsRef.get();
       
       response.json(querySnapshot.docs.map(doc => doc.data()));
   } catch (error) {
       response.status(500).json({ error: error.message });
   }
});

// Get all snapshot dates
exports.getAllDates = onRequest(async (request, response) => {
   try {
       const querySnapshot = await db.collection("weaponSnapshots")
           .orderBy("snapshot_date", "desc")
           .orderBy("snapshot_time", "desc")
           .get();
       
       const dates = querySnapshot.docs.map(doc => {
           const data = doc.data();
           return {
               snapshot_date: data.snapshot_date,
               snapshot_time: data.snapshot_time,
               capture_time: data.snapshot_time.substring(11,16),
           };
       });
       
       response.json(dates);
   } catch(error) {
       response.status(500).json({ error: error.message });
   }
});

// Manual trigger endpoint
exports.manualUpdate = onRequest(async (request, response) => {
    try {
        await processor.runDailyUpdate();
        response.json({ success: true });
    } catch (error) {
        response.status(500).json({ error: error.message });
    }
});