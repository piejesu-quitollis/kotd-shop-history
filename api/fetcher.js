import Snoowrap from 'snoowrap';

class WeaponDataFetcher {
    constructor(dbConnection) {
        this.db = dbConnection;

        // Initialize Snoowrap with Reddit API credentials
        this.reddit = new Snoowrap({
            userAgent: 'WeaponDataFetcherBot',
            clientId: process.env.REDDIT_CLIENT_ID,
            clientSecret: process.env.REDDIT_CLIENT_SECRET,
            username: process.env.REDDIT_USERNAME,
            password: process.env.REDDIT_PASSWORD,
        });

        this.postId = '167tvm4'; // Replace with the constant Reddit post ID
    }

    async fetchWeaponsData() {
        try {
            const post = await this.reddit.getSubmission(this.postId);
            const rawText = await post.selftext; // Fetch Markdown content
    
            if (typeof rawText !== 'string' || !rawText.trim()) {
                throw new Error(`Invalid raw text fetched: ${rawText}`);
            }
    
            return this.parseWeaponData(rawText);
        } catch (error) {
            console.error('Error fetching weapon data:', error.message);
            throw error;
        }
    }

    parseWeaponData(rawText) {
        try {
            const dateMatch = rawText.match(/Last Updated: (.*?) UTC/);
            if (!dateMatch) {
                throw new Error('Could not find update date in the provided text.');
            }
    
            const rawDateTime = dateMatch[1];
            const cleanDateTime = rawDateTime.replace(' - ', ' ').trim();
            this.lastUpdateDate = new Date(`${cleanDateTime} UTC`);
    
            if (isNaN(this.lastUpdateDate.getTime())) {
                console.error('Invalid date string:', cleanDateTime);
                throw new Error('Failed to parse the update date and time.');
            }
    
            console.log('Parsed update datetime:', this.lastUpdateDate.toISOString());
    
            // Extract the weapons section
            const weaponsMatch = rawText.match(
                /#Items:\n[\s\S]*?\|Price\|ID\|Type\|Name\|Damage\|Durability\|Element\|Req Lv\.\|([\s\S]*?)\n# Canteen:/
            );
            if (!weaponsMatch) {
                throw new Error('Could not find weapons section in the provided text.');
            }
    
            const weaponsData = weaponsMatch[1].trim().split('\n');
            const weapons = weaponsData.map((line, index) => {    
                // Skip non-data rows
                if (line.includes(':-:')) return null;
    
                const cleanLine = line.replace(/^\||\|$/g, '');
                const fields = cleanLine.split('|').map((item) => item.trim());
    
                if (fields.length !== 8) {
                    console.warn(`Invalid weapon line skipped (line ${index + 1}):`, line);
                    return null;
                }
    
                const [price, id, type, name, damage, durability, element, reqLevel] = fields;
    
                return {
                    id: parseInt(id, 10),
                    price,
                    type,
                    name,
                    damage,
                    durability,
                    element,
                    reqLevel: parseInt(reqLevel, 10),
                };
            }).filter(Boolean); // Remove null entries
    
            if (weapons.length === 0) {
                throw new Error('No valid weapons found in the weapons section.');
            }
    
            console.log(`Parsed ${weapons.length} weapons from the data.`);
            return weapons;
        } catch (error) {
            console.error('Error parsing weapon data:', error.message);
            throw error;
        }
    }
    
    async saveToDatabase(weapons) {
        const date = this.lastUpdateDate.toISOString().split('T')[0];
        const timestamp = this.lastUpdateDate.toISOString();
        const db = this.db;
    
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.get(
                    `SELECT id FROM WeaponSnapshots WHERE DATE(snapshot_date) = ?`,
                    [date],
                    (err, row) => {
                        if (err) {
                            console.error('Error checking for existing snapshot:', err.message);
                            reject(err);
                            return;
                        }
    
                        if (row) {
                            console.log('Data for the date already exists. Skipping save operation.');
                            resolve({ message: 'Data for this date already exists. No save performed.' });
                            return;
                        }
    
                        db.run('BEGIN TRANSACTION');
    
                        db.run(
                            `INSERT INTO WeaponSnapshots (snapshot_date, snapshot_time) VALUES (?, ?)`,
                            [date, timestamp],
                            function (err) {
                                if (err) {
                                    console.error('Error inserting snapshot:', err.message);
                                    db.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }
    
                                const snapshotId = this.lastID;
                                const stmt = db.prepare(`
                                    INSERT INTO Weapons (
                                        id, snapshot_id, price, type, name, 
                                        damage, durability, element, req_level
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                `);
    
                                weapons.forEach((weapon) => {
                                    stmt.run([
                                        weapon.id,
                                        snapshotId,
                                        weapon.price,
                                        weapon.type,
                                        weapon.name,
                                        weapon.damage,
                                        weapon.durability,
                                        weapon.element,
                                        weapon.reqLevel,
                                    ]);
                                });
    
                                stmt.finalize();
                                db.run('COMMIT', (err) => {
                                    if (err) {
                                        console.error('Error committing transaction:', err.message);
                                        reject(err);
                                        return;
                                    }
                                    console.log('Data saved successfully.');
                                    resolve({ message: 'Data saved successfully.' });
                                });
                            }
                        );
                    }
                );
            });
        });
    }
        

    async runDailyUpdate() {
        try {
            const weapons = await this.fetchWeaponsData();
            await this.saveToDatabase(weapons);
            console.log('Daily update completed successfully:', new Date().toISOString());
        } catch (error) {
            console.error('Error in daily update:', error);
        }
    }
}

export default WeaponDataFetcher;