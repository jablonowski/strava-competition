# Strava Club Dashboard

Corporate athletics competition tracker. Pulls live activity data from a Strava club, categorises it, and shows real-time leaderboards, category breakdowns, and a monthly hall of fame.

Live: **https://strava-competition.web.app** · Embed view: **https://strava-competition.web.app/current**

---

## Architecture

```
Browser
  │
  ├── Firebase Hosting  (static React/Vite SPA — frontend/dist/)
  │     └── /api/**  rewrite ──► Cloud Function (Gen 2 / Cloud Run)
  │                                    │
  │                                    ├── Strava API  (OAuth token + club activities)
  │                                    ├── Firestore   (monthly winners, auto-close state)
  │                                    └── Secret Manager  (credentials at runtime)
  │
  └── /current  (bare leaderboard page, embeddable via <iframe>)
```

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, single-page app |
| Backend | Node.js 22 Express app wrapped as a Firebase Gen 2 Cloud Function |
| Database | Cloud Firestore — `persistence/monthlyWinners`, `persistence/state` |
| Secrets | Google Cloud Secret Manager (injected as `process.env.*` at runtime) |
| CI/CD | GitLab CI → Firebase Hosting + Cloud Functions |

Activity sport types are mapped to clusters (Cycling, Running & Walking, Swimming, Gym & Fitness, Racket Sports) via `config/activity-clusters.json`. Unknown sport types are silently dropped. At the start of each month the backend auto-archives the previous month's #1 athletes to Firestore.

---

## Local development

### Prerequisites

- Node.js ≥ 18
- A [Strava API application](https://www.strava.com/settings/api) (free)
- OAuth refresh token for the club admin account (use the [Strava OAuth playground](https://developers.strava.com/playground/) to obtain one)

### Install & run

```bash
# 1. Install backend dependencies
npm install

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Copy and fill in credentials
cp .env.example .env
# edit .env with your four STRAVA_* values

# 4. Start the backend (port 4000)
npm start

# 5. In a second terminal, start the frontend (port 3000)
cd frontend && npm run dev
```

The Vite dev server proxies `/api/*` requests to `localhost:4000`, so no CORS config is needed.

`.env` variables:

| Variable | Description |
|---|---|
| `STRAVA_CLIENT_ID` | Strava app client ID |
| `STRAVA_CLIENT_SECRET` | Strava app client secret |
| `STRAVA_REFRESH_TOKEN` | OAuth refresh token (offline access) |
| `STRAVA_CLUB_ID` | Numeric ID of the Strava club |

---

## Deployment

The app deploys as a single Firebase project: static hosting for the frontend and a Cloud Function for the backend API.

### One-time Firebase setup (run locally)

```bash
npm install -g firebase-tools
firebase login
firebase use strava-competition          # or your project ID

# Create Firestore database
firebase firestore:databases:create "(default)" --location=europe-west1

# Store Strava credentials as secrets
echo "YOUR_VALUE" | firebase functions:secrets:set STRAVA_CLIENT_ID     --data-file=-
echo "YOUR_VALUE" | firebase functions:secrets:set STRAVA_CLIENT_SECRET  --data-file=-
echo "YOUR_VALUE" | firebase functions:secrets:set STRAVA_REFRESH_TOKEN  --data-file=-
echo "YOUR_VALUE" | firebase functions:secrets:set STRAVA_CLUB_ID        --data-file=-
```

> **First deploy only** — go to Cloud Run → service `api` → Security → enable **Allow unauthenticated invocations**, then save.

### Manual deploy

```bash
cd frontend && npm run build && cd ..
cd functions && npm install && cd ..
firebase deploy --only hosting,functions
```

### CI/CD (GitLab)

Push to `master` triggers the pipeline automatically. Set the following variables in **Settings → CI/CD → Variables**:

| Variable | How to obtain |
|---|---|
| `FIREBASE_TOKEN` | `firebase login:ci` |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `STRAVA_CLIENT_ID` | Strava app settings |
| `STRAVA_CLIENT_SECRET` | Strava app settings |
| `STRAVA_REFRESH_TOKEN` | Strava OAuth flow |
| `STRAVA_CLUB_ID` | URL of the Strava club page |

The pipeline builds the frontend, updates secrets in Secret Manager, then deploys hosting and functions in one `firebase deploy` call.

---

## Personal data

The app connects to the **Strava Club Activities** endpoint, which returns the public activity feed of club members. Only the following fields are used:

| Field | Purpose |
|---|---|
| `athlete.firstname`, `athlete.lastname` | Displayed in leaderboards and the recent feed |
| `sport_type` | Used to categorise the activity into a cluster |
| `moving_time`, `distance` | Used to compute leaderboard rankings |
| `name` | Displayed in the recent activity feed |

**What is stored persistently** (Firestore): only aggregated leaderboard snapshots taken at month-end — `name`, `totalMovingTime`, `totalDistance`, `activityCount` per athlete. No raw activity data is written to the database.

**What is not stored**: no email addresses, no GPS tracks, no heart-rate or power data, no profile photos.

Data is sourced exclusively via the official Strava API using a club admin's OAuth token. Access is limited to activities visible in the club feed — members who have restricted their activity privacy in Strava will not appear.
