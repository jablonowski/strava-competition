/**
 * Strava Club Dashboard — Backend Proxy
 *
 * Handles token refresh, activity fetching, clustering, and leaderboard
 * aggregation. All credentials live in a single config block at the top.
 */

const express = require('express');
const cors    = require('cors');
const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Strava Credentials (loaded from .env) ───────────────────────────────
const STRAVA_CONFIG = {
  CLIENT_ID:     process.env.STRAVA_CLIENT_ID,
  CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  REFRESH_TOKEN: process.env.STRAVA_REFRESH_TOKEN,
  CLUB_ID:       process.env.STRAVA_CLUB_ID,
};

// ─── Activity Clusters ────────────────────────────────────────────────────
const ACTIVITY_CLUSTERS = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'activity-clusters.json'), 'utf8'));

// Build a flat reverse-lookup map: { "MountainBikeRide" → "Cycling", ... }
const SPORT_TYPE_LOOKUP = Object.entries(ACTIVITY_CLUSTERS).reduce(
  (acc, [cluster, types]) => {
    types.forEach(t => { acc[t] = cluster; });
    return acc;
  },
  {},
);

// ─── Monthly Winners File ───────────────────────────────────────────────────
const WINNERS_FILE = path.join(__dirname, 'data', 'monthly-winners.json');

function readWinners() {
  try {
    if (!fs.existsSync(WINNERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(WINNERS_FILE, 'utf8'));
  } catch { return []; }
}

function saveWinners(winners) {
  const dir = path.dirname(WINNERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(WINNERS_FILE, JSON.stringify(winners, null, 2));
}

// ─── State File (tracks last auto-closed month) ────────────────────────────
const STATE_FILE = path.join(__dirname, 'data', 'state.json');

function readState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return { lastAutoClosedMonth: null };
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch { return { lastAutoClosedMonth: null }; }
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Leaderboard Builder ────────────────────────────────────────────────────
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

// ─── Token Cache & Auto-Refresh ────────────────────────────────────────────
let tokenCache = { access_token: null, expires_at: 0 };

async function getValidAccessToken() {
  const now = Math.floor(Date.now() / 1000);

  // Reuse cached token if it's still valid for at least another 60 s
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
  console.log(`[token] Refreshed. Expires at ${new Date(data.expires_at * 1000).toISOString()}`);
  return tokenCache.access_token;
}

// ─── Helper: format seconds → "Xh Ym" string (for logging only) ───────────
function fmtTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── API Endpoint ─────────────────────────────────────────────────────────
app.get('/api/dashboard-data', async (req, res) => {
  try {
    const token = await getValidAccessToken();

    // Strava club activities endpoint — max 200 per page
    const { data: raw } = await axios.get(
      `https://www.strava.com/api/v3/clubs/${STRAVA_CONFIG.CLUB_ID}/activities`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params:  { per_page: 200 },
      },
    );

    // ── 1. Filter & normalise ─────────────────────────────────────────────
    const activities = [];
    for (const act of raw) {
      // sport_type is the modern field; fall back to type for legacy entries
      const sportType = act.sport_type || act.type;
      const cluster   = SPORT_TYPE_LOOKUP[sportType];
      if (!cluster) continue;                // whitelist: drop unknown types
      activities.push({ ...act, normalized_category: cluster });
    }

    // ── 2. Category counts ────────────────────────────────────────────────
    const categoryCounts = Object.fromEntries(
      Object.keys(ACTIVITY_CLUSTERS).map(k => [k, 0]),
    );
    for (const act of activities) {
      categoryCounts[act.normalized_category]++;
    }

    // ── 3. Build leaderboards (overall + per category, sorted by time) ──────
    const { overallLeaderboard, categoryLeaderboards } = buildLeaderboards(activities);

    console.log(
      `[dashboard] ${activities.length}/${raw.length} activities kept. ` +
      `Top athlete: ${overallLeaderboard[0]?.name} (${fmtTime(overallLeaderboard[0]?.totalMovingTime || 0)})`,
    );

    // ── 4. Auto-close previous month on first request of a new month ─────
    const now       = new Date();
    const prevDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey   = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const state     = readState();

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
      const winners = readWinners().filter(w => w.month !== prevKey);
      winners.push(entry);
      winners.sort((a, b) => b.month.localeCompare(a.month));
      saveWinners(winners);
      saveState({ lastAutoClosedMonth: prevKey });
      console.log(`[auto-close] Recorded winners for ${prevLabel}`);
    }

    // ── 5. Return payload ─────────────────────────────────────────────────
    res.json({
      categoryCounts,
      overallLeaderboard,
      categoryLeaderboards,
      monthlyWinners:   readWinners(),
      recentActivities: activities,
    });

  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error('[dashboard] Error:', detail);
    res.status(500).json({ error: 'Failed to fetch Strava data', detail });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`))
  .on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[error] Port ${PORT} is already in use.\nStop the existing process first:\n  pkill -f "node server.js"\n`);
    } else {
      console.error('[error]', err.message);
    }
    process.exit(1);
  });
