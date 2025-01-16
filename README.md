# KOTD Weapon History Tracker

Web application that tracks weapon prices and statistics from the Kick Open The Door (KOTD) game using Reddit data.

## Setup

### Backend (API)
```
cd api
npm install
```

Create `.env` file:
```
REDDIT_CLIENT_ID=<your_reddit_client_id>
REDDIT_CLIENT_SECRET=<your_reddit_client_secret>
REDDIT_USERNAME=<your_reddit_username>
REDDIT_PASSWORD=<your_reddit_password>
```

Start backend:
```
npm start
````

### Frontend
```
cd web
npm install
npm start
```

Visit `http://localhost:3000`

## API Endpoints

- `GET /api/weapons/:date`: Get weapon data by date (YYYY-MM-DD)
- `GET /api/dates`: List available dates
- `POST /api/update`: Trigger manual data update

## Updates
- Automatic updates run daily at midnight
- Manual updates available through API endpoint
- Initial update runs on server start

Note: Reddit API keys required for data fetching.
