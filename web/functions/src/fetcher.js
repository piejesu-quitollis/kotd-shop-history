import Snoowrap from 'snoowrap';
import { db } from './db.js'; // Import db initialization


class WeaponDataFetcher {
    constructor() {
        this.reddit = new Snoowrap({
            userAgent: 'WeaponDataFetcherBot',
            clientId: process.env.REDDIT_CLIENT_ID,
            clientSecret: process.env.REDDIT_CLIENT_SECRET,
            username: process.env.REDDIT_USERNAME,
            password: process.env.REDDIT_PASSWORD,
        });

        this.postId = process.env.REDDIT_KOTD_SHOP_ID;
    }

    async fetchWeaponsData() {
        try {
            const post = await this.reddit.getSubmission(this.postId);
            const rawText = await post.selftext;

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
              }).filter(Boolean);
        
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

        try{
          const snapshotRef = db.collection('weaponSnapshots').doc(date);
          const doc = await snapshotRef.get();
          if(doc.exists){
            console.log('Data for the date already exists. Skipping save operation.');
          } else {
            await snapshotRef.set({
              snapshot_date: date,
              snapshot_time: timestamp,
              created_at: new Date(),
            })
    
            const weaponsBatch = db.batch();
            weapons.forEach((weapon) => {
              const weaponRef = snapshotRef.collection('weapons').doc(String(weapon.id));
              weaponsBatch.set(weaponRef, weapon);
            })
            await weaponsBatch.commit()
    
          console.log('Data saved successfully');
          return { message: 'Data saved successfully' };
        }
      } catch (error) {
        console.error('Error saving to database', error);
        throw error;
      }
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