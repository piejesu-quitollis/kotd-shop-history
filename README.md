# KOTD Weapon History tracker

This website tracks the prices and other information about weapons sold in the Kick Open The Door (KOTD) game. It gathers data from a Reddit post, saves it to a database, and lets you see how weapon stats change over time.

## How It Works

1.  **Data is Fetched:** The website uses the Reddit API to check for new weapon data.
2.  **Data is Organized:** The data from the Reddit post is organized and saved into a database.
3.  **Viewable History:** You can browse through previous days to see how prices, damages, and other stats have changed.

## How to Get Started

### 1. Setup the Backend (API)

1.  Go to the `api` folder:

    ```bash
    cd api
    ```

2. Install necessary tools:

    ```bash
    npm install
    ```

3. Make a file named `.env` in the `api` folder:

    ```
    REDDIT_CLIENT_ID=<your_reddit_client_id>
    REDDIT_CLIENT_SECRET=<your_reddit_client_secret>
    REDDIT_USERNAME=<your_reddit_username>
    REDDIT_PASSWORD=<your_reddit_password>
    ```
    * Make sure to replace `<your_reddit_client_id>`, etc with your real Reddit API keys.

4. Start the backend:
    ```bash
    npm run dev
    ```
    or
    ```bash
    npm start
    ```

### 2. Setup the Website (Frontend)
1. Go to the `web` folder:
    ```bash
    cd web
    ```
2. Install necessary tools:
    ```bash
    npm install
    ```
3. Start the website:

    ```bash
    npm start
    ```

Now the website should be up and running at `http://localhost:3000`

## API Info
Once the backend is running you will be able to use the api. You can get specific information by calling these endpoints:
* `GET /api/weapons/:date`: Get the weapon data from a specific date, you must use the YYYY-MM-DD format. example, `GET /api/weapons/2024-05-24`
* `GET /api/dates`: Get a list of the dates, from when the weapon database snapshots were taken
* `POST /api/update`: Manual endpoint to trigger an automatic data update

## Automatic Updates
The app will run an update daily at midnight to save the current weapons. It also runs the first time you start up the server so it can have the latest data for the weapons.

## Manual Updates
The application allows the admin to trigger a manual update of the weapon data.

## Extra Notes
*   You must get your Reddit API keys at the Reddit developers site for the data to properly fetch.
