import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import dotenv from 'dotenv';
import WeaponDataFetcher from './fetcher.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create SQLite database connection
const db = new sqlite3.Database('./weapons.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
        initializeDataFetcher();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Enable foreign key enforcement before creating tables
        db.run('PRAGMA foreign_keys = ON');

        // Create WeaponSnapshots table
        db.run(`
            CREATE TABLE IF NOT EXISTS WeaponSnapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                snapshot_date DATE NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Weapons table with foreign key and uniqueness constraints
        db.run(`
            CREATE TABLE IF NOT EXISTS Weapons (
                id INTEGER NOT NULL,
                snapshot_id INTEGER NOT NULL,
                price TEXT NOT NULL,
                type TEXT NOT NULL,
                name TEXT NOT NULL,
                damage TEXT NOT NULL,
                durability TEXT NOT NULL,
                element TEXT NOT NULL,
                req_level INTEGER NOT NULL,
                FOREIGN KEY (snapshot_id) REFERENCES WeaponSnapshots(id),
                UNIQUE (id, snapshot_id)
            )
        `);
    });
}

function initializeDataFetcher() {
    const weaponFetcher = new WeaponDataFetcher(db);

    // Run initial fetch
    weaponFetcher.runDailyUpdate();

    // Schedule daily updates at midnight
    const scheduleNextUpdate = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const timeUntilNextUpdate = tomorrow - now;
        setTimeout(() => {
            weaponFetcher.runDailyUpdate();
            // Schedule next update
            scheduleNextUpdate();
        }, timeUntilNextUpdate);
    };

    // Start the scheduling
    scheduleNextUpdate();

    const now = new Date();
    const lastUpdate = new Date();
    lastUpdate.setHours(0, 0, 0, 0);
    const hasUpdatedToday = false;
    if (now > lastUpdate && !hasUpdatedToday) {
        weaponFetcher.runDailyUpdate();
    }
}


// API Endpoints

// GET request to retrieve weapons for a specific date
app.get('/api/weapons/:date', (req, res) => {
    console.log(`GET /api/weapons/${req.params.date}`);
  const date = req.params.date;
  db.all(
    `
        SELECT w.* 
        FROM Weapons w
        JOIN WeaponSnapshots ws ON w.snapshot_id = ws.id
        WHERE ws.snapshot_date = ?
        ORDER BY w.id
    `,
    [date],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
          console.log(`ERROR GET /api/weapons/${req.params.date}: `, err.message);
        return;
      }
      res.json(rows);
    }
  );
});

// GET request to retrieve all available dates
app.get('/api/dates', (req, res) => {
   console.log('GET /api/dates');
  db.all(
    `
        SELECT snapshot_date 
        FROM WeaponSnapshots 
        ORDER BY snapshot_date DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        console.log('ERROR GET /api/dates: ', err.message);
        return;
      }
        res.json(rows);
    }
  );
});

// POST request to save new weapons data
app.post('/api/weapons', async (req, res) => {
    console.log('POST /api/weapons: ', req.body);
  const { date, weapons } = req.body;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
        `
        INSERT OR IGNORE INTO WeaponSnapshots (snapshot_date)
        VALUES (?)
        `, [date], function(err) {
          if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                console.log('ERROR POST /api/weapons: ', err.message);
                return;
            }

        db.get(
            `
                SELECT id FROM WeaponSnapshots WHERE snapshot_date = ?
             `,
            [date],
             (err, row) => {
             if (err) {
                 db.run('ROLLBACK');
                 res.status(500).json({ error: err.message });
                console.log('ERROR POST /api/weapons: ', err.message);
                return;
                }
                const snapshotId = row.id;
                const stmt = db.prepare(`
                    INSERT INTO Weapons (
                        id, snapshot_id, price, type, name, 
                        damage, durability, element, req_level
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                weapons.forEach(weapon => {
                    stmt.run([
                        weapon.id,
                        snapshotId,
                        weapon.price,
                        weapon.type,
                        weapon.name,
                        weapon.damage,
                        weapon.durability,
                        weapon.element,
                        weapon.reqLevel
                    ]);
                });

                stmt.finalize();
                db.run('COMMIT');
                 console.log('Response POST /api/weapons:  Data saved successfully')
                res.json({ message: 'Data saved successfully' });
            });
        });
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// POST request to manually trigger an update for the weapons data
app.post('/api/update', async (req, res) => {
    console.log('POST /api/update');
  try {
    const weaponFetcher = new WeaponDataFetcher(db);
      console.log('Updating Weapon data');
    await weaponFetcher.runDailyUpdate();
     console.log('Response POST /api/update: Update triggered successfully')
    res.json({ message: 'Update triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
    console.log('ERROR POST /api/update: ', error.message);
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Closed the database connection.');
    process.exit(0);
  });
});