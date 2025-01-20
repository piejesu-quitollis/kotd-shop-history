// app/functions/src/index.js
import * as functions from 'firebase-functions';
import WeaponDataFetcher from './fetcher';
import { db } from './db'
import cors from 'cors';

const weaponFetcher = new WeaponDataFetcher();
// Automatically trigger daily updates function
export const dailyUpdate = functions
  .runWith({ secrets: ['REDDIT_CLIENT_ID','REDDIT_CLIENT_SECRET', 'REDDIT_USERNAME', 'REDDIT_PASSWORD', 'REDDIT_KOTD_SHOP_ID' ] })
  .pubsub
  .schedule('0 0 * * *') // Runs daily at midnight
  .timeZone('UTC')
  .onRun(async (context) => {
      try {
          await weaponFetcher.runDailyUpdate();
      } catch (error) {
        console.error("Error in daily update: ", error)
        throw error;
      }
    console.log('Daily update function finished');
  });
  
// Manual update endpoint
export const triggerUpdate = functions
  .runWith({ secrets: ['REDDIT_CLIENT_ID','REDDIT_CLIENT_SECRET', 'REDDIT_USERNAME', 'REDDIT_PASSWORD', 'REDDIT_KOTD_SHOP_ID' ] })
  .https.onRequest(async (req, res) => {
      cors(req, res, async () => {
          try {
            await weaponFetcher.runDailyUpdate();
            res.status(200).send({ message: 'Data update triggered successfully' });
          } catch (error) {
            console.error("Error triggering update:", error);
            res.status(500).send({ error: error.message });
          }
      });
  });

// GET request to retrieve weapons for a specific date
export const getWeaponsByDate = functions.https.onRequest(async(req,res) => {
  cors(req, res, async () => {
    const { date } = req.query;
      if (!date) {
            res.status(400).send({ error: 'Missing "date" query parameter' });
            return;
      }

        try {
        const snapshotRef = db.collection('weaponSnapshots').doc(date);
          const snapshot = await snapshotRef.get();

            if (!snapshot.exists) {
                res.status(404).send({ error: 'No data found for that date' });
                return;
            }
          const weaponsRef = snapshotRef.collection('weapons');
          const querySnapshot = await weaponsRef.get();

            const weapons = querySnapshot.docs.map(doc => doc.data());
            res.status(200).send(weapons);
      } catch (err) {
          res.status(500).send({ error: err.message });
      }
    });
});

// GET request to retrieve all available dates
export const getAvailableDates = functions.https.onRequest(async (req,res) => {
    cors(req,res, async () => {
        try{
            const weaponSnapshotsRef = db.collection("weaponSnapshots")
             const querySnapshot = await weaponSnapshotsRef.orderBy("snapshot_date","desc").orderBy("snapshot_time", "desc").get()
            const dates = querySnapshot.docs.map((doc) => {
              const data = doc.data();
               return {
                  snapshot_date: data.snapshot_date,
                  snapshot_time: data.snapshot_time,
                  capture_time: data.snapshot_time.substring(11,16),
                  }
            });
            res.status(200).send(dates);
        }
        catch(e){
          res.status(500).send({error: e.message});
        }
    });
});