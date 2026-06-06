/**
 * Strava Club Dashboard — Firebase Cloud Function (Express app)
 *
 * Identical logic to server.js but:
 *   - Credentials read from firebase functions:config (with process.env fallback)
 *   - Persistence via Firestore instead of local JSON files
 *   - No app.listen() — exported for functions/index.js
 */

const express   = require('express');
const cors      = require('cors');
const axios     = require('axios');
const path      = require('path');
const fs        = require('fs');
const { logger } = require('firebase-functions');
const admin     = require('firebase-admin');

// ─── Firebase Init ─────────────────────────────────────────────────────────
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ─── Strava Credentials ────────────────────────────────────────────────────
// Injected as environment variables by Firebase Secrets (declared in index.js)
const STRAVA_CONFIG = {
  CLIENT_ID:     process.env.STRAVA_CLIENT_ID,
  CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  REFRESH_TOKEN: process.env.STRAVA_REFRESH_TOKEN,
  CLUB_ID:       process.env.STRAVA_CLUB_ID,
};

// ─── Activity Clusters ─────────────────────────────────────────────────────
const ACTIVITY_CLUSTERS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'activity-clusters.json'), 'utf8'),
);

const SPORT_TYPE_LOOKUP = Object.entries(ACTIVITY_CLUSTERS).reduce(
  (acc, [cluster, types]) => { types.forEach(t => { acc[t] = cluster; }); return acc; },
  {},
);

// ─── Firestore Persistence ─────────────────────────────────────────────────
const PERSIST = db.collection('persistence');

async function readWinners() {
  const doc = await PERSIST.doc('monthlyWinners').get();
  return doc.exists ? doc.data().winners : [];
}

async function saveWinners(winners) {
  await PERSIST.doc('monthlyWinners').set({ winners });
}

async function readState() {
  const doc = await PERSIST.doc('state').get();
  return doc.exists ? doc.data() : { lastAutoClosedMonth: null };
}

async function saveState(state) {
  await PERSIST.doc('state').set(state);
}

// ─── Token Cache & Auto-Refresh ────────────────────────────────────────────
let tokenCache = { access_token: null, expires_at: 0 };

async function getValidAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.access_token && tokenCache.expires_at > now + 60) {
    return tokenCache.access_token;
  }
  const { data } = await axios.post('https://www.strava.com/oauth/token', {
    client_id:     STRAVA_CONFIG.CLIENT_ID,
    client_secret: STRAVA_CONFIG.CLIENT_SECRET,
    refresh_token: STRAVA_CONFIG.REFRESH_TOKEN,
    grant_type:    'refresh_token',
  });
  tokenCache = { access_token: data.access_token, expires_at: data.expires_at };
  logger.log(`[token] Refreshed. Expires at ${new Date(data.expires_at * 1000).toISOString()}`);
  return tokenCache.access_token;
}

// ─── Leaderboard Builder ───────────────────────────────────────────────────
function buildLeaderboards(activities) {
  const athleteMap = {};
  const categoryAthleteMap = Object.fromEntries(
    Object.keys(ACTIVITY_CLUSTERS).map(k => [k, {}]),
  );

  for (const act of activities) {
    const key     = `${act.athlete.firstname} ${act.athlete.lastname}`.trim();
    const cluster = act.normalized_category;

    if (!athleteMap[key]) {
      athleteMap[key] = { name: key, totalMovingTime: 0, totalDistance: 0, activityCount: 0 };
    }
    athleteMap[key].totalMovingTime += act.moving_time || 0;
    athleteMap[key].totalDistance   += act.distance    || 0;
    athleteMap[key].activityCount++;

    if (!categoryAthleteMap[cluster][key]) {
      categoryAthleteMap[cluster][key] = { name: key, totalMovingTime: 0, totalDistance: 0, activityCount: 0 };
    }
    categoryAthleteMap[cluster][key].totalMovingTime += act.moving_time || 0;
    categoryAthleteMap[cluster][key].totalDistance   += act.distance    || 0;
    categoryAthleteMap[cluster][key].activityCount++;
  }

  const overallLeaderboard = Object.values(athleteMap)
    .sort((a, b) => b.totalMovingTime - a.totalMovingTime);

  const categoryLeaderboards = {};
  for (const [cluster, map] of Object.entries(categoryAthleteMap)) {
    categoryLeaderboards[cluster] = Object.values(map)
      .sort((a, b) => b.totalMovingTime - a.totalMovingTime);
  }

  return { overallLeaderboard, categoryLeaderboards };
}

function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── API Endpoint ──────────────────────────────────────────────────────────
app.get('/api/dashboard-data', async (req, res) => {
  try {
    const token = await getValidAccessToken();

    const { data: raw } = await axios.get(
      `https://www.strava.com/api/v3/clubs/${STRAVA_CONFIG.CLUB_ID}/activities`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params:  { per_page: 200 },
      },
    );

    // 1. Filter & normalise
    const activities = [];
    for (const act of raw) {
      const sportType = act.sport_type || act.type;
      const cluster   = SPORT_TYPE_LOOKUP[sportType];
      if (!cluster) continue;
      activities.push({ ...act, normalized_category: cluster });
    }

    // 2. Category counts
    const categoryCounts = Object.fromEntries(
      Object.keys(ACTIVITY_CLUSTERS).map(k => [k, 0]),
    );
    for (const act of activities) {
      categoryCounts[act.normalized_category]++;
    }

    // 3. Leaderboards
    const { overallLeaderboard, categoryLeaderboards } = buildLeaderboards(activities);

    logger.log(
      `[dashboard] ${activities.length}/${raw.length} activities kept. ` +
      `Top athlete: ${overallLeaderboard[0]?.name} (${fmtTime(overallLeaderboard[0]?.totalMovingTime || 0)})`,
    );

    // 4. Auto-close previous month
    const now      = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey  = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const state    = await readState();

    if (state.lastAutoClosedMonth !== prevKey) {
      const prevLabel = prevDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const entry = {
        month:   prevKey,
        label:   prevLabel,
        overall: overallLeaderboard[0] || null,
      };
      for (const [cluster, lb] of Object.entries(categoryLeaderboards)) {
        entry[cluster] = lb[0] || null;
      }
      const winners = (await readWinners()).filter(w => w.month !== prevKey);
      winners.push(entry);
      winners.sort((a, b) => b.month.localeCompare(a.month));
      await saveWinners(winners);
      await saveState({ lastAutoClosedMonth: prevKey });
      logger.log(`[auto-close] Recorded winners for ${prevLabel}`);
    }

    // 5. Return payload
    res.json({
      categoryCounts,
      overallLeaderboard,
      categoryLeaderboards,
      monthlyWinners:   await readWinners(),
      recentActivities: activities,
    });

  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error('[dashboard] Error:', detail);
    res.status(500).json({ error: 'Failed to fetch Strava data', detail });
  }
});

module.exports = app;
