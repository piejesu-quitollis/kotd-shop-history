const Snoowrap = require('snoowrap');
const { parseWeaponsData, WeaponDataError } = require('./data-parser.js');
const { defineString } = require('firebase-functions/params');

const clientId = defineString('REDDIT_CLIENT_ID');
const clientSecret = defineString('REDDIT_CLIENT_SECRET');
const username = defineString('REDDIT_USERNAME');
const password = defineString('REDDIT_PASSWORD');
const postId = defineString('REDDIT_POST_ID');

class DataProcessor {
    #reddit = null;
    #postId = null;
    #db = null;

    constructor(db) {
      this.#db = db;
    }

    initializeReddit() {
        if (this.#reddit) return;

        console.log('Environment variables check:', {
            clientId: clientId.value(),
            clientSecret: clientSecret.value(),
            username: username.value(),
            password: password.value(),
            postId: postId.value()
        });

        this.#reddit = new Snoowrap({
            userAgent: 'WeaponDataFetcherBot',
            clientId: clientId.value(),
            clientSecret: clientSecret.value(),
            username: username.value(),
            password: password.value()
        });
        this.#postId = postId.value();
    }

    async fetchWeaponsData() {
        try {
            this.initializeReddit();
            const post = await this.#reddit.getSubmission(this.#postId);
            const rawText = await post.selftext;

            if (!rawText?.trim()) throw new WeaponDataError('Invalid raw text', 'FETCH_ERROR');
            return parseWeaponsData(rawText);
        } catch (error) {
            console.error('Error fetching weapon data:', error.message);
            throw error;
        }
    }

    async saveToDatabase(weapons, lastUpdateDate) {
        const date = lastUpdateDate.toISOString().split('T')[0];
        
        return this.#db.runTransaction(async transaction => {
            const snapshotRef = this.#db.collection('weaponSnapshots').doc(date);
            const doc = await transaction.get(snapshotRef);
            
            if (doc.exists) return { message: 'Data already exists' };
            
            transaction.set(snapshotRef, {
                snapshot_date: date,
                snapshot_time: lastUpdateDate.toISOString(),
                created_at: new Date()
            });
            
            weapons.forEach(weapon => {
                const weaponRef = snapshotRef.collection('weapons').doc(String(weapon.id));
                transaction.set(weaponRef, weapon);
            });
            
            return { message: 'Data saved successfully' };
        });
    }

    async runDailyUpdate() {
        try {
            const { weapons, lastUpdateDate } = await this.fetchWeaponsData();
            await this.saveToDatabase(weapons, lastUpdateDate);
            console.log('Daily update completed successfully:', new Date().toISOString());
        } catch (error) {
            console.error('Error in daily update:', error);
        }
    }
}

module.exports = { DataProcessor };